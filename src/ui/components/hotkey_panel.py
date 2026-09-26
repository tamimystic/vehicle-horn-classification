from typing import List, Dict, Any, Callable
from PyQt6 import QtWidgets, QtCore, QtGui

class HotkeyPanel(QtWidgets.QGroupBox):
    def __init__(self, classes_data: List[Dict[str, Any]], on_class_triggered: Callable[[Dict[str, Any]], None], parent=None):
        super().__init__("One-Touch Event Logger (Keys 1-9)", parent)
        self.classes_data = classes_data
        self.on_class_triggered = on_class_triggered
        self.buttons = {}
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QGridLayout(self)
        layout.setSpacing(8)
        for idx, c in enumerate(self.classes_data):
            k, name, color = c["key_shortcut"], c["display_name"], c.get("color", "#89b4fa")
            btn = QtWidgets.QPushButton(f"[{k}] {name}")
            btn.setMinimumHeight(45)
            btn.setFont(QtGui.QFont("Segoe UI", 11, QtGui.QFont.Weight.Bold))
            btn.setStyleSheet(f"QPushButton {{ background-color: #313244; color: {color}; border: 2px solid {color}; border-radius: 6px; text-align: left; padding-left: 12px; }} QPushButton:hover {{ background-color: {color}; color: #11111b; }} QPushButton:pressed {{ background-color: #ffffff; color: #000000; }}")
            btn.clicked.connect(lambda checked, info=c: self.on_class_triggered(info))
            self.buttons[k] = btn
            layout.addWidget(btn, idx // 3, idx % 3)

    def flash_button(self, key_shortcut: str):
        if key_shortcut in self.buttons:
            btn = self.buttons[key_shortcut]
            orig_style = btn.styleSheet()
            btn.setStyleSheet("background-color: #ffffff; color: #000000; font-weight: bold; border-radius: 6px;")
            QtCore.QTimer.singleShot(150, lambda: btn.setStyleSheet(orig_style))
