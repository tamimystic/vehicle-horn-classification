# Master Research Blueprint: Calibrated Multimodal Vehicle Horn Acquisition Rig & Deep Learning Benchmark
> **Research Project:** Design, Construction, and Validation of a Standardized Multi-Sensor Acoustic Acquisition Rig, Exhaustive Contextual Dataset, and Explainable Deep Learning Benchmark for Vehicle Horn and Illegal Hydraulic Horn Classification in Heterogeneous Traffic  
> **Target Venues:** IEEE Transactions on Intelligent Transportation Systems (T-ITS) / Applied Acoustics (Elsevier) / Journal of the Acoustical Society of America (JASA) / DCASE Benchmark Standards.  
> **Author / Research Team:** Acoustic AI Research Group  
> **Version:** 3.0 (Production & Publication Ready)

---

## Executive Summary & Scientific Rigor

Traffic environments in South Asia are fundamentally heterogeneous. Unregulated acoustic noise and widespread illegal usage of banned **Hydraulic Air Horns** present a severe public health hazard and urban noise crisis.

For empirical acoustic research papers submitted to high-impact journals, ad-hoc smartphone recordings are routinely rejected due to four primary peer-review critiques:
1. *Sensor Lineage & Absolute Calibration:* How is digital relative amplitude ($dBFS$) mapped to physical Sound Pressure Level ($SPL$ in $dBA$)?
2. *Atmospheric & Geometric Control:* How are Doppler shift, ambient air temperature, relative humidity, distance attenuation, and ground reflection accounted for?
3. *Ground-Truth Verifiability:* What synchronized optical or multi-sensor verification guarantees that a recorded horn originated from a specific vehicle instance?
4. *Instance Independence & Zero Data Leakage:* Are multiple horn events from the same vehicle strictly separated between training, validation, and test splits (GroupSplit)?

This master blueprint establishes an end-to-end scientific methodology, a 28-parameter metadata schema, and an explainable deep learning pipeline designed to meet all peer-review criteria.

---

