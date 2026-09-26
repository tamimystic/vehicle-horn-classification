"""
Unit Tests for CircularAudioBuffer
"""
import sys
from pathlib import Path
import numpy as np
import pytest

# Add acoustic_collector to path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.core.ring_buffer import CircularAudioBuffer

def test_ring_buffer_basic_write_and_read():
    capacity = 100
    buf = CircularAudioBuffer(capacity_samples=capacity)

    # Write 50 samples
    data = np.arange(50, dtype=np.float32)
    buf.write(data)

    latest = buf.get_latest(50)
    assert np.array_equal(latest, data)

def test_ring_buffer_wraparound():
    capacity = 100
    buf = CircularAudioBuffer(capacity_samples=capacity)

    # Write 80 samples
    buf.write(np.arange(80, dtype=np.float32))
    # Write another 40 samples (total 120, wraps around by 20)
    buf.write(np.arange(80, 120, dtype=np.float32))

    # Total buffer should hold the last 100 samples (from 20 to 119)
    latest_100 = buf.get_latest(100)
    expected = np.arange(20, 120, dtype=np.float32)
    assert np.array_equal(latest_100, expected)

def test_ring_buffer_overflow_chunk():
    capacity = 50
    buf = CircularAudioBuffer(capacity_samples=capacity)

    # Write a chunk larger than capacity (100 samples)
    data = np.arange(100, dtype=np.float32)
    buf.write(data)

    # Buffer should retain the last 50 samples (50 to 99)
    latest_50 = buf.get_latest(50)
    expected = np.arange(50, 100, dtype=np.float32)
    assert np.array_equal(latest_50, expected)

def test_ring_buffer_exceed_capacity_error():
    capacity = 50
    buf = CircularAudioBuffer(capacity_samples=capacity)
    buf.write(np.zeros(30, dtype=np.float32))

    with pytest.raises(ValueError):
        buf.get_latest(60)
