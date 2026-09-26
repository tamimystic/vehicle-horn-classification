import sys
from pathlib import Path
import numpy as np
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.core.ring_buffer import CircularAudioBuffer

def test_ring_buffer_basic_write_and_read():
    buf = CircularAudioBuffer(capacity_samples=100)
    data = np.arange(50, dtype=np.float32)
    buf.write(data)
    assert np.array_equal(buf.get_latest(50), data)

def test_ring_buffer_wraparound():
    buf = CircularAudioBuffer(capacity_samples=100)
    buf.write(np.arange(80, dtype=np.float32))
    buf.write(np.arange(80, 120, dtype=np.float32))
    assert np.array_equal(buf.get_latest(100), np.arange(20, 120, dtype=np.float32))

def test_ring_buffer_overflow_chunk():
    buf = CircularAudioBuffer(capacity_samples=50)
    buf.write(np.arange(100, dtype=np.float32))
    assert np.array_equal(buf.get_latest(50), np.arange(50, 100, dtype=np.float32))

def test_ring_buffer_exceed_capacity_error():
    buf = CircularAudioBuffer(capacity_samples=50)
    buf.write(np.zeros(30, dtype=np.float32))
    with pytest.raises(ValueError):
        buf.get_latest(60)
