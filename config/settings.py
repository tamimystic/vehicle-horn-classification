"""
Configuration Management for AcousticAcquire-BD
"""
import os
import json
from pathlib import Path
from pydantic import BaseModel, Field

# Base Directory paths (Root of Project)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASE_DIR = PROJECT_ROOT
DATA_DIR = PROJECT_ROOT / "data"
METADATA_DIR = PROJECT_ROOT / "metadata"

class AudioSettings(BaseModel):
    sample_rate: int = 48000
    channels: int = 1
    dtype: str = "float32"
    buffer_duration_sec: float = 5.0
    pre_trigger_sec: float = 1.0
    post_trigger_sec: float = 2.5
    block_size: int = 1024
    calib_offset_c: float = 112.4  # dB constant mapping dBFS to real-world dBA

    @property
    def total_event_duration(self) -> float:
        return self.pre_trigger_sec + self.post_trigger_sec

class PathSettings(BaseModel):
    raw_recordings_dir: Path = DATA_DIR / "01_raw_field_recordings"
    segmented_dir: Path = DATA_DIR / "02_segmented_events"
    metadata_csv: Path = METADATA_DIR / "metadata_master.csv"
    metadata_json: Path = METADATA_DIR / "metadata_master.json"
    logs_dir: Path = BASE_DIR / "logs"

class AppConfig(BaseModel):
    app_name: str = "AcousticAcquire-BD"
    version: str = "1.0.0"
    audio: AudioSettings = Field(default_factory=AudioSettings)
    paths: PathSettings = Field(default_factory=PathSettings)
    taxonomy_file: Path = BASE_DIR / "config" / "taxonomy.json"

    def load_taxonomy(self) -> dict:
        with open(self.taxonomy_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def ensure_directories(self):
        self.paths.raw_recordings_dir.mkdir(parents=True, exist_ok=True)
        self.paths.segmented_dir.mkdir(parents=True, exist_ok=True)
        self.paths.metadata_csv.parent.mkdir(parents=True, exist_ok=True)
        self.paths.logs_dir.mkdir(parents=True, exist_ok=True)

# Singleton Global Configuration
config = AppConfig()
config.ensure_directories()
