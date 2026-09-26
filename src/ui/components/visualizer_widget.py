"""
High-Speed PyQtGraph Real-Time Waveform and FFT Spectrum Visualizer
"""
import numpy as np
from PyQt6 import QtWidgets, QtCore
import pyqtgraph as pg

from config.settings import config
from src.core.dsp import DSPProcessor

class VisualizerWidget(QtWidgets.QWidget):
    """
    Renders high-speed, GPU-accelerated:
    1. Real-time audio waveform (oscilloscope)
    2. Real-time FFT magnitude spectrum (0 - 10 kHz)
    """
    def __init__(self, dsp: DSPProcessor, parent=None):
        super().__init__(parent)
        self.dsp = dsp
        self.sample_rate = config.audio.sample_rate
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        pg.setConfigOption('background', '#181825')
        pg.setConfigOption('foreground', '#cdd6f4')
        pg.setConfigOption('antialias', True)

        self.graphics_layout = pg.GraphicsLayoutWidget()
        layout.addWidget(self.graphics_layout)

        # 1. Waveform Plot
        self.wave_plot = self.graphics_layout.addPlot(title="<b>Real-Time Audio Waveform (Time Domain)</b>")
        self.wave_plot.setYRange(-1.0, 1.0)
        self.wave_plot.setLabel('left', 'Amplitude', units='norm')
        self.wave_plot.setLabel('bottom', 'Time', units='samples')
        self.wave_plot.showGrid(x=True, y=True, alpha=0.3)
        self.wave_curve = self.wave_plot.plot(pen=pg.mkPen('#89b4fa', width=1.5))

        self.graphics_layout.nextRow()

        # 2. FFT Spectrum Plot
        self.spec_plot = self.graphics_layout.addPlot(title="<b>Fast Fourier Transform Spectrum (0 - 10 kHz)</b>")
        self.spec_plot.setXRange(0, 10000)
        self.spec_plot.setYRange(-85, 0)
        self.spec_plot.setLabel('left', 'Magnitude', units='dBFS')
        self.spec_plot.setLabel('bottom', 'Frequency', units='Hz')
        self.spec_plot.showGrid(x=True, y=True, alpha=0.3)
        self.spec_curve = self.spec_plot.plot(pen=pg.mkPen('#f38ba8', width=1.5))

    def update_plots(self, audio_samples: np.ndarray):
        """Called periodically by timer (30-60 FPS)."""
        if len(audio_samples) == 0:
            return

        # Downsample waveform for ultra-smooth rendering
        downsampled = audio_samples[::max(1, len(audio_samples) // 1000)]
        self.wave_curve.setData(downsampled)

        # Compute and plot FFT
        freqs, mag_db = self.dsp.compute_spectrum(audio_samples, n_fft=1024)
        self.spec_curve.setData(freqs, mag_db)
