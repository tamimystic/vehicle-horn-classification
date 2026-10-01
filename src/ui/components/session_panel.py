from typing import Dict, Any
from PyQt6 import QtWidgets

class SessionPanel(QtWidgets.QGroupBox):
    def __init__(self, parent=None):
        super().__init__("Vehicle & Session Parameters", parent)
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QGridLayout(self)
        layout.setSpacing(10)

        layout.addWidget(QtWidgets.QLabel("Location:"), 0, 0)
        self.loc_input = QtWidgets.QLineEdit("Gabtoli_Terminal")
        layout.addWidget(self.loc_input, 0, 1)

        layout.addWidget(QtWidgets.QLabel("Distance:"), 0, 2)
        self.dist_input = QtWidgets.QComboBox()
        self.dist_input.addItems(["1m", "3m", "5m", "7m", "10m", "15m", "Overbridge_45deg"])
        self.dist_input.setCurrentText("5m")
        layout.addWidget(self.dist_input, 0, 3)

        layout.addWidget(QtWidgets.QLabel("SLM (dBA):"), 0, 4)
        self.spl_input = QtWidgets.QDoubleSpinBox()
        self.spl_input.setRange(30.0, 140.0)
        self.spl_input.setValue(95.0)
        self.spl_input.setSuffix(" dBA")
        layout.addWidget(self.spl_input, 0, 5)

        layout.addWidget(QtWidgets.QLabel("Vehicle Model:"), 1, 0)
        self.model_input = QtWidgets.QLineEdit("Hino_AK1J")
        layout.addWidget(self.model_input, 1, 1)

        layout.addWidget(QtWidgets.QLabel("License Plate:"), 1, 2)
        self.plate_input = QtWidgets.QLineEdit("DhakaMetro-Ba-14-8923")
        layout.addWidget(self.plate_input, 1, 3)

        layout.addWidget(QtWidgets.QLabel("Weather:"), 1, 4)
        self.weather_input = QtWidgets.QComboBox()
        self.weather_input.addItems(["Dry_Sunny", "Overcast_Cloudy", "Post_Rain_WetRoad", "Drizzle"])
        layout.addWidget(self.weather_input, 1, 5)

        layout.addWidget(QtWidgets.QLabel("Recording Side:"), 2, 0)
        self.side_input = QtWidgets.QComboBox()
        self.side_input.addItems(["Front", "Left", "Right", "Back"])
        self.side_input.setCurrentText("Front")
        layout.addWidget(self.side_input, 2, 1)

    def get_params(self) -> Dict[str, Any]:
        return {
            "location": self.loc_input.text().strip().replace(" ", "_"),
            "distance": self.dist_input.currentText(),
            "recording_side": self.side_input.currentText(),
            "vehicle_model": self.model_input.text().strip().replace(" ", "_"),
            "license_plate": self.plate_input.text().strip().replace(" ", "_"),
            "measured_spl": float(self.spl_input.value()),
            "weather": self.weather_input.currentText(),
            "angle_deg": 45,
            "mic_height_m": 1.5,
            "elevation_type": "Overbridge_Downward_45deg" if "Overbridge" in self.dist_input.currentText() else "Ground_Level",
            "annotator_id": "RESEARCHER_1",
            "ground_truth_method": "Synced_Video_Frame"
        }
