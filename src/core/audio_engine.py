from typing import List, Dict, Optional, Callable
import sounddevice as sd
import numpy as np
from config.settings import config
from src.core.ring_buffer import CircularAudioBuffer
from src.core.dsp import DSPProcessor
from src.utils.logger import logger

class AudioEngine:
    def __init__(self, sample_rate: int = config.audio.sample_rate,
                 channels: int = config.audio.channels,
                 buffer_duration_sec: float = config.audio.buffer_duration_sec):
        self.sample_rate = sample_rate
        self.channels = channels
        self.capacity_samples = int(sample_rate * buffer_duration_sec)
        self.ring_buffer = CircularAudioBuffer(self.capacity_samples)
        self.dsp = DSPProcessor(sample_rate, config.audio.calib_offset_c)
        self.stream: Optional[sd.InputStream] = None
        self.is_running = False
        self.current_peak_dbfs = -100.0
        self.current_rms_dbfs = -100.0
        self.is_clipping = False
        self.on_clipping_callback: Optional[Callable[[], None]] = None

    @staticmethod
    def list_input_devices() -> List[Dict]:
        return [
            {"id": idx, "name": dev["name"], "channels": dev["max_input_channels"],
             "default_samplerate": dev["default_samplerate"], "hostapi": dev["hostapi"]}
            for idx, dev in enumerate(sd.query_devices()) if dev.get("max_input_channels", 0) > 0
        ]

    def _audio_callback(self, indata, frames, time_info, status):
        if status:
            logger.warning(f"Audio status: {status}")
        chunk = indata[:, 0].copy()
        peak, rms, clipping = self.dsp.calculate_levels(chunk)
        self.current_peak_dbfs = peak
        self.current_rms_dbfs = rms
        self.is_clipping = clipping
        if clipping and self.on_clipping_callback:
            self.on_clipping_callback()
        self.ring_buffer.write(chunk)

    def start(self, device_id: Optional[int] = None) -> None:
        if self.is_running:
            return
        logger.info(f"Starting AudioEngine (sr={self.sample_rate}, ch={self.channels}, dev={device_id})")
        self.ring_buffer.clear()
        self.stream = sd.InputStream(
            samplerate=self.sample_rate, channels=self.channels, dtype=config.audio.dtype,
            callback=self._audio_callback, device=device_id, blocksize=config.audio.block_size
        )
        self.stream.start()
        self.is_running = True

    def stop(self) -> None:
        if not self.is_running:
            return
        self.is_running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

    def get_latest_samples(self, n_samples: int) -> np.ndarray:
        return self.ring_buffer.get_latest(n_samples)
