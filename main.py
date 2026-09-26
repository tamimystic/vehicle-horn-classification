"""
Vehicle Horn Acoustic Data Collector: Unified Application Entry Point
---------------------------------------------------------------------
Commands:
  python main.py                 -> Start the Desktop GUI application (PyQt6)
  python main.py --web           -> Start the Mobile/Web collector server
  python main.py --list-devices  -> List all audio recording hardware
"""
import sys
import os
import argparse
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import config
from src.utils.logger import logger

def parse_args():
    parser = argparse.ArgumentParser(description="Vehicle Horn Acoustic Data Acquisition Suite")
    parser.add_argument("--web", action="store_true", help="Launch the lightweight Mobile/Web collector server")
    parser.add_argument("--port", type=int, default=8000, help="Port to use for web server (default: 8000)")
    parser.add_argument("--list-devices", action="store_true", help="List all available audio input devices and exit")
    parser.add_argument("--device", type=int, default=None, help="Input device ID to use directly for GUI")
    return parser.parse_args()

def run_web_server(port: int):
    """Starts local web server serving the mobile web application."""
    import http.server
    import socketserver
    import socket

    def get_local_ip():
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('8.8.8.8', 1))
            ip = s.getsockname()[0]
        except Exception:
            ip = '127.0.0.1'
        finally:
            s.close()
        return ip

    local_ip = get_local_ip()
    os.chdir(PROJECT_ROOT)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    print("\n" + "=" * 65)
    print("  🚀 Vehicle Horn Web/Mobile Collector Server")
    print("=" * 65)
    print(f"\n1. Local PC access:   http://localhost:{port}")
    print(f"2. Local WiFi access: http://{local_ip}:{port}")
    print("\nOr open 'standalone_collector.html' directly in your browser.")
    print("Press Ctrl + C to stop the server.\n" + "=" * 65 + "\n")

    with socketserver.TCPServer(("", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

def main():
    args = parse_args()

    # 1. Web server mode
    if args.web:
        run_web_server(args.port)
        return

    # 2. Hardware check mode
    if args.list_devices:
        try:
            from src.core.audio_engine import AudioEngine
            print("\n--- Available Audio Input Devices ---")
            devices = AudioEngine.list_input_devices()
            if not devices:
                print("No audio input devices found.")
            for dev in devices:
                print(f"ID [{dev['id']}]: {dev['name']} (Channels: {dev['channels']}, Default SR: {dev['default_samplerate']} Hz)")
            print("-------------------------------------\n")
        except ImportError as e:
            print(f"\n[Warning] Audio driver dependency missing: {e}")
            print("Please run: pip install -r requirements.txt\n")
        sys.exit(0)

    # 3. Check Desktop GUI dependencies
    try:
        from PyQt6 import QtWidgets
        import sounddevice
        import soundfile
        import pyqtgraph
    except ImportError as e:
        print("\n" + "=" * 65)
        print("  Vehicle Horn Collector: Missing Desktop GUI Dependencies")
        print("=" * 65)
        print(f"Required package missing: {e.name if hasattr(e, 'name') else e}")
        print("\nTo install desktop dependencies, run:")
        print("    pip install -r requirements.txt")
        print("\nOr to run the zero-install Mobile/Web version, run:")
        print("    python main.py --web")
        print("    (Or double-click 'standalone_collector.html' in your browser)")
        print("=" * 65 + "\n")
        sys.exit(1)

    from src.core.audio_engine import AudioEngine
    from src.services.metadata_service import MetadataService
    from src.services.recorder_service import RecorderService
    from src.ui.main_window import MainWindow

    logger.info("Initializing Vehicle Horn Data Collector Application...")
    config.ensure_directories()

    # Initialize Services
    audio_engine = AudioEngine()
    metadata_service = MetadataService()
    recorder_service = RecorderService(audio_engine, metadata_service)

    # Start Audio Engine
    try:
        audio_engine.start(device_id=args.device)
    except Exception as e:
        logger.error(f"Failed to start audio engine: {e}", exc_info=True)
        print(f"\n[Error] Could not initialize audio device: {e}\nTry running 'python main.py --list-devices' to select a valid ID.\n")

    # Launch Desktop GUI
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow(audio_engine, recorder_service, metadata_service)
    window.show()

    exit_code = app.exec()
    audio_engine.stop()
    sys.exit(exit_code)

if __name__ == '__main__':
    main()
