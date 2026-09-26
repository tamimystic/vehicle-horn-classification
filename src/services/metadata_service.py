"""
Exhaustive Multi-Dimensional Metadata Service with Pydantic Validation
"""
import os
import json
import hashlib
import threading
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
from pydantic import BaseModel, Field

from config.settings import config
from src.utils.logger import logger

class HornEventMetadata(BaseModel):
    # Dimension 1: Signal & File Integrity
    sample_id: str = Field(..., description="Unique sample ID (e.g. BDHORN_0001)")
    filename: str = Field(..., description="WAV filename")
    sha256_hash: str = Field(..., description="SHA-256 file checksum")
    sample_rate_hz: int = Field(default=48000)
    bit_depth: int = Field(default=24)
    channels: int = Field(default=1)
    duration_sec: float = Field(default=3.5)
    peak_dbfs: float = Field(...)
    rms_dbfs: float = Field(...)
    crest_factor_db: float = Field(default=0.0)

    # Dimension 2: Physical & Acoustic Measurement
    measured_spl_dba: float = Field(..., description="Sound Level Meter reading in dBA")
    estimated_spl_dba: float = Field(..., description="Calculated SPL via calibration curve")
    calib_offset_c: float = Field(default=112.4)

    # Dimension 3: Spatial & Geometry
    location: str = Field(..., description="Site / Junction name")
    distance_m: str = Field(..., description="Distance from rig to vehicle")
    angle_deg: int = Field(default=45, description="Angle relative to vehicle flow")
    mic_height_m: float = Field(default=1.5, description="Standardized tripod height")
    elevation_type: str = Field(default="Ground_Level")

    # Dimension 4: Vehicle & Horn Taxonomy
    class_id: str = Field(..., description="Target class code (C01 to C09)")
    vehicle_class: str = Field(..., description="Target vehicle class name")
    legal_status: str = Field(default="Legal_Standard")
    horn_actuation_type: str = Field(default="Standard")
    vehicle_instance_id: Optional[str] = Field(default="N/A", description="Vehicle ID for GroupSplit")

    # Dimension 5: Meteorological & Environment
    temperature_c: float = Field(default=30.0)
    relative_humidity_pct: float = Field(default=70.0)
    weather_condition: str = Field(default="Dry_Sunny")

    # Dimension 6: Temporal & Ground-Truth
    timestamp_iso: str = Field(..., description="ISO 8601 acquisition timestamp")
    ground_truth_method: str = Field(default="Synced_Video_Frame")
    annotator_id: str = Field(default="RESEARCHER_1")
    notes: Optional[str] = Field(default="")

class MetadataService:
    """
    Manages persistent metadata storage in both CSV and JSON formats.
    Thread-safe and compliant with scientific data curation standards.
    """
    def __init__(self, csv_path: Path = config.paths.metadata_csv,
                 json_path: Path = config.paths.metadata_json):
        self.csv_path = csv_path
        self.json_path = json_path
        self.lock = threading.Lock()
        self._init_storage()

    def _init_storage(self) -> None:
        """Initializes empty storage files if they do not exist."""
        with self.lock:
            if not self.csv_path.exists():
                df_empty = pd.DataFrame(columns=list(HornEventMetadata.model_fields.keys()))
                df_empty.to_csv(self.csv_path, index=False)
                logger.info(f"Initialized master metadata CSV at {self.csv_path}")

            if not self.json_path.exists():
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump([], f, indent=2)
                logger.info(f"Initialized master metadata JSON at {self.json_path}")

    @staticmethod
    def compute_sha256(filepath: Path) -> str:
        """Computes SHA-256 hash of the generated audio file."""
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def get_sample_count(self) -> int:
        """Returns the total number of logged samples."""
        with self.lock:
            if self.csv_path.exists():
                try:
                    df = pd.read_csv(self.csv_path)
                    return len(df)
                except Exception:
                    return 0
            return 0

    def append_record(self, record: HornEventMetadata) -> None:
        """Appends a validated metadata record to both CSV and JSON."""
        data_dict = record.model_dump()
        with self.lock:
            # 1. Append to CSV
            df_new = pd.DataFrame([data_dict])
            df_new.to_csv(self.csv_path, mode='a', header=not self.csv_path.exists(), index=False)

            # 2. Append to JSON
            records = []
            if self.json_path.exists():
                try:
                    with open(self.json_path, "r", encoding="utf-8") as f:
                        records = json.load(f)
                except Exception:
                    records = []
            records.append(data_dict)
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)

        logger.info(f"Appended metadata record: ID={record.sample_id}, Class={record.vehicle_class}")
