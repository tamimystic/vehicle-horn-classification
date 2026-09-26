# Vehicle Horn Acoustic Data Acquisition Suite
> **Project:** Standardized Acoustic Data Acquisition System for Vehicle Horn & Hydraulic Horn Research in Heterogeneous Traffic  
> **Objective:** Production-grade software suite for acquiring uncompressed raw audio (PCM WAV) and multidimensional metadata for deep learning classification benchmarks.

---

## Key Features

* **Flat Repository Architecture:** Self-contained within the root workspace without nested sub-projects or configuration splits.
* **Zero-DSP Raw Audio Capture (No AGC):** Bypasses all hardware automatic gain control, dynamic range compression, and software noise suppression to capture unadulterated 24-bit/16-bit linear PCM audio.
* **Pre-Trigger Rolling Ring Buffer:** Employs an in-memory circular buffer continuously storing audio. Triggering captures 1.0s pre-event and 2.0s post-event audio (3.0s total window), preventing loss of transient horn onset attacks.
* **One-Touch Hotkey Grid:** Instant one-click or keyboard shortcut (keys `1` to `9`) logging with microsecond RAM extraction and asynchronous disk export.
* **Dual Acquisition Interfaces (Desktop GUI + Mobile Web App):**
  1. **Desktop GUI:** High-speed real-time waveform oscilloscope and FFT spectrum analyzer.
  2. **Mobile Web & PWA:** Zero-cost field deployment directly from any smartphone browser with offline storage.

---

## File and Directory Architecture

```
vehicle horn classification/
├── main.py                     # Unified launcher (Desktop GUI, Web Server, CLI)
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation
├── HARDWARE_GUIDE.md           # Low-cost field hardware rig assembly guide
├── plan.md                     # Comprehensive academic research blueprint
├── system.md                   # System engineering & calibration manual
├── .gitignore                  # Git tracking exclusion rules
│
├── index.html                  # Mobile web app interface (PWA & GitHub Pages ready)
├── style.css                   # Mobile-first dark theme stylesheet
├── app.js                      # Browser audio ingestion engine & WAV encoder
├── standalone_collector.html   # Single-file standalone offline web collector
├── manifest.json               # Progressive Web App manifest
├── sw.js                       # Service worker for offline caching
├── icon-192.png, icon-512.png  # PWA application icons
├── run_desktop.bat             # One-click Windows desktop launcher
├── run_web.bat                 # One-click local web server launcher
├── build_app.py                # Standalone executable compiler (PyInstaller)
│
├── config/                     # Configuration definitions
│   ├── settings.py             # Global paths and audio acquisition parameters
│   └── taxonomy.json           # 9-class acoustic taxonomy & frequency bands
│
├── src/                        # Core Python application
│   ├── core/                   # Audio ingestion engine, circular buffer, DSP processor
│   ├── services/               # Event audio slicer & 28-field metadata logger
│   ├── ui/                     # Tkinter / PyQt GUI and real-time visualizers
│   └── utils/                  # Rotating file and console logger
│
├── tests/                      # Automated unit test suite
│   ├── test_ring_buffer.py     # Circular buffer boundary & wraparound tests
│   └── test_metadata.py        # Pydantic schema and storage integrity tests
│
├── data/                       # Acquired audio data store
│   └── 01_raw_field_recordings/
└── metadata/                   # Master metadata database (CSV & JSON)
    ├── metadata_master.csv
    └── metadata_master.json
```

---

## Usage Guide

### Option 1: Mobile Smartphone App (Field Data Acquisition)

> **Live Hosted Web App (Zero Configuration):**  
> Open on your smartphone browser (Chrome or Safari):  
> **https://tamimystic.github.io/vehicle-horn-classification/**
> - **Runs anywhere in the field:** Works over 4G/5G cellular data without needing your PC turned on.
> - **PWA Offline Support:** Tap **"Install App"** on the webpage to add an app icon to your phone screen. Works 100% offline without internet.

**To run the local web server on your computer:**  
Double-click `run_web.bat` or run:
```powershell
python main.py --web
```

---

### Option 2: Desktop GUI Application (Windows PC / Laptop)

**Method A: One-Click Desktop Launcher**  
Double-click `run_desktop.bat` in the project root folder.

**Method B: Command-Line Launch**
```powershell
python main.py
```

**Method C: Build Standalone Executable (`.exe`)**
```powershell
python build_app.py
```
This generates `dist/VehicleHornCollector/VehicleHornCollector.exe` using PyInstaller.

---

## Target Vehicle Horn Taxonomy

| Key | Class Name | Frequency Range | Legal Status |
|---|---|---|---|
| `1` | **Hydraulic Horn** (Air Banned) | 1,000 Hz – 8,000 Hz | **Illegal / Prohibited** |
| `2` | **Bus** (Air / Electric) | 400 Hz – 2,500 Hz | Legal / Standard |
| `3` | **Truck** / Heavy Lorry | 200 Hz – 1,500 Hz | Legal / Standard |
| `4` | **Private Car** / SUV | 400 Hz – 800 Hz | Legal / Standard |
| `5` | **Motorcycle** | 500 Hz – 3,000 Hz | Legal / Standard |
| `6` | **CNG Auto-rickshaw** | 800 Hz – 3,500 Hz | Legal / Standard |
| `7` | **Easybike** / Leguna | 600 Hz – 3,000 Hz | Regulated |
| `8` | **Rickshaw Bell** / Bulb | 1,500 Hz – 6,000 Hz | Legal / Standard |
| `9` | **Background Traffic Noise** | 20 Hz – 20,000 Hz | Ambient Negative Class |

---

## Verification & Automated Tests

To run the unit test suite:
```powershell
pytest tests/
```
All 6 tests verify ring buffer rollover integrity, memory management, and metadata schema validation.
