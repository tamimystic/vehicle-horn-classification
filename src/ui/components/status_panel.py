"""
System Status and Audio Quality Panel (Clipping Alert, Peak Meter, Counter)
"""
from PyQt6 import QtWidgets, QtCore, QtGui

class StatusPanel(QtWidgets.QWidget):
    """
    Displays real-time hardware status:
    - Audio Peak & RMS levels
    - Large color-coded Clipping Distortion Alert
    - Total Logged Events Counter
    """
    def __init__(self, initial_count: int = 0, parent=None):
        super().__init__(parent)
        self.sample_count = initial_count
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QHBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)

        # 1. Total Count
        self.count_badge = QtWidgets.QLabel(f"Total Logged Events: {self.sample_count}")
        self.count_badge.setFont(QtGui.QFont("Segoe UI", 12, QtGui.QFont.Weight.Bold))
        self.count_badge.setStyleSheet("color: #89b4fa; background: #313244; padding: 8px 14px; border-radius: 6px;")
        layout.addWidget(self.count_badge)

        # 2. Audio Level readout
        self.level_label = QtWidgets.QLabel("Peak: -100.0 dBFS | RMS: -100.0 dBFS")
        self.level_label.setFont(QtGui.QFont("Segoe UI", 11))
        self.level_label.setStyleSheet("color: #a6adc8; padding: 8px;")
        layout.addWidget(self.level_label)

        layout.addStretch()

        # 3. Dynamic Clipping Warning Badge
        self.clipping_badge = QtWidgets.QLabel("SIGNAL CLEAN (NO CLIPPING)")
        self.clipping_badge.setFont(QtGui.QFont("Segoe UI", 11, QtGui.QFont.Weight.Bold))
        self.clipping_badge.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        self.clipping_badge.setStyleSheet("background-color: #a6e3a1; color: #11111b; padding: 8px 16px; border-radius: 6px; min-width: 220px;")
        layout.addWidget(self.clipping_badge)

    def update_levels(self, peak_db: float, rms_db: float, is_clipping: bool):
        self.level_label.setText(f"Peak: {peak_db:.1f} dBFS | RMS: {rms_db:.1f} dBFS")

        if is_clipping:
            self.clipping_badge.setText("!! CLIPPING DISTORTION WARNING !!")
            self.clipping_badge.setStyleSheet("background-color: #f38ba8; color: #11111b; font-weight: bold; padding: 8px 16px; border-radius: 6px;")
        elif peak_db > -6.0:
            self.clipping_badge.setText(f"HIGH LEVEL: {peak_db:.1f} dBFS")
            self.clipping_badge.setStyleSheet("background-color: #fab387; color: #11111b; font-weight: bold; padding: 8px 16px; border-radius: 6px;")
        else:
            self.clipping_badge.setText(f"SIGNAL CLEAN: {peak_db:.1f} dBFS")
            self.clipping_badge.setStyleSheet("background-color: #a6e3a1; color: #11111b; font-weight: bold; padding: 8px 16px; border-radius: 6px;")

    def set_sample_count(self, count: int):
        self.sample_count = count
        self.count_badge.setText(f"Total Logged Events: {self.sample_count}")
