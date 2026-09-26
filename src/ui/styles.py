"""
Modern Catppuccin Mocha Dark Theme Stylesheet for PyQt6
"""

THEME_STYLESHEET = """
QMainWindow {
    background-color: #1e1e2e;
}

QWidget {
    color: #cdd6f4;
    font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
}

QGroupBox {
    font-weight: bold;
    border: 1px solid #45475a;
    border-radius: 8px;
    margin-top: 10px;
    padding-top: 15px;
    background-color: #181825;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    left: 12px;
    padding: 0 5px;
    color: #89b4fa;
}

QLabel {
    color: #cdd6f4;
}

QLineEdit, QComboBox, QDoubleSpinBox, QSpinBox {
    background-color: #313244;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 6px 10px;
    color: #cdd6f4;
    selection-background-color: #89b4fa;
    selection-color: #11111b;
}

QLineEdit:focus, QComboBox:focus, QDoubleSpinBox:focus {
    border: 1px solid #89b4fa;
}

QPushButton {
    background-color: #313244;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 8px 14px;
    color: #cdd6f4;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #45475a;
    border: 1px solid #89b4fa;
}

QPushButton:pressed {
    background-color: #89b4fa;
    color: #11111b;
}

QStatusBar {
    background-color: #11111b;
    border-top: 1px solid #313244;
    color: #a6adc8;
}

QScrollBar:vertical {
    border: none;
    background: #181825;
    width: 10px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background: #45475a;
    min-height: 20px;
    border-radius: 5px;
}

QScrollBar::handle:vertical:hover {
    background: #585b70;
}
"""
