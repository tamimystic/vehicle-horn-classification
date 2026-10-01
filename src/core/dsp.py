from typing import Tuple, Optional
import numpy as np

class DSPProcessor:
    def __init__(self, sample_rate: int = 48000, calib_offset_c: float = 112.4):
        self.sample_rate = sample_rate
        self.calib_offset_c = calib_offset_c
        self.clipping_threshold_dbfs = -0.5
        self.b_a = None
        self.a_a = None
        self._init_a_weighting()

    def _init_a_weighting(self):
        try:
            import scipy.signal as signal
            f1, f2, f3, f4, A1000 = 20.598997, 107.65265, 737.86223, 12194.217, 1.9997
            nums = [(2 * np.pi * f4)**2 * (10**(A1000 / 20)), 0, 0, 0, 0]
            dens = np.polymul([1, 4 * np.pi * f4, (2 * np.pi * f4)**2],
                              [1, 4 * np.pi * f1, (2 * np.pi * f1)**2])
            dens = np.polymul(dens, [1, 2 * np.pi * f3])
            dens = np.polymul(dens, [1, 2 * np.pi * f2])
            self.b_a, self.a_a = signal.bilinear(nums, dens, self.sample_rate)
        except Exception:
            self.b_a, self.a_a = None, None

    def calculate_levels(self, audio_chunk: np.ndarray) -> Tuple[float, float, bool]:
        if len(audio_chunk) == 0:
            return -100.0, -100.0, False
        peak_val = np.max(np.abs(audio_chunk))
        peak_dbfs = 20.0 * np.log10(max(peak_val, 1e-7))
        rms_val = np.sqrt(np.mean(audio_chunk ** 2))
        rms_dbfs = 20.0 * np.log10(max(rms_val, 1e-7))
        return float(peak_dbfs), float(rms_dbfs), bool(peak_dbfs >= self.clipping_threshold_dbfs)

    def calculate_a_weighted_rms(self, audio_chunk: np.ndarray) -> float:
        if len(audio_chunk) == 0:
            return -100.0
        if self.b_a is not None and self.a_a is not None and len(audio_chunk) > 16:
            try:
                import scipy.signal as signal
                filtered = signal.lfilter(self.b_a, self.a_a, audio_chunk)
                rms_a = np.sqrt(np.mean(filtered ** 2))
                return float(20.0 * np.log10(max(rms_a, 1e-7)))
            except Exception:
                pass
        rms_val = np.sqrt(np.mean(audio_chunk ** 2))
        return float(20.0 * np.log10(max(rms_val, 1e-7)))

    def estimate_spl_dba(self, rms_dbfs: float, audio_chunk: Optional[np.ndarray] = None) -> float:
        if audio_chunk is not None:
            a_rms = self.calculate_a_weighted_rms(audio_chunk)
            return max(30.0, a_rms + self.calib_offset_c)
        return max(30.0, rms_dbfs + self.calib_offset_c)

    def compute_spectrum(self, audio_window: np.ndarray, n_fft: int = 1024) -> Tuple[np.ndarray, np.ndarray]:
        if len(audio_window) < n_fft:
            audio_window = np.pad(audio_window, (0, n_fft - len(audio_window)))
        else:
            audio_window = audio_window[-n_fft:]
        fft_complex = np.fft.rfft(audio_window * np.hanning(n_fft))
        magnitude_db = 20.0 * np.log10(np.maximum(np.abs(fft_complex) / (n_fft / 2.0), 1e-6))
        return np.fft.rfftfreq(n_fft, 1.0 / self.sample_rate), magnitude_db
