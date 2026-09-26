"""
Event Recording and Disk Export Service
"""
import datetime
import threading
from pathlib import Path
from typing import Dict, Any, Callable, Optional
import numpy as np
import soundfile as sf

from config.settings import config
from src.core.audio_engine import AudioEngine
from src.services.metadata_service import MetadataService, HornEventMetadata
from src.utils.logger import logger

class RecorderService:
    """
    Coordinates extraction of pre/post-trigger audio windows from the ring buffer,
    writing standardized 24-bit PCM WAV files, and logging exhaustive metadata.
    """
    def __init__(self, audio_engine: AudioEngine, metadata_service: MetadataService):
        self.audio_engine = audio_engine
        self.metadata_service = metadata_service
        self.sample_rate = config.audio.sample_rate
        self.event_duration_sec = config.audio.total_event_duration
        self.event_samples = int(self.event_duration_sec * self.sample_rate)

    def trigger_capture(self, class_info: Dict[str, Any], session_params: Dict[str, Any],
                        on_complete: Optional[Callable[[str], None]] = None) -> None:
        """
        Triggers synchronous audio extraction from ring buffer, then
        launches background thread to write to disk and log metadata.
        """
        # 1. Instantaneous audio extraction from RAM (Microsecond latency)
        event_audio = self.audio_engine.get_latest_samples(self.event_samples)

        # 2. Asynchronous disk writer worker
        threading.Thread(
            target=self._export_worker,
            args=(event_audio, class_info, session_params, on_complete),
            daemon=True
        ).start()

    def _export_worker(self, audio: np.ndarray, class_info: Dict[str, Any],
                       session_params: Dict[str, Any],
                       on_complete: Optional[Callable[[str], None]]) -> None:
        """Background worker thread that writes WAV and metadata."""
        try:
            sample_count = self.metadata_service.get_sample_count() + 1
            sample_id = f"BDHORN_{sample_count:04d}"
            
            timestamp_now = datetime.datetime.now()
            timestamp_str = timestamp_now.strftime("%Y%m%d_%H%M%S")
            timestamp_iso = timestamp_now.isoformat()

            class_id = class_info["class_id"]
            class_name = class_info["name"]
            location = session_params.get("location", "Gabtoli").strip().replace(" ", "_")
            distance = session_params.get("distance", "5m")

            filename = f"BDHORN_{class_id}_{class_name.upper()}_{location}_{timestamp_str}_{sample_id}.wav"
            filepath = config.paths.raw_recordings_dir / filename

            # 1. Write uncompressed 24-bit PCM WAV
            sf.write(str(filepath), audio, self.sample_rate, subtype='PCM_24')

            # 2. Compute SHA-256 hash
            file_hash = self.metadata_service.compute_sha256(filepath)

            # 3. DSP calculations
            peak_db, rms_db, _ = self.audio_engine.dsp.calculate_levels(audio)
            crest_factor = peak_db - rms_db
            measured_spl = session_params.get("measured_spl", 90.0)
            estimated_spl = self.audio_engine.dsp.estimate_spl_dba(rms_db)

            # 4. Construct and validate metadata
            meta_record = HornEventMetadata(
                sample_id=sample_id,
                filename=filename,
                sha256_hash=file_hash,
                sample_rate_hz=self.sample_rate,
                bit_depth=24,
                channels=1,
                duration_sec=self.event_duration_sec,
                peak_dbfs=round(peak_db, 2),
                rms_dbfs=round(rms_db, 2),
                crest_factor_db=round(crest_factor, 2),
                measured_spl_dba=measured_spl,
                estimated_spl_dba=round(estimated_spl, 1),
                calib_offset_c=config.audio.calib_offset_c,
                location=location,
                distance_m=distance,
                angle_deg=session_params.get("angle_deg", 45),
                mic_height_m=session_params.get("mic_height_m", 1.5),
                elevation_type=session_params.get("elevation_type", "Ground_Level"),
                class_id=class_id,
                vehicle_class=class_name,
                legal_status=class_info.get("legal_status", "Legal_Standard"),
                horn_actuation_type=session_params.get("horn_type", "Standard"),
                vehicle_instance_id=session_params.get("vehicle_id", "N/A"),
                temperature_c=session_params.get("temperature_c", 30.0),
                relative_humidity_pct=session_params.get("humidity_pct", 70.0),
                weather_condition=session_params.get("weather", "Dry_Sunny"),
                timestamp_iso=timestamp_iso,
                ground_truth_method=session_params.get("ground_truth_method", "Synced_Video_Frame"),
                annotator_id=session_params.get("annotator_id", "RESEARCHER_1"),
                notes=session_params.get("notes", "")
            )

            # 5. Append to database
            self.metadata_service.append_record(meta_record)
            logger.info(f"Successfully exported event: {filename}")

            if on_complete:
                on_complete(f"Saved: {filename} [{class_name}] (#{sample_count})")

        except Exception as e:
            logger.error(f"Error during audio event export: {str(e)}", exc_info=True)
            if on_complete:
                on_complete(f"Error exporting event: {str(e)}")
