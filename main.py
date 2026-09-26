import sys
import os
import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import config
from src.utils.logger import logger

def parse_args():
    parser = argparse.ArgumentParser(description="Vehicle Horn Acoustic Data Acquisition Suite")
    parser.add_argument("--web", action="store_true", help="Launch web collector server")
    parser.add_argument("--port", type=int, default=8000, help="Port for web server (default: 8000)")
    parser.add_argument("--list-devices", action="store_true", help="List audio input devices and exit")
    parser.add_argument("--device", type=int, default=None, help="Input device ID")
    return parser.parse_args()

def run_web_server(port: int):
    import http.server
    import socketserver
    import socket

    def get_local_ip():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('8.8.8.8', 1))
            return s.getsockname()[0]
        except Exception:
            return '127.0.0.1'
        finally:
            s.close()

    local_ip = get_local_ip()
    os.chdir(PROJECT_ROOT)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    print(f"\nVehicle Horn Collector Web Server:\n- Online/Mobile (Zero Setup): https://tamimystic.github.io/vehicle-horn-classification/\n- Local PC:   http://localhost:{port}\n- Local Wi-Fi: http://{local_ip}:{port}\nPress Ctrl+C to stop.\n")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            sys.exit(0)

def main():
    args = parse_args()
    if args.web:
        run_web_server(args.port)
        return

    if args.list_devices:
        from src.core.audio_engine import AudioEngine
        devices = AudioEngine.list_input_devices()
        print("\n--- Audio Input Devices ---")
        for dev in devices:
            print(f"[{dev['id']}] {dev['name']} (Channels: {dev['channels']}, SR: {dev['default_samplerate']} Hz)")
        print("---------------------------\n")
        return

    from src.core.audio_engine import AudioEngine
    from src.services.metadata_service import MetadataService
    from src.services.recorder_service import RecorderService

    config.ensure_directories()
    audio_engine = AudioEngine()
    metadata_service = MetadataService()
    recorder_service = RecorderService(audio_engine, metadata_service)

    try:
        audio_engine.start(device_id=args.device)
    except Exception as e:
        logger.warning(f"Audio start notice: {e}")

    try:
        from PyQt6 import QtWidgets
        from src.ui.main_window import MainWindow
        app = QtWidgets.QApplication(sys.argv)
        win = MainWindow(audio_engine, recorder_service, metadata_service)
        win.show()
        code = app.exec()
        audio_engine.stop()
        sys.exit(code)
    except ImportError:
        from src.ui.tk_window import TkMainWindow
        win = TkMainWindow(audio_engine, recorder_service, metadata_service)
        win.run()

if __name__ == '__main__':
    main()
