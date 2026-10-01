import datetime
import threading
from pathlib import Path
from typing import Dict, Any, Callable, Optional
import numpy as np
import soundfile as sf
from config.settings import config, AppConfig
from src.core.audio_engine import AudioEngine
from src.services.metadata_service import MetadataService, HornEventMetadata
from src.utils.logger import logger

def sanitize_name(val: str) -> str:
    return (val or "").strip().replace(" ", "_").replace("/", "-").replace("\\", "-")

class RecorderService:
    def __init__(self, audio_engine: AudioEngine, metadata_service: MetadataService, app_config: Optional[AppConfig] = None):
        self.audio_engine = audio_engine
        self.metadata_service = metadata_service
        self.config = app_config or config
        self.sample_rate = self.config.audio.sample_rate
        self.event_duration_sec = self.config.audio.total_event_duration
        self.event_samples = int(self.event_duration_sec * self.sample_rate)
        self.instance_counters: Dict[str, int] = {}

    def trigger_capture(self, class_info: Dict[str, Any], session_params: Dict[str, Any],
                        on_complete: Optional[Callable[[str], None]] = None) -> None:
        event_audio = self.audio_engine.get_latest_samples(self.event_samples)
        threading.Thread(target=self._export_worker, args=(event_audio, class_info, session_params, on_complete), daemon=True).start()

    def _export_worker(self, audio: np.ndarray, class_info: Dict[str, Any],
                       session_params: Dict[str, Any], on_complete: Optional[Callable[[str], None]]) -> None:
        try:
            sample_count = self.metadata_service.get_sample_count() + 1
            sample_id = f"BDHORN_{sample_count:04d}"
            now = datetime.datetime.now()
            time_str = now.strftime("%Y%m%d_%H%M%S")

            class_id = class_info["class_id"]
            class_name = sanitize_name(class_info["name"])
            location = sanitize_name(session_params.get("location", "Gabtoli"))
            distance = sanitize_name(session_params.get("distance", "5m"))
            side = sanitize_name(session_params.get("recording_side", session_params.get("side", "Front")))
            model = sanitize_name(session_params.get("vehicle_model", "Unknown"))
            plate = sanitize_name(session_params.get("license_plate", "Unknown"))

            inst_key = f"{class_name}_{model}_{plate}"
            instance_num = self.instance_counters.get(inst_key, 0) + 1
            self.instance_counters[inst_key] = instance_num
            instance_id = f"S{instance_num:02d}"

            # Standard Filename: [SampleID]_[InstanceID]_[VehicleClass]_[VehicleModel]_[LicensePlate]_[Distance]_[Side]_[Location]_[Timestamp].wav
            filename = f"{sample_id}_{instance_id}_{class_name}_{model}_{plate}_{distance}_{side}_{location}_{time_str}.wav"

            # 1. Dual-Layer File Organization:
            # Layer A: Dataset/Raw_By_Class/<VehicleClass>/
            raw_class_dir = self.config.paths.raw_by_class_dir / class_name
            raw_class_dir.mkdir(parents=True, exist_ok=True)
            raw_class_path = raw_class_dir / filename
            sf.write(str(raw_class_path), audio, self.sample_rate, subtype="PCM_24")

            # Layer B: Dataset/Instances_By_Vehicle/<VehicleClass>/<Model>_<Plate>/
            inst_folder = f"{model}_{plate}"
            inst_vehicle_dir = self.config.paths.instances_dir / class_name / inst_folder
            inst_vehicle_dir.mkdir(parents=True, exist_ok=True)
            inst_vehicle_path = inst_vehicle_dir / filename
            sf.write(str(inst_vehicle_path), audio, self.sample_rate, subtype="PCM_24")

            # Backward compatibility archive
            archive_path = self.config.paths.raw_recordings_dir / filename
            sf.write(str(archive_path), audio, self.sample_rate, subtype="PCM_24")

            file_hash = self.metadata_service.compute_sha256(raw_class_path)
            peak_db, rms_db, _ = self.audio_engine.dsp.calculate_levels(audio)
            estimated_spl = self.audio_engine.dsp.estimate_spl_dba(rms_db, audio_chunk=audio)

            meta = HornEventMetadata(
                sample_id=sample_id,
                instance_id=instance_id,
                filename=filename,
                audio_filename=filename,
                sha256_hash=file_hash,
                sample_rate_hz=self.sample_rate,
                bit_depth=24,
                channels=1,
                duration_sec=self.event_duration_sec,
                peak_dbfs=round(peak_db, 2),
                rms_dbfs=round(rms_db, 2),
                crest_factor_db=round(peak_db - rms_db, 2),
                measured_spl_dba=session_params.get("measured_spl", 90.0),
                estimated_spl_dba=round(estimated_spl, 1),
                calib_offset_c=self.config.audio.calib_offset_c,
                location=location,
                distance_m=distance,
                recording_side=side,
                angle_deg=session_params.get("angle_deg", 45),
                mic_height_m=session_params.get("mic_height_m", 1.5),
                elevation_type=session_params.get("elevation_type", "Ground_Level"),
                class_id=class_id,
                vehicle_class=class_name,
                vehicle_model=model,
                license_plate=plate,
                photo_filename="",
                legal_status=class_info.get("legal_status", "Legal_Standard"),
                horn_actuation_type=session_params.get("horn_type", "Standard"),
                vehicle_instance_id=f"{model}_{plate}",
                temperature_c=session_params.get("temperature_c", 30.0),
                relative_humidity_pct=session_params.get("humidity_pct", 70.0),
                weather_condition=session_params.get("weather", "Dry_Sunny"),
                timestamp_iso=now.isoformat(),
                ground_truth_method=session_params.get("ground_truth_method", "Synced_Video_Frame"),
                annotator_id=session_params.get("annotator_id", "RESEARCHER_1"),
                notes=session_params.get("notes", "")
            )
            self.metadata_service.append_record(meta)
            logger.info(f"Exported event to Dual-Layer: {filename}")
            if on_complete:
                on_complete(f"Saved: {filename} ({instance_id})")
        except Exception as e:
            logger.error(f"Export error: {e}", exc_info=True)
            if on_complete:
                on_complete(f"Error: {e}")
