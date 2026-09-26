import sys
from PyQt6 import QtWidgets, QtCore, QtGui
from config.settings import config
from src.core.audio_engine import AudioEngine
from src.services.recorder_service import RecorderService
from src.services.metadata_service import MetadataService
from src.ui.styles import THEME_STYLESHEET
from src.ui.components import VisualizerWidget, SessionPanel, HotkeyPanel, StatusPanel

class MainWindow(QtWidgets.QMainWindow):
    def __init__(self, audio_engine: AudioEngine, recorder_service: RecorderService, metadata_service: MetadataService):
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
        self.setWindowTitle("Vehicle Horn Data Collector")
        self.resize(1100, 800)
        self.setStyleSheet(THEME_STYLESHEET)

        central = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(central)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)

        header = QtWidgets.QHBoxLayout()
        title = QtWidgets.QLabel("Vehicle Horn Data Collector")
        title.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Weight.Bold))
        title.setStyleSheet("color: #89b4fa;")
        header.addWidget(title)
        header.addStretch()

        header.addWidget(QtWidgets.QLabel("Input Device:"))
        self.device_combo = QtWidgets.QComboBox()
        self.device_combo.setMinimumWidth(220)
        for dev in self.audio_engine.list_input_devices():
            self.device_combo.addItem(f"[{dev['id']}] {dev['name']}", dev['id'])
        self.device_combo.currentIndexChanged.connect(self.on_device_changed)
        header.addWidget(self.device_combo)
        layout.addLayout(header)

        self.session_panel = SessionPanel()
        layout.addWidget(self.session_panel)

        self.visualizer_widget = VisualizerWidget(self.audio_engine.dsp)
        layout.addWidget(self.visualizer_widget, stretch=2)

        self.hotkey_panel = HotkeyPanel(self.classes_data, self.on_class_triggered)
        layout.addWidget(self.hotkey_panel)

        self.status_panel = StatusPanel(self.metadata_service.get_sample_count())
        layout.addWidget(self.status_panel)

        self.status_bar = QtWidgets.QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Engine ready. Press 1-9 to record horn events.")
        self.setCentralWidget(central)

    def init_timer(self):
        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.on_render_tick)
        self.timer.start(33)

    def on_render_tick(self):
        samples = self.audio_engine.get_latest_samples(config.audio.sample_rate // 4)
        self.visualizer_widget.update_plots(samples)
        self.status_panel.update_levels(self.audio_engine.current_peak_dbfs, self.audio_engine.current_rms_dbfs, self.audio_engine.is_clipping)

    def on_device_changed(self, index: int):
        dev_id = self.device_combo.currentData()
        self.audio_engine.stop()
        self.audio_engine.start(device_id=dev_id)

    def on_class_triggered(self, class_info: dict):
        self.recorder_service.trigger_capture(
            class_info=class_info, session_params=self.session_panel.get_params(),
            on_complete=lambda msg: QtCore.QTimer.singleShot(0, lambda: self._update_ui_after_export(msg))
        )

    def _update_ui_after_export(self, message: str):
        self.status_bar.showMessage(message, 5000)
        self.status_panel.set_sample_count(self.metadata_service.get_sample_count())

    def keyPressEvent(self, event: QtGui.QKeyEvent):
        text = event.text().strip()
        if text in self.key_to_class:
            self.hotkey_panel.flash_button(text)
            self.on_class_triggered(self.key_to_class[text])
        else:
            super().keyPressEvent(event)

    def closeEvent(self, event):
        self.audio_engine.stop()
        event.accept()
