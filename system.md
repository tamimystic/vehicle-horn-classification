# System Engineering & Build Manual: Acoustic Data Acquisition System
> **Project:** Standardized Multimodal Acoustic Acquisition Rig & Software Suite for Vehicle Horns  
> **Documentation:** Hardware Assembly, Software Development, Acoustic Calibration, and Field Standard Operating Procedures (SOP).  
> **Objective:** Deliver a reproducible, calibrated, peer-reviewed journal-grade data acquisition system.

---

## Table of Contents
1. [System Architecture & Engineering Philosophy](#1-system-architecture--engineering-philosophy)
2. [Section 1: Hardware Rig Components & Mechanical Assembly](#section-1-hardware-rig-components--mechanical-assembly)
3. [Section 2: Acoustic Calibration & Gain Calibration Protocol](#section-2-acoustic-calibration--gain-calibration-protocol)
4. [Section 3: Software System Architecture (Audio Engine & Services)](#section-3-software-system-architecture)
5. [Section 4: Bench & Pilot Testing Verification](#section-4-bench--pilot-testing-verification)
6. [Section 5: Field Standard Operating Procedures (SOP)](#section-5-field-standard-operating-procedures-sop)

---

## 1. System Architecture & Engineering Philosophy

Scientific validity in acoustic classification depends on capture integrity. The system consists of two complementary pillars:
1. **Calibrated Physical Rig:** Fixed-frame mechanical setup housing directional acoustic sensors, decibel reference meters, ground-truth visual verification cameras, and zero-DSP audio digitizers.
2. **Deterministic Software Engine:** Real-time acquisition software maintaining a circular in-memory ring buffer, enabling microsecond latency extraction of pre-trigger and post-trigger audio windows tied to multidimensional metadata.

```
                       +--------------------------------------------------+
                       |              ACOUSTIC HARDWARE RIG               |
                       |                                                  |
  Vehicle Horn Event --+-> [ Directional Shotgun Mic + Deadcat Furry ]    |
  in Real Traffic      |          | (Unbalanced / Balanced Analog Audio)  |
                       |          v                                       |
                       |   [ Low-Noise Audio Interface / ADC ]            |
                       |          | (24-bit / 48 kHz PCM, Fixed Gain)     |
                       |          |                                       |
                       |   [ Ground-Truth Video Camera (1080p) ]          |
                       |          | (Synchronized Visual Proof)           |
                       |          |                                       |
                       |   [ Sound Level Meter (Class 2 SLM dBA) ]        |
                       |          | (Reference Physical SPL)              |
                       +----------+---------------------------------------+
                                  |
                                  | (USB Cables)
                                  v
                       +--------------------------------------------------+
                       |         DATA ACQUISITION SOFTWARE ENGINE         |
                       |                                                  |
                       |   [ Low-latency Stream Ingestion (SoundDevice) ] |
                       |          |                                       |
                       |          v                                       |
                       |   [ 5-Second Circular Ring Buffer in RAM ]       |
                       |          |                                       |
                       |          v                                       |
                       |   [ Live Spectrum & Peak Level Monitor ]         |
                       |          |                                       |
                       |          +<--- [ User One-Touch Hotkey: 1 to 9 ] |
                       |          |                                       |
                       |          v                                       |
                       |   [ Synchronized Auto File & Metadata Exporter ] |
                       |          |                                       |
                       +----------+---------------------------------------+
                                  |
                                  v
        +---------------------------------------------------------+
        |                 RAW RESEARCH DATASTORE                  |
        |  - Master WAV Files: /data/01_raw_field_recordings/     |
        |  - Segmented Events: /data/02_segmented_events/         |
        |  - Ground Truth Log: /metadata/metadata_master.csv      |
        |  - Calibrated Reference SPL & Session Video Proofs      |
        +---------------------------------------------------------+
```

---

## Section 1: Hardware Rig Components & Mechanical Assembly

### 1.1 Hardware Specifications

| Component | Professional Tier (Tier 1) | Budget Tier (Tier 2) | Essential Specifications |
|---|---|---|---|
| **Acoustic Sensor** | Rode NTG2 / Audio-Technica AT875R | Boya BY-PVM1000 / Boya BY-MM1+ | Supercardioid/Shotgun, 20Hz–20kHz flat, SNR > 75dB |
| **Wind Protection** | High-density Synthetic Furry Deadcat | Boya Outdoor Windscreen | Furry deadcat mandatory; bare foam alone is insufficient |
| **Audio Interface / ADC** | Focusrite Scarlett Solo (4th Gen) | Behringer U-Phoria UM2 / UMC22 | 24-bit, 48 kHz, Flat preamps, Zero DSP/AGC compression |
| **Field Ground-Truth Camera** | 1080p Action Camera | Smartphone (1080p @ 60fps) / USB Cam | Minimum 1080p @ 30fps, wide angle optical axis |
| **Sound Level Meter (SLM)** | Testo 815 / Reed R8050 (Class 2) | UNI-T UT353 Sound Level Meter | Type 2 / Class 2, dBA scale, Fast 125ms response |
| **Tripod Frame** | 65" Heavy-duty Aluminum Tripod | Standard Tripod + Dual Cold-Shoe | Standard 1.50m height with shockmount decoupling |
| **Power Supply** | 20,000 mAh 65W PD Power Bank | 10,000 mAh 5V/2A Power Bank | Continuous field operation without ground loops |

---

### 1.2 Mechanical Assembly Protocol

```
                          [ Furry Deadcat Windshield ]
                                      │
                     [ Directional Shotgun Microphone ]
                                      │
                         [ Rubber Shock Mount ]
                                      │
             ┌────────────────────────┴────────────────────────┐
             │       Dual Cold-Shoe Aluminum Extension Bar     │
             └───────────┬─────────────────────────┬───────────┘
                         │                         │
            [ Ground-Truth Action Cam ]    [ Sound Level Meter (SLM) ]
                         │                         │
                         └────────────┬────────────┘
                                      │
                        [ Heavy-Duty Fluid Head ]
                                      │
                        [ 1.5m Adjustable Tripod ]
                                      │
                       [ Counter-weight Sandbag ]
```

1. **Shockmount Decoupling:** Mount the directional microphone inside a rubber elastomer shock mount rather than a rigid plastic clip. This isolates structure-borne chassis vibrations caused by heavy passing trucks.
2. **Dual Extension Bar:** Fasten a cold-shoe extension bar onto the tripod head. Center the acoustic sensor, with the optical camera on the left and the Sound Level Meter on the right.
3. **Windshield Installation:** Slide the foam wind baffle onto the capsule, followed by the high-density synthetic furry deadcat to break wind velocity gradients without attenuating high-frequency acoustic content.
4. **Elevation & Ballast:** Set tripod height to precisely **1.50 meters** above ground. Attach ballast weight to the center column hook to resist aerodynamic displacement from passing vehicles.

---

## Section 2: Acoustic Calibration & Gain Calibration Protocol

### 2.1 Headroom & Anti-Clipping Calibration
Vehicle horns produce intense transient acoustic events. Heavy bus horns produce 95–105 dBA at 5 meters, and illegal hydraulic air horns exceed 105–118 dBA.

```
  0 dBFS  ─── [ HARDWARE CLIPPING / SATURATION - CORRUPTED SAMPLES ]
 -3 dBFS  ─── Maximum Allowed Transient Peak
 -6 dBFS  ─── TARGET CALIBRATION CEILING (Nominal Operating Peak)
-18 dBFS  ─── RMS Level for Typical Standard Horns
-40 dBFS  ─── Ambient Traffic Noise Floor
-90 dBFS  ─── Digital Quiet Floor
```

1. Set interface analog gain knob to **approximately 30%–35% (10 to 11 o'clock position)**.
2. Generate an acoustic reference impulse at 5 meters.
3. Verify on the software meter that peak transient does not exceed **-6.0 dBFS**.
4. Lock the analog knob with tape to ensure static gain transfer throughout data collection.

### 2.2 Empirical SPL Calibration Formula
To translate raw digital RMS levels back into absolute Sound Pressure Level ($SPL$ in dBA):

$$SPL_{\text{estimated}} = RMS_{\text{dBFS}} + C_{\text{calib}}$$

Where $C_{\text{calib}}$ is determined by pairing simultaneous physical Sound Level Meter readings ($SPL_{\text{measured}}$) with digital RMS readings ($RMS_{\text{dBFS}}$) during baseline calibration:

$$C_{\text{calib}} = SPL_{\text{measured}} - RMS_{\text{dBFS}} \approx 112.4\text{ dB}$$

---

## Section 3: Software System Architecture

1. **Circular RAM Buffer (`src/core/ring_buffer.py`):** Pre-allocates a fixed array for 5 seconds of audio. Continuous ingestion writes in-place with thread-safe pointer wrapping, eliminating Python memory reallocations during event capture.
2. **Microsecond Triggering:** When a user taps a class button (e.g. `1` for Hydraulic Horn), the past 1.0 second and following 2.0 seconds (3.0s total) are sliced from RAM instantaneously.
3. **Asynchronous Writer Worker (`src/services/recorder_service.py`):** Disk I/O, 24-bit PCM WAV encoding, SHA-256 calculation, and CSV metadata logging execute on a separate daemon thread to ensure zero UI frame drops.
4. **Cross-Platform Delivery:** 
   - Desktop native GUI with Tkinter / PyQt support.
   - PWA web application with Service Worker offline caching for mobile smartphone use.

---

## Section 4: Bench & Pilot Testing Verification

Before field deployment, execute:
```powershell
pytest tests/
```
All tests verify circular buffer boundary conditions, non-blocking disk export, and Pydantic metadata schema integrity.

---

## Section 5: Field Standard Operating Procedures (SOP)

1. **Pre-Deployment:** Ensure batteries are charged, deadcat windshield is fitted, and storage drives have sufficient capacity.
2. **Site Positioning:** Set tripod 5 meters from vehicle line-of-travel, at 45° angle to traffic flow, at 1.50m height.
3. **Environmental Logging:** Record ambient temperature, humidity, and baseline noise floor before recording.
4. **Trigger Protocol:** Tap the corresponding class hotkey immediately when a vehicle horn is actuated.
5. **Session Wrap-Up:** Export CSV metadata, verify sample counts, and inspect recorded WAV files for zero digital clipping.
