import tempfile
from pathlib import Path
import numpy as np
import pytest

from config.settings import AppConfig, PathSettings
from src.core.audio_engine import AudioEngine
from src.services.metadata_service import MetadataService
from src.services.recorder_service import RecorderService

def test_recorder_service_dual_layer_export():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        paths = PathSettings(
            raw_recordings_dir=tmp_path / "raw",
            segmented_dir=tmp_path / "seg",
            dataset_dir=tmp_path / "Dataset",
            raw_by_class_dir=tmp_path / "Dataset" / "Raw_By_Class",
            instances_dir=tmp_path / "Dataset" / "Instances_By_Vehicle",
            vehicle_photos_dir=tmp_path / "Dataset" / "Vehicle_Photos",
            metadata_csv=tmp_path / "metadata.csv",
            metadata_json=tmp_path / "metadata.json",
            logs_dir=tmp_path / "logs"
        )
        test_config = AppConfig(paths=paths)
        test_config.ensure_directories()

        # Mock AudioEngine & MetadataService
        audio_engine = AudioEngine()
        metadata_service = MetadataService(csv_path=paths.metadata_csv, json_path=paths.metadata_json)
        recorder = RecorderService(audio_engine, metadata_service, app_config=test_config)

        dummy_audio = np.zeros(int(48000 * 0.5), dtype=np.float32)
        class_info = {"class_id": "C01", "name": "Bus", "legal_status": "Legal_Standard"}
        session_params = {
            "location": "Gabtoli",
            "distance": "5m",
            "recording_side": "Front",
            "vehicle_model": "Hino_AK1J",
            "license_plate": "DhakaMetro-Ba-14-8923"
        }

        # Run direct worker synchronously for testing
        recorder._export_worker(dummy_audio, class_info, session_params, on_complete=None)

        # Verify Layer A (Raw_By_Class)
        raw_bus_dir = paths.raw_by_class_dir / "Bus"
        assert raw_bus_dir.exists()
        raw_files = list(raw_bus_dir.glob("*.wav"))
        assert len(raw_files) == 1
        assert "BDHORN_0001_S01_Bus_Hino_AK1J_DhakaMetro-Ba-14-8923_5m_Front_Gabtoli_" in raw_files[0].name

        # Verify Layer B (Instances_By_Vehicle)
        inst_bus_dir = paths.instances_dir / "Bus" / "Hino_AK1J_DhakaMetro-Ba-14-8923"
        assert inst_bus_dir.exists()
        inst_files = list(inst_bus_dir.glob("*.wav"))
        assert len(inst_files) == 1
        assert inst_files[0].name == raw_files[0].name

        # Verify Metadata CSV
        assert paths.metadata_csv.exists()
        assert metadata_service.get_sample_count() == 1
