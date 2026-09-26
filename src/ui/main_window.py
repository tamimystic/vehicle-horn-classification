"""
Main Application Window for AcousticAcquire-BD
"""
import sys
from PyQt6 import QtWidgets, QtCore, QtGui

from config.settings import config
from src.core.audio_engine import AudioEngine
from src.services.recorder_service import RecorderService
from src.services.metadata_service import MetadataService
from src.ui.styles import THEME_STYLESHEET
from src.ui.components import VisualizerWidget, SessionPanel, HotkeyPanel, StatusPanel
from src.utils.logger import logger

class MainWindow(QtWidgets.QMainWindow):
    """
    Main GUI Window orchestrating real-time audio streams,
    visualizers, hotkeys, and recorder services.
    """
    def __init__(self, audio_engine: AudioEngine,
                 recorder_service: RecorderService,
                 metadata_service: MetadataService):
        super().__init__()
        self.audio_engine = audio_engine
        self.recorder_service = recorder_service
        self.metadata_service = metadata_service
        
        self.taxonomy = config.load_taxonomy()
        self.classes_data = self.taxonomy.get("classes", [])
        self.key_to_class = {c["key_shortcut"]: c for c in self.classes_data}

        self.init_ui()
        self.init_timer()

    def init_ui(self):
        self.setWindowTitle("AcousticAcquire-BD: Vehicle Horn Data Acquisition Suite")
        self.resize(1150, 820)
        self.setStyleSheet(THEME_STYLESHEET)

        central_widget = QtWidgets.QWidget()
        main_layout = QtWidgets.QVBoxLayout(central_widget)
        main_layout.setContentsMargins(15, 15, 15, 15)
        main_layout.setSpacing(12)

        # 1. Top Header Row (Title + Audio Device Selector)
        header_layout = QtWidgets.QHBoxLayout()
        title_label = QtWidgets.QLabel("AcousticAcquire-BD: Vehicle Horn Data Acquisition Suite")
        title_label.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Weight.Bold))
        title_label.setStyleSheet("color: #89b4fa;")
        header_layout.addWidget(title_label)

        header_layout.addStretch()

        # Device Selector
        header_layout.addWidget(QtWidgets.QLabel("Input Device:"))
        self.device_combo = QtWidgets.QComboBox()
        self.device_combo.setMinimumWidth(220)
        devices = self.audio_engine.list_input_devices()
        for dev in devices:
            self.device_combo.addItem(f"[{dev['id']}] {dev['name']}", dev['id'])
        self.device_combo.currentIndexChanged.connect(self.on_device_changed)
        header_layout.addWidget(self.device_combo)

        main_layout.addLayout(header_layout)

        # 2. Session Parameter Panel
        self.session_panel = SessionPanel()
        main_layout.addWidget(self.session_panel)

        # 3. Real-Time Visualizer Widget (Waveform + FFT)
        self.visualizer_widget = VisualizerWidget(self.audio_engine.dsp)
        main_layout.addWidget(self.visualizer_widget, stretch=2)

        # 4. Hotkey Panel (1-9 Class Grid)
        self.hotkey_panel = HotkeyPanel(self.classes_data, self.on_class_triggered)
        main_layout.addWidget(self.hotkey_panel)

        # 5. Status Panel
        initial_count = self.metadata_service.get_sample_count()
        self.status_panel = StatusPanel(initial_count)
        main_layout.addWidget(self.status_panel)

        # Bottom StatusBar
        self.status_bar = QtWidgets.QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Engine ready. Press 1-9 to log vehicle horn events.")

        self.setCentralWidget(central_widget)

    def init_timer(self):
        """Starts 30 FPS timer for updating waveform and spectrum."""
        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.on_render_tick)
        self.timer.start(33)

    def on_render_tick(self):
        """Called ~30 times per second to update UI plots and levels."""
        # 1. Update Visualizer
        samples = self.audio_engine.get_latest_samples(config.audio.sample_rate // 4)
        self.visualizer_widget.update_plots(samples)

        # 2. Update Status Levels
        self.status_panel.update_levels(
            self.audio_engine.current_peak_dbfs,
            self.audio_engine.current_rms_dbfs,
            self.audio_engine.is_clipping
        )

    def on_device_changed(self, index: int):
        """Switches physical audio input device."""
        dev_id = self.device_combo.currentData()
        logger.info(f"Switching input device to ID={dev_id}")
        self.audio_engine.stop()
        self.audio_engine.start(device_id=dev_id)

    def on_class_triggered(self, class_info: dict):
        """Triggered when hotkey is pressed or button clicked."""
        session_params = self.session_panel.get_params()
        
        self.recorder_service.trigger_capture(
            class_info=class_info,
            session_params=session_params,
            on_complete=self.on_export_finished
        )

    def on_export_finished(self, message: str):
        """Callback from background recorder worker."""
        # Must execute on Qt main thread via QMetaObject or signal if needed,
        # but singleShot makes it safe:
        QtCore.QTimer.singleShot(0, lambda: self._update_ui_after_export(message))

    def _update_ui_after_export(self, message: str):
        self.status_bar.showMessage(message, 5000)
        new_count = self.metadata_service.get_sample_count()
        self.status_panel.set_sample_count(new_count)

    def keyPressEvent(self, event: QtGui.QKeyEvent):
        """Captures 1-9 keyboard hotkeys."""
        text = event.text().strip()
        if text in self.key_to_class:
            class_info = self.key_to_class[text]
            self.hotkey_panel.flash_button(text)
            self.on_class_triggered(class_info)
        else:
            super().keyPressEvent(event)

    def closeEvent(self, event):
        """Gracefully stops engine when window closes."""
        logger.info("Closing application window...")
        self.audio_engine.stop()
        event.accept()
