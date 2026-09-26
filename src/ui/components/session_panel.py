"""
Session Parameter Input Panel (Location, Distance, SLM, Weather)
"""
from PyQt6 import QtWidgets, QtCore
from typing import Dict, Any

class SessionPanel(QtWidgets.QGroupBox):
    """
    Input panel for setting experimental parameters in the field.
    """
    def __init__(self, parent=None):
        super().__init__("Field Session Parameters (Spatial & Environmental)", parent)
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QGridLayout(self)
        layout.setSpacing(10)

        # 1. Location
        layout.addWidget(QtWidgets.QLabel("Location / Junction:"), 0, 0)
        self.loc_input = QtWidgets.QLineEdit("Gabtoli_Terminal")
        self.loc_input.setPlaceholderText("e.g. Mawa_Highway, Farmgate")
        layout.addWidget(self.loc_input, 0, 1)

        # 2. Distance
        layout.addWidget(QtWidgets.QLabel("Distance to Vehicle:"), 0, 2)
        self.dist_input = QtWidgets.QComboBox()
        self.dist_input.addItems(["3m", "5m", "7.5m", "10m", "15m", "Overbridge_45deg"])
        self.dist_input.setCurrentText("5m")
        layout.addWidget(self.dist_input, 0, 3)

        # 3. Sound Level Meter (SLM) Reading
        layout.addWidget(QtWidgets.QLabel("SLM Meter (dBA):"), 0, 4)
        self.spl_input = QtWidgets.QDoubleSpinBox()
        self.spl_input.setRange(30.0, 140.0)
        self.spl_input.setValue(95.0)
        self.spl_input.setSingleStep(0.5)
        self.spl_input.setSuffix(" dBA")
        layout.addWidget(self.spl_input, 0, 5)

        # 4. Weather Condition
        layout.addWidget(QtWidgets.QLabel("Weather:"), 1, 0)
        self.weather_input = QtWidgets.QComboBox()
        self.weather_input.addItems(["Dry_Sunny", "Overcast_Cloudy", "Post_Rain_WetRoad", "Drizzle"])
        layout.addWidget(self.weather_input, 1, 1)

        # 5. Temperature
        layout.addWidget(QtWidgets.QLabel("Air Temp (°C):"), 1, 2)
        self.temp_input = QtWidgets.QDoubleSpinBox()
        self.temp_input.setRange(0.0, 50.0)
        self.temp_input.setValue(32.0)
        self.temp_input.setSuffix(" °C")
        layout.addWidget(self.temp_input, 1, 3)

        # 6. Relative Humidity
        layout.addWidget(QtWidgets.QLabel("Humidity (%):"), 1, 4)
        self.humidity_input = QtWidgets.QSpinBox()
        self.humidity_input.setRange(10, 100)
        self.humidity_input.setValue(68)
        self.humidity_input.setSuffix(" %")
        layout.addWidget(self.humidity_input, 1, 5)

    def get_params(self) -> Dict[str, Any]:
        """Returns the current values as a clean dictionary."""
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
