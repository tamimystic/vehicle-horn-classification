from typing import Dict, Any
from PyQt6 import QtWidgets

class SessionPanel(QtWidgets.QGroupBox):
    def __init__(self, parent=None):
        super().__init__("Session Parameters", parent)
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QGridLayout(self)
        layout.setSpacing(10)

        layout.addWidget(QtWidgets.QLabel("Location:"), 0, 0)
        self.loc_input = QtWidgets.QLineEdit("Gabtoli_Terminal")
        layout.addWidget(self.loc_input, 0, 1)

        layout.addWidget(QtWidgets.QLabel("Distance:"), 0, 2)
        self.dist_input = QtWidgets.QComboBox()
        self.dist_input.addItems(["3m", "5m", "7.5m", "10m", "15m", "Overbridge_45deg"])
        self.dist_input.setCurrentText("5m")
        layout.addWidget(self.dist_input, 0, 3)

        layout.addWidget(QtWidgets.QLabel("SLM (dBA):"), 0, 4)
        self.spl_input = QtWidgets.QDoubleSpinBox()
        self.spl_input.setRange(30.0, 140.0)
        self.spl_input.setValue(95.0)
        self.spl_input.setSuffix(" dBA")
        layout.addWidget(self.spl_input, 0, 5)

        layout.addWidget(QtWidgets.QLabel("Weather:"), 1, 0)
        self.weather_input = QtWidgets.QComboBox()
        self.weather_input.addItems(["Dry_Sunny", "Overcast_Cloudy", "Post_Rain_WetRoad", "Drizzle"])
        layout.addWidget(self.weather_input, 1, 1)

        layout.addWidget(QtWidgets.QLabel("Temp (°C):"), 1, 2)
        self.temp_input = QtWidgets.QDoubleSpinBox()
        self.temp_input.setRange(0.0, 50.0)
        self.temp_input.setValue(32.0)
        self.temp_input.setSuffix(" °C")
        layout.addWidget(self.temp_input, 1, 3)

        layout.addWidget(QtWidgets.QLabel("Humidity (%):"), 1, 4)
        self.humidity_input = QtWidgets.QSpinBox()
        self.humidity_input.setRange(10, 100)
        self.humidity_input.setValue(68)
        self.humidity_input.setSuffix(" %")
        layout.addWidget(self.humidity_input, 1, 5)

    def get_params(self) -> Dict[str, Any]:
        return {
            "location": self.loc_input.text().strip().replace(" ", "_"),
            "distance": self.dist_input.currentText(),
            "measured_spl": float(self.spl_input.value()),
            "weather": self.weather_input.currentText(),
            "temperature_c": float(self.temp_input.value()),
            "humidity_pct": float(self.humidity_input.value()),
            "angle_deg": 45,
            "mic_height_m": 1.5,
            "elevation_type": "Overbridge_Downward_45deg" if "Overbridge" in self.dist_input.currentText() else "Ground_Level",
            "annotator_id": "RESEARCHER_1",
            "ground_truth_method": "Synced_Video_Frame"
        }
