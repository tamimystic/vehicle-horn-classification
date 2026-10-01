# Vehicle Horn Acoustic Data Acquisition Suite

## Live Web Application & Mobile PWA Field Collector
### [https://tamimystic.github.io/vehicle-horn-classification/](https://tamimystic.github.io/vehicle-horn-classification/)
*(Zero setup required. Open directly in Chrome or Safari on any smartphone or computer to capture, review, and export acoustic data.)*

* **Interactive User Manual:** [https://tamimystic.github.io/vehicle-horn-classification/docs.html](https://tamimystic.github.io/vehicle-horn-classification/docs.html)
* **GitHub Repository:** [https://github.com/tamimystic/vehicle-horn-classification](https://github.com/tamimystic/vehicle-horn-classification)

---

## Abstract & Research Objective

Urban traffic in developing metropolitan regions such as Dhaka, Bangladesh represents one of the most acoustically dense and chaotic soundscapes in the world. High-volume, non-lane-based traffic comprised of buses, commercial trucks, motorized three-wheelers, private vehicles, motorcycles, and human-powered rickshaws creates persistent acoustic noise levels that routinely exceed safe environmental standards (frequently surpassing 105 dBA to 120 dBA). Among these sound sources, prohibited multi-tone pneumatic "hydraulic" horns present a severe public health hazard and statutory violation.

To train, benchmark, and deploy automated acoustic classification models (such as Audio Spectrogram Transformers, Convolutional Neural Networks, and edge micro-controllers), researchers require high-fidelity, standardized empirical acoustic datasets. Conventional consumer audio recording software fails catastrophically in this task: native smartphone operating systems apply non-linear dynamic range compression (DRC), aggressive automatic gain control (AGC), and frequency-selective noise suppression that mutilate attack transients and distort spectral harmonics.

The **Vehicle Horn Acoustic Data Acquisition Suite** is a zero-cost, laboratory-grade software instrument engineered to acquire unadulterated, linear 16-bit and 24-bit PCM WAV audio, synchronized vehicle registration plate imagery, and multidimensional tabular metadata directly from commodity mobile hardware and field laptop rigs.

---

## System Architecture & Key Engineering Innovations

### 1. Zero-DSP Linear Audio Pipeline
Bypasses all software automatic gain control, dynamic range compression, and acoustic echo cancellation via low-level Web Audio API and PortAudio bindings:
```
Acoustic Transducer -> Unprocessed ADC Stream -> ScriptProcessor / Circular RAM -> 16/24-Bit Linear PCM WAV
```
This preserves the full Attack-Sustain-Decay-Release (ADSR) envelope, true peak decibels relative to full scale (dBFS), and raw spectral energy distribution.

### 2. Zero-Latency Microphone Pre-Arming
Field horn blasts occur abruptly with attack transients lasting under 50 milliseconds. Traditional recorders suffer from 500ms to 1500ms driver latency when initializing audio streams. The suite features a dedicated pre-arming standby loop: activating `Arm Mic (0ms)` maintains a live, zero-allocation circular buffer and real-time dBFS monitoring, enabling instantaneous sample ingestion the microsecond a horn sounds.

### 3. Dual Hardware-Stabilized Recording Modes
Field researchers face diverse physical constraints (e.g., roadside traffic glare, vehicle speed, one-handed grip):
* **Tap Mode (Toggle):** Tap once to commence recording; tap again to terminate. Ideal for sustained commercial air horns and relaxed handheld observation.
* **Hold Mode (Push-to-Talk):** Press and hold the primary thumb-zone button; release immediately when the horn terminates. Stabilized with Pointer Capture API (`setPointerCapture`) so that physical finger movement or screen moisture does not drop recording state.
* **Tactile Haptic Feedback:** Physical vibration pulses confirm trigger events without requiring visual gaze diversion from oncoming traffic (40ms onset pulse, double 30ms termination pulse).

### 4. Human-in-the-Loop Quality Review & Rejection
To protect dataset integrity from ambient contamination (e.g., pedestrian speech, sudden wind gusts, mechanical collisions), no recording is committed to storage automatically. An in-app audio player renders the captured clip immediately, allowing researchers to evaluate signal-to-noise ratio (SNR) and commit or discard the clip without corrupting global indexing counters.

### 5. Dual-Layer Dataset Hierarchy & Anti-Leakage Architecture
A critical flaw in acoustic machine learning research is **Data Leakage**: when multiple horn blasts from the exact same vehicle chassis are randomly partitioned across training and evaluation splits, models memorize vehicle-specific engine harmonics or microphone placement characteristics rather than generalized horn acoustics. To enforce strict `GroupKFold` cross-validation, the suite organizes recordings into two concurrent physical layers:
* **Layer A (Class-Level Raw):** `Dataset/Raw_By_Class/<VehicleClass>/` contains all clips organized by acoustic class and indexed sequentially via a global identifier (`BDHORN_0001`, `BDHORN_0002`).
* **Layer B (Instance-Level Structured):** `Dataset/Instances_By_Vehicle/<VehicleClass>/<Model>_<PlateNumber>/` aggregates all recordings belonging to that specific physical vehicle, indexing them by both the global identifier and an instance-local counter (`S01`, `S02`).
* **Segregated Photo Layer:** `Dataset/Vehicle_Photos/` stores high-resolution vehicle and license plate photographs named with identical base identifiers to eliminate non-audio file clutter inside acoustic training folders.

### 6. Standard Filename Architecture
Every audio file and photograph encodes its complete contextual provenance in its filename matching UI form field sequence:
```
[SampleID]_[InstanceID]_[VehicleClass]_[VehicleModel]_[LicensePlate]_[Distance]_[Side]_[Location]_[Timestamp].wav
```
*Example Audio:* `BDHORN_0001_S01_Bus_HinoAK1J_DhakaMetroBa148923_5.0m_Front_GabtoliTerminal_20260929_003500.wav`  
*Example Photo:* `BDHORN_0001_S01_Bus_HinoAK1J_DhakaMetroBa148923_5.0m_Front_GabtoliTerminal_20260929_003500.jpg`

### 7. Dual Export Engine: Direct Disk Writing & Standalone ZIP
* **Direct File System Access API:** Chromium-based browsers on laptops and Android allow binding a target directory directly. Committing a sample writes dual-layer files and appends to `metadata.csv` on the physical drive with zero download popups.
* **Offline IndexedDB & Pure JS ZIP Generator:** iOS Safari and field mobile devices cache all audio blobs, images, and tabular rows in an internal IndexedDB database (`BDHornCollectorDB`). At the end of a shift, a zero-dependency Store-mode PKZip generator compiles the complete dual-layer folder hierarchy into an export archive (`BDHORN_Dataset_Export_[Timestamp].zip`).

### 8. Live Optical Rangefinder, Sensor Fusion & Acoustic Directivity
Sound pressure level follows the Inverse-Square Law: a 20% error in distance measurement distorts energy calibration by ~1.94 dB. To provide authentic, peer-reviewed measurement accuracy without manual measuring tapes, the suite features a real-time **Live Optical Rangefinder**:
* **Inclinometer Tilt Trigonometry:** Measures device depression pitch angle relative to the horizon (`d = h / tan(theta)` where `h` is calibrated observer height, default 1.40m at chest/eye level) when aimed at vehicle ground-contact tire baselines.
* **Stadiametric Pinhole Photogrammetry:** Cross-references camera horizontal field of view with standardized vehicle metric dimensions (e.g., Bus = 2.50m, Car = 1.75m, BRTA License Plate = 0.52m).
* **Inverse-Variance Sensor Fusion:** Fuses both modalities to produce a continuous metric distance reading along with a computed uncertainty bound (`+/- Delta d`) and statistical confidence score (`Confidence %`).
* **Acoustic Azimuth / Directivity Tracking:** Records directivity orientation (`Front 0 deg Direct Axis`, `Right Side 90 deg`, `Rear 180 deg Shielded`, `Left Side 270 deg`) to capture spatial radiation variations without biasing baseline classification models.
* **Auto-Lock & Snap on Record:** Triggering audio recording automatically freezes the instantaneous rangefinder distance and captures a synchronized high-resolution vehicle photo.

### 9. Controlled In-Situ Stationary Vehicle Protocol
Rather than chasing high-speed vehicles in moving traffic, researchers operate via **Controlled In-Situ Acquisition**:
1. Station at traffic signals, passenger halts, bus terminals, or rickshaw stands.
2. Request the driver while stationary: *"Bhai, amra research er jonno apnar vehicle er horn sound ta record korte chachhi, ektu horn ta bajaben?"*
3. Stand directly in front of the vehicle (0 deg Azimuth, 2m to 5m distance) aiming the live camera crosshair at the front bumper/tires.
4. When the driver honks, tap Record. The system locks distance, captures the photo, and records uncompressed audio in a single synchronized operation.
5. Tap Stop when the horn ceases, verify clip quality in the player, and commit.

---

## Standardized 7-Class Acoustic Taxonomy

The taxonomy reflects the empirical vehicle distribution of Bangladesh roadways as standardized in `config/taxonomy.json`:

| Class ID | Class Name | Display Label | Dominant Frequency | Legal / Regulatory Status | Acoustic Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C01** | `Bus` | Bus (Air / Electric) | 300 - 2500 Hz | Legal Standard | Transit and intercity bus pneumatic air or high-pitch electric horn. |
| **C02** | `Truck` | Truck / Heavy Lorry | 200 - 1500 Hz | Legal Standard | Deep resonant electric or low-frequency pneumatic horn. |
| **C03** | `Private_Car` | Private Car / SUV | 400 - 800 Hz | Legal Standard | Dual-disc harmonic snail horn pair on sedans, microbuses, and SUVs. |
| **C04** | `Motorcycle` | Motorcycle | 1500 - 3500 Hz | Legal Standard | Single-disc high-frequency electric diaphragm horn. |
| **C05** | `Autorickshaw` | CNG Auto-rickshaw | 800 - 2500 Hz | Legal Standard | Sharp piercing electromagnetic buzzer on 4-stroke 3-wheelers. |
| **C06** | `Rickshaw_Bell` | Rickshaw Bell (Metallic Chime) | 3000 - 6000 Hz | Legal Standard | Dual metallic chime ("Tung-Tung") on cycle rickshaws. |
| **C07** | `Background_Traffic_Noise` | Background Traffic Noise | 20 - 20000 Hz | Ambient Negative | Congestion rumble, engine idle, tire friction without horn events. |

---

## Repository Directory Architecture

```
vehicle horn classification/
├── main.py                     # Unified entrypoint (Tkinter/PyQt6 GUI, Web Server, CLI)
├── requirements.txt            # Python dependencies (sounddevice, soundfile, pydantic, etc.)
├── README.md                   # Primary system and research documentation
├── HARDWARE_GUIDE.md           # Field acoustic rig assembly and calibration specifications
├── plan.md                     # Comprehensive academic research roadmap
├── system.md                   # Engineering calibration and measurement manual
├── .gitignore                  # Git tracking exclusion rules (ignores raw binaries, tracks structure)
│
├── index.html                  # Mobile web app interface (PWA & GitHub Pages ready)
├── docs.html                   # Comprehensive standalone user manual and operations guide
├── style.css                   # Responsive dark-theme stylesheet
├── app.js                      # Web Audio API engine, IndexedDB manager, ZIP generator
├── standalone_collector.html   # Single-file bundled offline HTML tool
├── manifest.json               # Progressive Web App manifest definition
├── sw.js                       # Service worker for offline asset caching (v2)
├── icon-192.png, icon-512.png  # PWA application iconography
├── run_desktop.bat             # One-click Windows desktop launcher
├── run_web.bat                 # One-click local web server launcher
├── build_app.py                # Standalone Windows executable compiler (PyInstaller)
├── VehicleHornCollector.spec   # PyInstaller build specification
│
├── config/                     # Configuration definitions
│   ├── settings.py             # Global paths, audio sample rates, buffer thresholds
│   └── taxonomy.json           # Formal 7-class acoustic taxonomy definitions
│
├── src/                        # Core Python application package
│   ├── core/                   # Audio engine, circular ring buffer, DSP filter suite
│   ├── services/               # Dual-layer file exporter and metadata service
│   ├── ui/                     # Desktop graphical interfaces
│   │   ├── tk_window.py        # Native zero-dependency Tkinter interface
│   │   ├── main_window.py      # High-performance PyQt6 interface
│   │   ├── styles.py           # Desktop styling definitions
│   │   └── components/         # PyQt6 visualizer widgets and session panels
│   └── utils/                  # Rotating logging utilities
│
├── tests/                      # Automated unit test suite
│   ├── test_dual_layer.py      # Dual-layer directory routing & 9-parameter filename validation
│   ├── test_ring_buffer.py     # Circular memory buffer boundary and wraparound safety
│   └── test_metadata.py        # Pydantic schema validation and persistence integrity
│
├── Dataset/                    # Standardized Dual-Layer Research Dataset Store
│   ├── Raw_By_Class/           # Layer A: Global sequential class folders
│   │   ├── Bus/
│   │   ├── Truck/
│   │   └── ...
│   ├── Instances_By_Vehicle/   # Layer B: Vehicle-specific instance folders
│   │   ├── Bus/
│   │   │   └── HinoAK1J_DhakaMetroBa148923/
│   │   └── ...
│   ├── Vehicle_Photos/         # Multimodal photographic registry
│   └── metadata.csv            # Master relational catalog
│
└── metadata/                   # Legacy metadata archives
    ├── metadata_master.csv
    └── metadata_master.json
```

---

## Operations Guide

### 1. Mobile Smartphone Deployment (Field Acquisition)

**Option A: Hosted Web Application (Zero Installation)**  
Navigate to: **[https://tamimystic.github.io/vehicle-horn-classification/](https://tamimystic.github.io/vehicle-horn-classification/)**  
1. Open in Google Chrome (Android) or Safari (iOS).
2. Tap **"Install App"** to add the tool to your home screen as a standalone Progressive Web App.
3. Tap **"Arm Mic (0ms)"** once to pre-authorize hardware capture.
4. Input location, distance, vehicle class, vehicle model, and license plate.
5. Tap **"Snap Photo"** to record vehicle visual evidence.
6. Trigger recordings using **Tap Mode** or **Hold Mode**.
7. Audit the clip in the review player, then click **"Save Audio & Photo"**.
8. At the conclusion of a session, click **"Export ZIP"** to download the complete dual-layer dataset.

**Option B: Local Machine Web Server**  
Launch a local server accessible by any device on the local Wi-Fi network:
```powershell
python main.py --web
```
Or double-click `run_web.bat`.

---

### 2. Desktop Workstation Deployment (Laptop Rig)

**Method A: One-Click Desktop Launcher**  
Double-click `run_desktop.bat` in the repository root.

**Method B: Command-Line Launch**
```powershell
python main.py
```

**Method C: Compile Standalone Executable (.exe)**  
To package a standalone executable for field laptops without Python installed:
```powershell
python build_app.py
```
The compiled application is generated in `dist/VehicleHornCollector/VehicleHornCollector.exe`.

---

## Verification & Automated Test Suite

The test suite validates data structures, circular buffer wraparound logic, schema boundaries, and dual-layer export integrity:
```powershell
pytest tests/
```
All 7 unit tests must report clean passes prior to committing dataset modifications.

---

## Master Metadata Specification (`metadata.csv`)

| Header Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `sample_id` | String | Unique sequential dataset identifier | `BDHORN_0001` |
| `instance_id` | String | Vehicle-specific sample counter | `S01` |
| `filename` | String | Standard 9-parameter WAV filename | `BDHORN_0001_S01_Bus_Hino_AK1J_DhakaMetro-Ba-14-8923_5.0m_Front_Gabtoli_20260929.wav` |
| `audio_filename` | String | Database alias for file resolution | `BDHORN_0001_S01_Bus_Hino_AK1J_DhakaMetro-Ba-14-8923_5.0m_Front_Gabtoli_20260929.wav` |
| `photo_filename` | String | Matching photograph filename | `BDHORN_0001_S01_Bus_Hino_AK1J_DhakaMetro-Ba-14-8923_5.0m_Front_Gabtoli_20260929.jpg` |
| `vehicle_class` | String | Target category from 7-class taxonomy | `Bus` |
| `vehicle_model` | String | Vehicle manufacturer chassis / model | `Hino_AK1J` |
| `license_plate` | String | Official vehicle registration number | `DhakaMetro-Ba-14-8923` |
| `distance_m` | String | Distance between transducer and vehicle | `5.0m` |
| `recording_side` | String | Acoustic incidence perspective (Front/Left/Right/Back) | `Front` |
| `location` | String | Site name or GPS coordinate string | `Gabtoli_Terminal` |
| `duration_sec` | Float | Natural clip length in seconds | `1.84` |
| `peak_dbfs` | Float | True peak instantaneous amplitude | `-3.45` |
| `rms_dbfs` | Float | True root-mean-square amplitude | `-14.20` |
| `sample_rate` | Integer | Sampling frequency in Hertz | `48000` |
| `timestamp` | ISO 8601 | Universal UTC acquisition timestamp | `2026-09-29T00:35:00.000Z` |

---

## Ethical Statement & Licensing

* **Acoustic Privacy:** In accordance with acoustic privacy standards, microphone gains and measurement distances are calibrated specifically for high-amplitude vehicular signaling (>85 dBA). Human speech in public rights-of-way falls below the dynamic quantization threshold of the measurement rig.
* **Photographic Integrity:** Vehicle registration photographs are collected strictly for research verification of vehicle class and physical horn positioning under the academic fair-use doctrine.
* **Software License:** Released under the MIT Open Source License. Academic publications utilizing this software suite or resulting datasets should cite this repository.
