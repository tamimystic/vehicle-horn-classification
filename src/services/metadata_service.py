import os
import json
import hashlib
import threading
from pathlib import Path
from typing import Optional
import pandas as pd
from pydantic import BaseModel
from config.settings import config
from src.utils.logger import logger

class HornEventMetadata(BaseModel):
    sample_id: str
    instance_id: Optional[str] = "S01"
    filename: str
    audio_filename: Optional[str] = ""
    sha256_hash: str
    sample_rate_hz: int = 48000
    bit_depth: int = 24
    channels: int = 1
    duration_sec: float = 3.5
    peak_dbfs: float
    rms_dbfs: float
    crest_factor_db: float = 0.0
    measured_spl_dba: float
    estimated_spl_dba: float
    calib_offset_c: float = 112.4
    location: str
    distance_m: str
    distance_raw_m: Optional[float] = 5.0
    distance_uncertainty_m: Optional[float] = 0.15
    distance_confidence_pct: Optional[float] = 95.0
    distance_method: Optional[str] = "Sensor_Fusion_Optical_Tilt"
    acoustic_azimuth_deg: Optional[int] = 0
    camera_tilt_deg: Optional[float] = 0.0
    observer_height_m: Optional[float] = 1.40
    angle_deg: int = 45
    recording_side: Optional[str] = "Front"
    mic_height_m: float = 1.5
    elevation_type: str = "Ground_Level"
    class_id: str
    vehicle_class: str
    vehicle_model: Optional[str] = "Unknown"
    license_plate: Optional[str] = "Unknown"
    photo_filename: Optional[str] = ""
    legal_status: str = "Legal_Standard"
    horn_actuation_type: str = "Standard"
    vehicle_instance_id: Optional[str] = "N/A"
    temperature_c: float = 30.0
    relative_humidity_pct: float = 70.0
    weather_condition: str = "Dry_Sunny"
    timestamp_iso: str
    ground_truth_method: str = "Synced_Video_Frame"
    annotator_id: str = "RESEARCHER_1"
    notes: Optional[str] = ""

class MetadataService:
    def __init__(self, csv_path: Path = config.paths.metadata_csv, json_path: Path = config.paths.metadata_json, dataset_csv_path: Optional[Path] = None):
        self.csv_path = csv_path
        self.json_path = json_path
        self.dataset_csv_path = dataset_csv_path if dataset_csv_path is not None else (config.paths.dataset_metadata_csv if csv_path == config.paths.metadata_csv else None)
        self.lock = threading.Lock()
        self._init_storage()

    def _init_storage(self) -> None:
        with self.lock:
            fields = list(HornEventMetadata.model_fields.keys())
            if not self.csv_path.exists():
                self.csv_path.parent.mkdir(parents=True, exist_ok=True)
                pd.DataFrame(columns=fields).to_csv(self.csv_path, index=False)
            if self.dataset_csv_path and not self.dataset_csv_path.exists():
                self.dataset_csv_path.parent.mkdir(parents=True, exist_ok=True)
                pd.DataFrame(columns=fields).to_csv(self.dataset_csv_path, index=False)
            if not self.json_path.exists():
                self.json_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump([], f, indent=2)

    @staticmethod
    def compute_sha256(filepath: Path) -> str:
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def get_sample_count(self) -> int:
        with self.lock:
            if self.csv_path.exists():
                try:
                    return len(pd.read_csv(self.csv_path))
                except Exception:
                    return 0
            return 0

    def append_record(self, record: HornEventMetadata) -> None:
        data = record.model_dump()
        with self.lock:
            pd.DataFrame([data]).to_csv(self.csv_path, mode="a", header=not self.csv_path.exists(), index=False)
            if self.dataset_csv_path:
                pd.DataFrame([data]).to_csv(self.dataset_csv_path, mode="a", header=not self.dataset_csv_path.exists(), index=False)
            records = []
            if self.json_path.exists():
                try:
                    with open(self.json_path, "r", encoding="utf-8") as f:
                        records = json.load(f)
                except Exception:
                    records = []
            records.append(data)
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
        logger.info(f"Recorded metadata for {record.sample_id} ({record.vehicle_class})")
