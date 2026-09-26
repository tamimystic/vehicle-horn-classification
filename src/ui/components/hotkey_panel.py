"""
One-Touch Hotkey Class Panel (Keys 1-9 Grid with Interactive Buttons)
"""
from PyQt6 import QtWidgets, QtCore, QtGui
from typing import List, Dict, Any, Callable

class HotkeyPanel(QtWidgets.QGroupBox):
    """
    Grid of buttons for the 9 target classes.
    Clicking a button or pressing hotkeys 1-9 triggers event capture.
    """
    def __init__(self, classes_data: List[Dict[str, Any]],
                 on_class_triggered: Callable[[Dict[str, Any]], None], parent=None):
        super().__init__("One-Touch Event Logger (Press Keyboard 1 to 9 or Click Buttons)", parent)
        self.classes_data = classes_data
        self.on_class_triggered = on_class_triggered
        self.buttons = {}
        self.init_ui()

    def init_ui(self):
        layout = QtWidgets.QGridLayout(self)
        layout.setSpacing(8)

        for idx, c in enumerate(self.classes_data):
            key = c["key_shortcut"]
            display_name = c["display_name"]
            color = c.get("color", "#89b4fa")
            class_id = c["class_id"]

            btn = QtWidgets.QPushButton(f"[{key}] {display_name}")
            btn.setMinimumHeight(45)
            btn.setFont(QtGui.QFont("Segoe UI", 11, QtGui.QFont.Weight.Bold))
            btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: #313244;
                    color: {color};
                    border: 2px solid {color};
                    border-radius: 6px;
                    text-align: left;
                    padding-left: 12px;
                }}
                QPushButton:hover {{
                    background-color: {color};
                    color: #11111b;
                }}
                QPushButton:pressed {{
                    background-color: #ffffff;
                    color: #000000;
                }}
            """)
            
            # Connect click handler
            btn.clicked.connect(lambda checked, info=c: self.on_class_triggered(info))
            self.buttons[key] = btn

            row = idx // 3
            col = idx % 3
            layout.addWidget(btn, row, col)

    def flash_button(self, key_shortcut: str):
        """Flashes button visually when triggered via keyboard."""
        if key_shortcut in self.buttons:
            btn = self.buttons[key_shortcut]
            orig_style = btn.styleSheet()
            btn.setStyleSheet("background-color: #ffffff; color: #000000; font-weight: bold; border-radius: 6px;")
            QtCore.QTimer.singleShot(150, lambda: btn.setStyleSheet(orig_style))
