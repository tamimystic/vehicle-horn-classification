"""
Low-latency PortAudio / SoundDevice Ingestion Engine
"""
from typing import List, Dict, Optional, Callable
import sounddevice as sd
import numpy as np

from config.settings import config
from src.core.ring_buffer import CircularAudioBuffer
from src.core.dsp import DSPProcessor
from src.utils.logger import logger

class AudioEngine:
    """
    Manages low-level audio stream ingestion, device querying,
    and feeding the circular buffer.
    """
    def __init__(self, sample_rate: int = config.audio.sample_rate,
                 channels: int = config.audio.channels,
                 buffer_duration_sec: float = config.audio.buffer_duration_sec):
        self.sample_rate = sample_rate
        self.channels = channels
        self.capacity_samples = int(sample_rate * buffer_duration_sec)
        
        self.ring_buffer = CircularAudioBuffer(self.capacity_samples)
        self.dsp = DSPProcessor(sample_rate, config.audio.calib_offset_c)
        
        self.stream: Optional[sd.InputStream] = None
        self.is_running: bool = False
        self.current_peak_dbfs: float = -100.0
        self.current_rms_dbfs: float = -100.0
        self.is_clipping: bool = False
        self.on_clipping_callback: Optional[Callable[[], None]] = None

    @staticmethod
    def list_input_devices() -> List[Dict]:
        """Returns all available physical audio input devices."""
        devices = sd.query_devices()
        input_devs = []
        for idx, dev in enumerate(devices):
            if dev.get('max_input_channels', 0) > 0:
                input_devs.append({
                    "id": idx,
                    "name": dev['name'],
                    "channels": dev['max_input_channels'],
                    "default_samplerate": dev['default_samplerate'],
                    "hostapi": dev['hostapi']
                })
        return input_devs

    def _audio_callback(self, indata, frames, time_info, status):
        """Low-level callback executed by audio hardware thread."""
        if status:
            logger.warning(f"Audio Callback Status Flag: {status}")

        chunk = indata[:, 0].copy()

        # Update real-time metrics
        peak, rms, clipping = self.dsp.calculate_levels(chunk)
        self.current_peak_dbfs = peak
        self.current_rms_dbfs = rms
        self.is_clipping = clipping

        if clipping and self.on_clipping_callback:
            self.on_clipping_callback()

        # Write to circular buffer
        self.ring_buffer.write(chunk)

    def start(self, device_id: Optional[int] = None) -> None:
        """Starts the audio capture stream."""
        if self.is_running:
            return

        logger.info(f"Starting AudioEngine: SR={self.sample_rate}, CH={self.channels}, DevID={device_id}")
        self.ring_buffer.clear()
        
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype=config.audio.dtype,
            callback=self._audio_callback,
            device=device_id,
            blocksize=config.audio.block_size
        )
        self.stream.start()
        self.is_running = True
        logger.info("AudioEngine started successfully.")

    def stop(self) -> None:
        """Stops the audio capture stream."""
        if not self.is_running:
            return

        logger.info("Stopping AudioEngine...")
        self.is_running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        logger.info("AudioEngine stopped.")

    def get_latest_samples(self, n_samples: int) -> np.ndarray:
        """Extracts the most recent samples from the ring buffer."""
        return self.ring_buffer.get_latest(n_samples)
