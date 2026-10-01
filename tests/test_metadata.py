import sys
import tempfile
from pathlib import Path
import pandas as pd
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.services.metadata_service import MetadataService, HornEventMetadata

def test_metadata_pydantic_validation():
    record = HornEventMetadata(
        sample_id="BDHORN_0001", filename="BDHORN_C01_HYD_0001.wav",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        peak_dbfs=-3.5, rms_dbfs=-14.2, measured_spl_dba=104.5, estimated_spl_dba=98.2,
        location="Gabtoli", distance_m="5m", class_id="C01", vehicle_class="Bus",
        timestamp_iso="2026-09-24T00:00:00"
    )
    assert record.sample_id == "BDHORN_0001"
    assert record.class_id == "C01"

def test_metadata_service_append():
    with tempfile.TemporaryDirectory() as tmp_dir:
        csv_path, json_path = Path(tmp_dir) / "test_meta.csv", Path(tmp_dir) / "test_meta.json"
        service = MetadataService(csv_path=csv_path, json_path=json_path)
        assert service.get_sample_count() == 0

        record = HornEventMetadata(
            sample_id="BDHORN_0001", filename="BDHORN_C01_HYD_0001.wav", sha256_hash="dummy_hash",
            peak_dbfs=-2.1, rms_dbfs=-12.5, measured_spl_dba=102.0, estimated_spl_dba=99.9,
            location="Mawa", distance_m="10m", class_id="C01", vehicle_class="Bus",
            timestamp_iso="2026-09-24T01:00:00"
        )
        service.append_record(record)
        assert service.get_sample_count() == 1
        df = pd.read_csv(csv_path)
        assert len(df) == 1
        assert df.iloc[0]["sample_id"] == "BDHORN_0001"