## Table of Contents
1. [Section 1: Multimodal 4-Tier Hardware Architecture](#section-1-multimodal-4-tier-hardware-architecture)
2. [Section 2: Exhaustive Multi-Dimensional Metadata Schema](#section-2-exhaustive-multi-dimensional-metadata-schema)
3. [Section 3: Acoustic Physics, Atmospheric, and Geometric Protocols](#section-3-acoustic-physics-atmospheric-and-geometric-protocols)
4. [Section 4: Acoustic Rig Construction, Wiring, and Calibration](#section-4-acoustic-rig-construction-wiring-and-calibration)
5. [Section 5: Software System Architecture (Zero-DSP Engine)](#section-5-software-system-architecture)
6. [Section 6: Field Data Collection Methodology & Sampling Strategy](#section-6-field-data-collection-methodology--sampling-strategy)
7. [Section 7: Audio Preprocessing, Segmentation, and QA Pipeline](#section-7-audio-preprocessing-segmentation-and-qa-pipeline)
8. [Section 8: Acoustic Feature Space & Representation Engineering](#section-8-acoustic-feature-space--representation-engineering)
9. [Section 9: Deep Learning & Transformer Architectures](#section-9-deep-learning--transformer-architectures)
10. [Section 10: Performance Evaluation & Explainable AI (XAI)](#section-10-performance-evaluation--explainable-ai)
11. [Section 11: Journal Manuscript Section-by-Section Blueprint](#section-11-journal-manuscript-section-by-section-blueprint)
12. [Section 12: Execution Timeline & Milestones](#section-12-execution-timeline--milestones)

---

## Section 1: Multimodal 4-Tier Hardware Architecture

The physical acquisition apparatus comprises four synchronized sensory tiers:

```
+========================================================================================================+
|                                    4-TIER MULTIMODAL ACQUISITION RIG                                   |
+========================================================================================================+
|                                                                                                        |
|  [TIER 1: PRIMARY ACOUSTIC SENSING]                                                                    |
|  - Directional Shotgun Mic (Supercardioid / Lobar polar pattern)                                        |
|  - Dual-layer Wind Protection (Acoustic Foam Core + High-density Synthetic Furry Deadcat)              |
|  - Low-resonance Elastomer Shock Mount (Decouples mechanical ground vibrations)                       |
|  - Balanced Shielded Studio Cable with Gold-plated Connectors                                          |
|                                                                                                        |
|  [TIER 2: CALIBRATED PHYSICAL METRICS & METEOROLOGY]                                                   |
|  - IEC 61672-1 Class 2 Digital Sound Level Meter (A/C Fast weighting, 125ms time constant)             |
|  - Ambient Temperature & Relative Humidity Sensors                                                     |
|  - Optical Distance Reference                                                                          |
|                                                                                                        |
|  [TIER 3: GROUND-TRUTH VISUAL & TEMPORAL VALIDATION]                                                   |
|  - 1080p @ 60fps Ground-Truth Video Camera (Visual vehicle verification)                              |
|  - Optical Axis Aligned with Acoustic Sensor Directivity                                                |
|                                                                                                        |
|  [TIER 4: DIGITIZATION & INGESTION COMPUTE]                                                            |
|  - 24-bit / 48.0 kHz Linear PCM Audio Interface (Zero DSP, Fixed Analog Preamp Gain)                   |
|  - Edge Ingestion Software (In-Memory Circular Buffer, Microsecond Latency Triggering)                 |
+========================================================================================================+
```

---

## Section 2: Exhaustive Multi-Dimensional Metadata Schema

Every captured audio segment is accompanied by a standardized 28-field metadata record:

1. **Signal Integrity:** `sample_id`, `filename`, `sha256_hash`, `sample_rate_hz` (48000), `bit_depth` (24), `channels` (1), `duration_sec` (3.0), `peak_dbfs`, `rms_dbfs`, `crest_factor_db`.
2. **Physical Acoustic Reference:** `measured_spl_dba` (physical SLM meter reading), `estimated_spl_dba` (derived via calibration function), `calib_offset_c` (empirical calibration offset).
3. **Geometry & Environment:** `location`, `distance_m`, `angle_deg` (45°), `mic_height_m` (1.50m), `elevation_type` ("Ground_Level" or "Overpass"), `temperature_c`, `relative_humidity_pct`, `weather_condition`.
4. **Taxonomy & Ground Truth:** `class_id` (C01 to C09), `vehicle_class`, `legal_status` ("Illegal_Prohibited" vs. "Legal_Standard"), `vehicle_instance_id` (for group-split independence), `timestamp_iso`, `ground_truth_method`, `annotator_id`.

---

## Section 3: Target Vehicle Horn Taxonomy

| ID | Vehicle Class | Acoustic Characteristics | Target Legal Status |
|---|---|---|---|
| **C01** | Hydraulic Horn | Multi-tone dissonance, Extreme SPL (>105 dBA), Piercing harmonics (1–8 kHz) | **Illegal / Prohibited** |
| **C02** | Bus (Standard) | High-volume pneumatic air horn or dual-electric horn (400–2500 Hz) | Legal / Standard |
| **C03** | Truck / Heavy Lorry | Low-frequency resonant acoustic fundamental (200–1500 Hz) | Legal / Standard |
| **C04** | Private Car / SUV | Harmonic dual-disc snail pair (400–800 Hz) | Legal / Standard |
| **C05** | Motorcycle | High-frequency single electromagnetic diaphragm (500–3000 Hz) | Legal / Standard |
| **C06** | CNG Auto-rickshaw | High-pitch piercing buzzer (800–3500 Hz) | Legal / Standard |
| **C07** | Easybike / Leguna | Electronic synthesizer/melody horn or light buzzer (600–3000 Hz) | Regulated |
| **C08** | Rickshaw Bell | Metallic mechanical double-chime or rubber bulb horn (1500–6000 Hz) | Legal / Standard |
| **C09** | Traffic Noise | Roadway background rush, engine idle, tire friction (Negative Class) | Ambient Noise |

---

## Section 4: Deep Learning Benchmark & Evaluation

1. **Feature Representations:** Log-mel spectrograms (128 mel bins, 1024-point FFT, 512-point hop), Gammatone spectrograms, and MFCCs (40 coefficients with $\Delta$ and $\Delta\Delta$).
2. **Model Architectures:**
   - CNN-based: ResNet-34 / ResNet-50 with Squeeze-and-Excitation attention.
   - Transformer-based: Audio Spectrogram Transformer (AST) and PaSST pre-trained on AudioSet.
   - Lightweight Edge Models: MobileNetV3 and EfficientNet-B0 for real-time deployment on Raspberry Pi / smartphone hardware.
3. **Validation Strategy:** Group 5-fold cross-validation partitioned strictly by `vehicle_instance_id` to prevent data leakage.
4. **Metrics:** Macro-averaged Precision, Recall, F1-Score, Class-wise Area Under the ROC Curve (AUC-ROC), and confusion matrix analysis.
5. **Explainability:** Grad-CAM on log-mel representations demonstrating model attention on specific harmonic overtones of illegal hydraulic horns.
