# Low-Cost Hardware Procurement & Rig Assembly Guide
> **Project:** Vehicle Horn Acoustic Data Acquisition Rig  
> **Target Budget:** ~$65 – $100 USD (Student & University Research Lab Budget)  
> **Objective:** Construct a peer-reviewed journal-grade acoustic acquisition rig with minimal expenditure using commercially available components.

---

## 1. Bill of Materials & Component Selection

All components can be sourced locally or ordered via standard e-commerce platforms:

```
+========================================================================================================+
|                                    BUDGET RESEARCH HARDWARE RIG                                        |
+========================================================================================================+
|                                                                                                        |
|  1. ACOUSTIC SENSOR (Microphone)                                                                       |
|     - Boya BY-MM1 or Boya BY-MM1+ (Directional Cardioid Capsule)                                       |
|     - Includes: High-density Furry Windshield, Rubber Shock Mount, 3.5mm TRS/TRRS Cables               |
|     - Approx. Cost: $12 - $18                                                                          |
|     - Advanced Alternative: Boya BY-PVM1000 / BY-BM3031 Shotgun ($35 - $50)                            |
|                                                                                                        |
|  2. AUDIO INTERFACE / ADC CONVERTER                                                                    |
|     - Behringer U-Phoria UM2 (Studio Grade 24-bit/48kHz ADC with Preamplifier)                         |
|     - True Zero-DSP, fixed analog gain knob, zero dynamic range compression                            |
|     - Approx. Cost: $35 - $45                                                                          |
|     - Ultra-Budget Alternative: Realtek / Conexant 24-bit USB-C DAC Adapter ($8 - $12)                 |
|                                                                                                        |
|  3. SOUND LEVEL METER (Physical SPL Reference)                                                         |
|     - UNI-T UT353 Mini Digital Sound Level Meter                                                       |
|     - Specs: IEC 61672-1 Class 2, 30–130 dBA range, 125ms Fast Time Weighting, 0.1 dB Resolution     |
|     - Approx. Cost: $12 - $16                                                                          |
|                                                                                                        |
|  4. GROUND-TRUTH CAMERA (Visual Verification)                                                          |
|     - Researcher's Existing Smartphone (1080p @ 60fps) or 1080p USB Webcam                             |
|     - Cost: $0 (Utilizes existing mobile device)                                                       |
|                                                                                                        |
|  5. TRIPOD & MOUNTING FRAMEWORK                                                                        |
|     - Standard 60-inch / 1.50m Aluminum Camera Tripod (e.g. Yunteng / Weifeng)                         |
|     - Dual Cold-Shoe Metal Extension Bracket (Simultaneous microphone & phone mounting)                |
|     - Approx. Cost: $12 - $18                                                                          |
|                                                                                                        |
|========================================================================================================|
|  Total Hardware Rig Cost: ~$70 – $100 USD                                                              |
+========================================================================================================+
```

---

## 2. Mechanical Rig Assembly Diagram

```
                            [ Furry Deadcat Windshield ]
                                          │
                         [ Directional Capsule Microphone ]
                                          │
                            [ 4-Point Rubber Shock Mount ]
                                          │
        ┌─────────────────────────────────┴─────────────────────────────────┐
        │             Metal Dual Cold-Shoe Extension Bracket                │
        └─────────────────┬───────────────────────────────┬─────────────────┘
                          │                               │
            [ Smartphone Clamp (1080p) ]     [ UNI-T UT353 Sound Level Meter ]
                          │                               │
                          └───────────────┬───────────────┘
                                          │
                           [ Fluid Head Pan/Tilt Base ]
                                          │
                          [ 1.50m Aluminum Camera Tripod ]
                                          │
                         [ Counter-Weight Ballast Hook ]
```

### Step-by-Step Rig Assembly Protocol:
1. **Tripod Elevation Setup:** Extend tripod legs and lock mounting plate height at exactly **1.50 meters (5.0 ft)** above ground level. This corresponds to the standardized human auditory plane and international traffic noise measurement protocols (ISO 1996).
2. **Cold-Shoe Bracket Installation:** Secure the metal dual cold-shoe extension bar onto the tripod's 1/4" standard camera thread.
3. **Microphone Decoupling:** Mount the rubber shock mount to the central shoe. Insert the directional microphone into the shock mount to decouple mechanical ground vibrations from heavy passing vehicles.
4. **Wind Protection:** Slip the acoustic foam core and synthetic furry deadcat over the capsule to suppress atmospheric wind turbulence without distorting acoustic frequency response.
5. **Sensor Alignment:** Mount the Sound Level Meter on the right cold shoe and the smartphone on the left clamp. Ensure both sensors and camera face parallel to the acoustic line of sight.
6. **Mechanical Ballast:** Hang a weighted water bottle or field bag from the tripod center column hook to prevent chassis sway caused by aerodynamic gusts from passing trucks.

---

## 3. Signal Wiring & Ingestion Pipeline

```
  [Boya Microphone] ──(3.5mm TRS Shielded Cable)──► [Behringer UM2 Mic Input]
                                                              │
                                                        (USB Type-A)
                                                              ▼
                                                   [Field Laptop / PC]
                                                (Running Audio Engine)
```

### Cabling Rules:
* Use the **TRS cable (2 black rings)** for connecting to audio interfaces or camera inputs.
* Use the **TRRS cable (3 black rings)** when connecting directly to a smartphone 3.5mm headset jack.
* When recording via laptop, avoid unshielded analog 3.5mm inputs that capture motherboard electrical interference. Use a dedicated USB audio interface or calibrated USB-C ADC adapter.

---

## 4. Hardware Headroom Calibration (Anti-Clipping Protocol)

Hydraulic horns produce extreme sound pressure levels exceeding 105–115 dBA at 5 meters. To ensure zero digital clipping:
1. Adjust the analog Gain Knob on the audio interface to approximately **30%–35% (10 to 11 o'clock position)**.
2. Produce a loud acoustic impulse at 5 meters distance (e.g. sharp clapping or reference horn test).
3. Monitor the desktop level meter to confirm peak amplitude remains below **-6.0 dBFS**.
4. Once calibrated, lock the analog gain knob with adhesive tape to guarantee constant acoustic transfer function throughout the recording session.

---

## 5. Field Operational Safety Checklist
- [ ] Wear a high-visibility reflective safety vest at all times near traffic corridors.
- [ ] Maintain position on pedestrian walkways, elevated sidewalks, or overpasses.
- [ ] Carry institutional identification and departmental research authorization letters when deploying in transit terminals or highway intersections.
