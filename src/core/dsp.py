"""
Real-time Digital Signal Processing (DSP) for Acoustic Analysis
"""
import numpy as np
from typing import Tuple

class DSPProcessor:
    """
    Performs fast real-time audio analysis:
    - Peak & RMS level calculation (in dBFS)
    - Sound Pressure Level (SPL) estimation in dBA
    - Fast Fourier Transform (FFT) spectrum computation
    - Clipping & saturation detection
    """
    def __init__(self, sample_rate: int = 48000, calib_offset_c: float = 112.4):
        self.sample_rate = sample_rate
        self.calib_offset_c = calib_offset_c
        self.clipping_threshold_dbfs = -0.5

    def calculate_levels(self, audio_chunk: np.ndarray) -> Tuple[float, float, bool]:
        """
        Calculates Peak dBFS, RMS dBFS, and detects clipping.
        Returns: (peak_dbfs, rms_dbfs, is_clipping)
        """
        if len(audio_chunk) == 0:
            return -100.0, -100.0, False

        # Peak calculation
        peak_val = np.max(np.abs(audio_chunk))
        peak_dbfs = 20.0 * np.log10(max(peak_val, 1e-7))

        # RMS calculation
        rms_val = np.sqrt(np.mean(audio_chunk ** 2))
        rms_dbfs = 20.0 * np.log10(max(rms_val, 1e-7))

        # Clipping detector
        is_clipping = bool(peak_dbfs >= self.clipping_threshold_dbfs)

        return float(peak_dbfs), float(rms_dbfs), is_clipping

    def estimate_spl_dba(self, rms_dbfs: float) -> float:
        """
        Estimates real-world physical sound pressure level (dBA)
        using the empirical calibration transfer function:
        SPL (dBA) = RMS_dBFS + C_calib
        """
        return max(30.0, rms_dbfs + self.calib_offset_c)

    def compute_spectrum(self, audio_window: np.ndarray, n_fft: int = 1024) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes fast Hann-windowed real FFT for frequency visualization.
        Returns: (frequencies_hz, magnitude_db)
        """
        if len(audio_window) < n_fft:
            audio_window = np.pad(audio_window, (0, n_fft - len(audio_window)))
        else:
            audio_window = audio_window[-n_fft:]

        # Apply Hann window
        windowed = audio_window * np.hanning(n_fft)
        
        # Real FFT
        fft_complex = np.fft.rfft(windowed)
        magnitude = np.abs(fft_complex) / (n_fft / 2.0)
        magnitude_db = 20.0 * np.log10(np.maximum(magnitude, 1e-6))
        frequencies = np.fft.rfftfreq(n_fft, 1.0 / self.sample_rate)

        return frequencies, magnitude_db
