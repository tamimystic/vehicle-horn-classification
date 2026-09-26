from typing import Tuple
import numpy as np

class DSPProcessor:
    def __init__(self, sample_rate: int = 48000, calib_offset_c: float = 112.4):
        self.sample_rate = sample_rate
        self.calib_offset_c = calib_offset_c
        self.clipping_threshold_dbfs = -0.5

    def calculate_levels(self, audio_chunk: np.ndarray) -> Tuple[float, float, bool]:
        if len(audio_chunk) == 0:
            return -100.0, -100.0, False
        peak_val = np.max(np.abs(audio_chunk))
        peak_dbfs = 20.0 * np.log10(max(peak_val, 1e-7))
        rms_val = np.sqrt(np.mean(audio_chunk ** 2))
        rms_dbfs = 20.0 * np.log10(max(rms_val, 1e-7))
        return float(peak_dbfs), float(rms_dbfs), bool(peak_dbfs >= self.clipping_threshold_dbfs)

    def estimate_spl_dba(self, rms_dbfs: float) -> float:
        return max(30.0, rms_dbfs + self.calib_offset_c)

    def compute_spectrum(self, audio_window: np.ndarray, n_fft: int = 1024) -> Tuple[np.ndarray, np.ndarray]:
        if len(audio_window) < n_fft:
            audio_window = np.pad(audio_window, (0, n_fft - len(audio_window)))
        else:
            audio_window = audio_window[-n_fft:]
        fft_complex = np.fft.rfft(audio_window * np.hanning(n_fft))
        magnitude_db = 20.0 * np.log10(np.maximum(np.abs(fft_complex) / (n_fft / 2.0), 1e-6))
        return np.fft.rfftfreq(n_fft, 1.0 / self.sample_rate), magnitude_db
