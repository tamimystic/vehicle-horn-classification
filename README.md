# Vehicle Horn Acoustic Data Acquisition Suite
> **Project:** Standardized Acoustic Data Acquisition System for Vehicle Horn & Hydraulic Horn Research in Heterogeneous Traffic  
> **Objective:** Production-grade software suite for acquiring uncompressed raw audio (PCM WAV), vehicle plate imagery, and multidimensional metadata for deep learning classification benchmarks.

---

## Key Features

* **Flat Repository Architecture:** Self-contained within the root workspace without nested sub-projects or configuration splits.
* **Zero-DSP Raw Audio Capture (No AGC):** Bypasses all hardware automatic gain control, dynamic range compression, and software noise suppression to capture unadulterated 24-bit/16-bit linear PCM audio.
* **Dual-Layer Dataset Hierarchy:**
  - **Layer A (Class-Level Raw):** `Dataset/Raw_By_Class/<VehicleClass>/` for global sequential class-balanced model training.
  - **Layer B (Instance-Level Structured):** `Dataset/Instances_By_Vehicle/<VehicleClass>/<Model>_<PlateNumber>/` for vehicle-specific `GroupKFold` cross-validation preventing data leakage.
  - **Photo Layer:** `Dataset/Vehicle_Photos/` for multimodal license plate image tracking.
* **Standard 7-Parameter Filename Convention:**
  `[SampleID]_[InstanceID]_[Location]_[Distance]_[VehicleClass]_[VehicleModel]_[VehiclePlate]_[Timestamp].wav`
* **Dual Recording Modes:**
  1. **Tap Mode:** Tap button to start, tap again to stop.
  2. **Hold Mode:** Press and hold button while horn sounds, release to stop (Pointer Capture stabilized).
* **In-App Quality Review & Playback:** Listen to the recorded clip immediately before saving; discard corrupted/windy clips without polluting dataset sequence counters.
* **Zero-Latency Microphone Pre-Arming:** Standby loop pre-authorizes the audio hardware pipeline for 0ms onset latency.
* **Direct File System Auto-Saving & Offline Standalone ZIP Export:**
  - Direct folder writing on Desktop via File System Access API.
  - Client-side IndexedDB persistence and instant zero-dependency dual-layer ZIP generation on mobile phones.

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
├── sw.js                       # Service worker for offline caching (v2)
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
│   ├── services/               # Event audio slicer & relational metadata logger
│   ├── ui/                     # Tkinter / PyQt GUI and real-time visualizers
│   └── utils/                  # Rotating file and console logger
│
├── tests/                      # Automated unit test suite
│   ├── test_dual_layer.py      # Dual-layer file routing & 7-parameter filename tests
│   ├── test_ring_buffer.py     # Circular buffer boundary & wraparound tests
│   └── test_metadata.py        # Pydantic schema and storage integrity tests
│
├── Dataset/                    # Standardized structured dataset
│   ├── Raw_By_Class/           # Layer A: Class-level global sequences
│   ├── Instances_By_Vehicle/   # Layer B: Vehicle-specific instance folders
│   ├── Vehicle_Photos/         # Dedicated vehicle and license plate photos
│   └── metadata.csv            # Master dataset relational catalog
│
└── metadata/                   # Legacy metadata archives
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

## Verification & Testing

Run the automated test suite:
```powershell
pytest tests/
```
All tests verify zero buffer truncation, metadata schema constraints, dual-layer folder routing, and 7-parameter filename adherence.
