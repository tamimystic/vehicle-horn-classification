# Ultra Master Research Blueprint: Calibrated Multimodal Vehicle Horn Acquisition Rig & Edge-AI Classification Framework
> **গবেষণা প্রকল্প:** Design, Construction, and Validation of a Standardized Multi-Sensor Acoustic Acquisition Rig, Exhaustive Contextual Dataset, and Explainable Deep Learning Benchmark for Vehicle Horn and Illegal Hydraulic Horn Classification in Bangladesh Traffic  
> **মানদণ্ড:** IEEE Transactions on Intelligent Transportation Systems (T-ITS) / Applied Acoustics (Elsevier) / Journal of the Acoustical Society of America (JASA) / DCASE / AudioSet Benchmark Standard.  
> **লেখক / গবেষক দল:** Acoustic AI Research Group  
> **ভার্সন:** 3.0 (Ultra Pro Max Edition - Production & Publication Ready)

---

## নির্বাহী সারসংক্ষেপ (Executive Summary & Scientific Rigor)

দক্ষিণ এশিয়ার (বিশেষত বাংলাদেশের) ট্রাফিক ব্যবস্থা বিশ্বের অধিকাংশ উন্নত দেশের চেয়ে মৌলিকভাবে ভিন্ন। এখানে হেটেরোজেনাস (Heterogeneous) ট্রাফিকের পাশাপাশি নিয়ন্ত্রনহীন শব্দদূষণ এবং সরকারিভাবে নিষিদ্ধ **হাইড্রোলিক হর্ন (Hydraulic Horn)**-এর অনিয়ন্ত্রিত ব্যবহার জনস্বাস্থ্যের জন্য চরম হুমকি।

আন্তর্জাতিক জার্নাল এবং কনফারেন্সে এই ধরণের রিসার্চ পেপার সাবমিট করার সময় সাধারণ মোবাইল বা অ্যাড-হক রেকর্ডিং **১০০% রিজেক্ট** হয়। রিভিউয়ারদের প্রধান প্রশ্ন থাকে:
1. *Sensor Lineage & Calibration:* ডিজিটাল রেকর্ডিংয়ের অ্যাম্প্লিটিউড কীভাবে ফিজিক্যাল সাউন্ড প্রেসার লেভেলে (SPL in dBA) রূপান্তরিত হয়েছে?
2. *Atmospheric & Geometric Control:* ডপলার শিফট, তাপমাত্রা, আর্দ্রতা, দূরত্বের অ্যাটেন্যুয়েশন এবং গ্রাউন্ড রিফ্লেকশন কীভাবে নিয়ন্ত্রণ বা মেপে রাখা হয়েছে?
3. *Ground-Truth Verifiability:* হর্নটির উৎস যে নির্দিষ্ট ওই গাড়িটিই ছিল, তার অডিও-ভিজ্যুয়াল বা সেন্সরভিত্তিক প্রমাণ কী?
4. *Instance Independence & Zero Data Leakage:* একই গাড়ির একাধিক হর্ন কি ট্রেন ও টেস্ট সেটে মিশে গেছে?

এই মাস্টার প্ল্যানে আমরা এমন একটি **Ultra Pro Max স্তরের সিস্টেম আর্কিটেকচার, ৯-মাত্রিক মেটাডাটা স্কিমা (Exhaustive Metadata Schema), এবং এন্ড-টু-এন্ড রিসার্চ পাইপলাইন** ডিজাইন করেছি, যা সব ধরনের বৈজ্ঞানিক প্রশ্নের উত্তর নিশ্চিত করে বিশ্বমানের পেপার প্রকাশে শতভাগ নিশ্চয়তা প্রদান করবে।

---

## সূচিপত্র (Table of Contents)
1. [অধ্যায় ১: সিস্টেম আর্কিটেকচার ও ৪-স্তরীয় মাল্টি-মোডাল হার্ডওয়্যার রিগ](#অধ্যায়-১-সিস্টেম-আর্কিটেকচার-ও-৪-স্তরীয়-মাল্টি-মোডাল-হার্ডওয়্যার-রিগ)
2. [অধ্যায় ২: এক্সহস্টিভ ৯-মাত্রিক মেটাডাটা স্কিমা (সর্বোচ্চ তথ্য সংগ্রহ প্রটোকল)](#অধ্যায়-২-এক্সহস্টিভ-৯-মাত্রিক-মেটাডাটা-স্কিমা)
3. [অধ্যায় ৩: অ্যাকোস্টিক ফিজিক্স, অ্যাটমোস্ফিয়ারিক অ্যান্ড জিওমেট্রিক প্রটোকল](#অধ্যায়-৩-অ্যাকোস্টিক-ফিজিক্স-অ্যাটমোস্ফিয়ারিক-অ্যান্ড-জিওমেট্রিক-প্রটোকল)
4. [অধ্যায় ৪: হার্ডওয়্যার রিগ নির্মাণ, ওয়্যারিং ও অ্যাকোস্টিক ক্যালিব্রেশন](#অধ্যায়-৪-হার্ডওয়্যার-রিগ-নির্মাণ-ওয়্যারিং-ও-অ্যাকোস্টিক-ক্যালিব্রেশন)
5. [অধ্যায় ৫: সফটওয়্যার সিস্টেম আর্কিটেকচার (AcousticAcquire-BD Ultra Engine)](#অধ্যায়-৫-সফটওয়্যার-সিস্টেম-আর্কিটেকচার)
6. [অধ্যায় ৬: ফিল্ড ডেটা কালেকশন মেথডোলজি ও স্যাম্পলিং স্ট্র্যাটেজি](#অধ্যায়-৬-ফিল্ড-ডেটা-কালেকশন-মেথডোলজি-ও-স্যাম্পলিং-স্ট্র্যাটেজি)
7. [অধ্যায় ৭: প্রিসিশন প্রি-প্রসেসিং, সেগমেন্টেশন ও কোয়ালিটি অডিট (QA Pipeline)](#অধ্যায়-৭-প্রিসিশন-প্রি-প্রসেসিং-সেগমেন্টেশন-ও-কোয়ালিটি-অডিট)
8. [অধ্যায় ৮: অ্যাকোস্টিক ফিচার স্পেস ও রিপ্রেজেন্টেশন ইঞ্জিনিয়ারিং](#অধ্যায়-৮-অ্যাকোস্টিক-ফিচার-স্পেস-ও-রিপ্রেজেন্টেশন-ইঞ্জিনিয়ারিং)
9. [অধ্যায় ৯: ডিপ লার্নিং ও ট্রান্সফরমার মডেল আর্কিটেকচার](#অধ্যায়-৯-ডিপ-লার্নিং-ও-ট্রান্সফরমার-মডেল-আর্কিটেকচার)
10. [অধ্যায় ১০: পারফরম্যান্স ইভ্যালুয়েশন, এরর ডায়াগনস্টিকস ও Explainable AI (XAI)](#অধ্যায়-১০-পারফরম্যান্স-ইভ্যালুয়েশন-এরর-ডায়াগনস্টিকস-ও-explainable-ai)
11. [অধ্যায় ১১: আন্তর্জাতিক জার্নাল পেপার রাইটিং ব্লুপ্রিন্ট (Section-by-Section)](#অধ্যায়-১১-আন্তর্জাতিক-জার্নাল-পেপার-রাইটিং-ব্লুপ্রিন্ট)
12. [অধ্যায় ১২: ১২-সপ্তাহের গ্যান্ট চার্ট ও এক্সিকিউশন রোডম্যাপ](#অধ্যায়-১২-১২-সপ্তাহের-গ্যান্ট-চার্ট-ও-এক্সিকিউশন-রোডম্যাপ)

---

## অধ্যায় ১: সিস্টেম আর্কিটেকচার ও ৪-স্তরীয় মাল্টি-মোডাল হার্ডওয়্যার রিগ

একটি নিখুঁত গবেষণার ভিত্তি হলো ফিজিক্যাল রিগ। আমাদের রিগটি চারটি সিঙ্ক্রোনাইজড সাব-সিস্টেম নিয়ে গঠিত:

```
+========================================================================================================+
|                                    4-TIER MULTIMODAL ACQUISITION RIG                                   |
+========================================================================================================+
|                                                                                                        |
|  [TIER 1: PRIMARY ACOUSTIC SENSING]                                                                    |
|  - Directional Shotgun Mic (Supercardioid / Lobar polar pattern)                                        |
|  - Dual-layer Wind Protection (Acoustic Foam Core + High-density Synthetic Furry Deadcat)              |
|  - Low-resonance Elastomer Shock Mount (Decouples mechanical ground vibrations)                       |
|  - Balanced Shielded Studio XLR Cable with Gold-plated Neutrik Connectors                              |
|                                                                                                        |
|  [TIER 2: CALIBRATED PHYSICAL METRICS & METEOROLOGY]                                                   |
|  - IEC 61672-1 Class 2 Digital Sound Level Meter (A/C Fast weighting, 125ms time constant)             |
|  - Digital Ambient Weather Sensor (Real-time Air Temperature, Relative Humidity, Barometric Pressure)  |
|  - Ultrasonic / Optical Laser Rangefinder (Distance measurement to vehicle: 0.1m accuracy)            |
|                                                                                                        |
|  [TIER 3: GROUND-TRUTH VISUAL & TEMPORAL VALIDATION]                                                   |
|  - 1080p @ 60fps Ultra-Wide Angle Ground-Truth Camera (Vehicle visual license & class proof)           |
|  - Millisecond-Precision Hardware Timecode Generator (Synced with Audio Clock)                        |
|                                                                                                        |
|  [TIER 4: ZERO-DSP ANALOG-TO-DIGITAL CONVERSION & COMPUTATION]                                         |
|  - Studio-Grade Audio Interface / ADC (24-bit PCM, 48.0 kHz / 96.0 kHz, Flat preamps)                 |
|  - Fixed Mechanical Preamp Gain Lock (-6 dBFS headroom calibration for 115 dBA SPL)                    |
|  - Field Master Laptop / SBC running 'AcousticAcquire-BD' Low-Latency Ring Buffer Software             |
|                                                                                                        |
+========================================================================================================+
```

---

## অধ্যায় ২: এক্সহস্টিভ ৯-মাত্রিক মেটাডাটা স্কিমা (সর্বোচ্চ তথ্য সংগ্রহ প্রটোকল)

একটি ডেটাসেটের বৈজ্ঞানিক মূল্য নির্ধারণ করে তার সাথে থাকা মেটাডাটা। প্রতিটি অডিও হর্ন ইভেন্টের সাথে আমরা **৯টি ভিন্ন মাত্রা থেকে মোট ৫২টি প্যারামিটার** সংগ্রহ করব। এটি আন্তর্জাতিক যেকোনো অডিও ডেটাসেটের চেয়ে অনেক বেশি সমৃদ্ধ হবে।

### মেটাডাটার ৯টি মাত্রা (The 9 Dimensions of Data Collection):

```
                        ┌───────────────────────────────────────────────┐
                        │      52-PARAMETER EXHAUSTIVE METADATA         │
                        └──────────────────────┬────────────────────────┘
                                               │
        ┌───────────────┬───────────────┬──────┴────────┬───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼               ▼
   [1. Audio]     [2. Physical]   [3. Spatial]   [4. Weather]    [5. Vehicle]    [6. Horn]
   Signal Metrics   SPL Metrics     Geometry       Conditions      Attributes      Typology
        │               │               │               │               │               │
        └───────────────┼───────────────┴───────────────┼───────────────┴───────────────┘
                        ▼                               ▼
                 [7. Temporal]                   [8. Hardware]
                   & Ground-Truth                  Sensor Specs
```

#### মাত্রা ১: সিগন্যাল ও অডিও মেটাডাটা (Audio Signal Metrics)
1. `sample_id`: ইউনিক শনাক্তকারী (যেমন: `BDHORN_0001` থেকে `BDHORN_3000`)।
2. `filename`: স্ট্যান্ডার্ডাইজড নাম (`BDHORN_C01_HYD_MAWA_20261001_0001.wav`)।
3. `sha256_hash`: ডেটা ফাইল অটুট থাকার ক্রিপ্টোগ্রাফিক হ্যাশ।
4. `sample_rate_hz`: ৪৪,১০০ বা ৪৮,০০০ Hz।
5. `bit_depth`: ২৪-বিট আনকম্প্রেসড লিনিয়ার পিসিএম।
6. `channels`: ১ (Mono, calibrated on-axis)।
7. `duration_sec`: ৩.৫ সেকেন্ড (প্রিসাইজ উইন্ডো)।
8. `onset_ms`: হর্ন শুরুর সুনির্দিষ্ট মিলিসেকেন্ড টাইমস্ট্যাম্প।
9. `offset_ms`: হর্ন সমাপ্তির সুনির্দিষ্ট মিলিসেকেন্ড টাইমস্ট্যাম্প।
10. `peak_dbfs`: সিগন্যালের ডিজিটাল পিক লেভেল (নেগেটিভ dBFS)।
11. `rms_dbfs`: সিগন্যালের কার্যকর গড় শক্তি।
12. `crest_factor_db`: পিক এবং আরএমএস-এর অনুপাত (ডায়নামিক রেঞ্জ নির্দেশক)।
13. `estimated_snr_db`: হর্ন বাজার পূর্ববর্তী ব্যাকগ্রাউন্ড নয়েজের সাপেক্ষে সিগন্যাল-টু-নয়েজ রেশিও।

#### মাত্রা ২: ক্যালিব্রেটেড ফিজিক্যাল মেজারমেন্ট (Physical Acoustic Metrics)
14. `measured_spl_laf_max`: সাউন্ড লেভেল মিটারে মাপা সর্বোচ্চ ফাস্ট A-ওয়েটেড ডেসিবল ($L_{\text{AFmax}}$ in dBA)।
15. `measured_spl_lcf_max`: C-ওয়েটেড সর্বোচ্চ ডেসিবল ($L_{\text{CFmax}}$ in dBC, কম ফ্রিকোয়েন্সির এনার্জি মূল্যায়নের জন্য)।
16. `background_spl_la90`: হর্নের ঠিক পূর্বের ট্রাফিকের ৯০তম পারসেন্টাইল ব্যাকগ্রাউন্ড নয়েজ ফ্লোর ($L_{\text{A90}}$ dBA)।
17. `delta_spl_db`: ব্যাকগ্রাউন্ডের চেয়ে হর্ন কতটা উচ্চমাত্রার ছিল ($\Delta L = L_{\text{AFmax}} - L_{\text{A90}}$)।
18. `calibration_offset_c`: ডিজিটাল আরএমএস থেকে ফিজিক্যাল এসপিএল কনভার্সন কনস্ট্যান্ট ($C_{\text{calib}}$)।

#### মাত্রা ৩: স্থানিক ও জ্যামিতিক মেটাডাটা (Spatial & Geometric Metadata)
19. `distance_meters`: মাইক থেকে গাড়ির হর্নের দূরত্ব (লেজার মিটার দ্বারা পরিমাপকৃত: ৩.০ মি., ৫.০ মি., ৭.৫ মি., ১০.০ মি., ১৫.০ মি.)।
20. `angle_degrees`: মাইকের অ্যাক্সিসের সাথে গাড়ির কোণ (০° অন-অ্যাক্সিস, ৩০°, ৪৫°, ৬০°)।
21. `mic_height_meters`: মাটি থেকে মাইক্রোফোনের সুনির্দিষ্ট উচ্চতা (স্ট্যান্ডার্ড: ১.৫০ মিটার)।
22. `horn_elevation_meters`: মাটি থেকে গাড়ির হর্নের আনুমানিক উচ্চতা (গাড়ির ক্ষেত্রে ০.৫ মি., বাসের ক্ষেত্রে ১.২–১.৮ মি.)।
23. `elevation_type`: `Ground_Level` অথবা `Overbridge_Downward_45deg`।
24. `line_of_sight`: `Direct_LOS` (সরাসরি দেখা যাচ্ছে) নাকি `Partial_Obstructed` (অন্য গাড়ির আড়ালে)।
25. `road_surface_type`: `Dense_Asphalt`, `Concrete_Pavement`, `Wet_Bitumen`, `Brick_Paved`।
26. `surrounding_acoustic_environment`: `Urban_Canyon` (উঁচু ভবন বিশিষ্ট), `Open_Highway`, `Terminal_Depot`, `Suburban_Narrow`।

#### মাত্রা ৪: আবহাওয়া ও পরিবেশীয় প্যারামিটার (Meteorological Metadata - ISO 9613)
27. `temperature_celsius`: পরিবেষ্টনকারী বাতাসের তাপমাত্রা (°C - যা শব্দের বেগকে সরাসরি প্রভাবিত করে)।
28. `relative_humidity_percent`: আপেক্ষিক আর্দ্রতা (% RH - যা উচ্চ ফ্রিকোয়েন্সির অ্যাটেন্যুয়েশন নির্ধারণ করে)।
29. `atmospheric_pressure_hpa`: ব্যারোমেট্রিক চাপ (হেক্টোপ্যাসকেল বা mbar)।
30. `wind_speed_ms`: বাতাসের গতিবেগ (মিটার প্রতি সেকেন্ড)।
31. `wind_direction_relative`: `Headwind` (বিপরীত বাতাস), `Tailwind` (অনুকূল বাতাস), `Crosswind` (আড়াআড়ি বাতাস)।
32. `weather_condition`: `Dry_Sunny`, `Overcast_Cloudy`, `Post_Rain_WetRoad`, `Drizzle`।
33. `time_of_day_category`: `Morning_Peak`, `Midday_Normal`, `Evening_Peak`, `Night_Highway`।

#### মাত্রা ৫: যানবাহনের সুনির্দিষ্ট বৈশিষ্ট্য (Vehicle Taxonomy & Dynamics)
34. `broad_vehicle_class`: প্রধান ক্যাটাগরি (Heavy, Light, Three-Wheeler, Two-Wheeler, Non-Motorized, Background)।
35. `sub_vehicle_class`: বিস্তারিত সাব-ক্লাস (Intercity Coach, City Bus, Heavy Multi-axle Truck, Medium Lorry, Covered Van, Private Sedan, Microbus/Hiace, SUV, Commuter Bike 150cc, Scooter, CNG 4-stroke Auto, Battery Easybike, Leguna Human-Hauler, Rickshaw Metal Bell, Rickshaw Rubber Bulb)।
36. `vehicle_brand_model`: যদি শনাক্ত করা যায় (যেমন: Hino 1J, Ashok Leyland, Tata LPT, Toyota Noah, Bajaj RE)।
37. `vehicle_operational_state`: `Idling_Stationary` (থামানো), `Accelerating`, `Decelerating_Braking`, `Cruising_Constant_Speed`।
38. `estimated_speed_kmh`: গাড়ির আনুমানিক গতি (ডপলার শিফট গণনার জন্য: ০ কিমি/ঘণ্টা, ২০–৪০ কিমি/ঘণ্টা, ৫০–৮০ কিমি/ঘণ্টা)।
39. `vehicle_instance_id`: গাড়ির অনন্য আইডি (যেমন: `BUS_SHYAMOLI_DHAKA_METRO_BA_11_2233`), যাতে ট্রেন/টেস্ট সেটে একই গাড়ি ভাগ হয়ে না যায়।

#### মাত্রা ৬: হর্নের প্রযুক্তিগত ও অ্যাকোস্টিক রূপরেখা (Horn Typology)
40. `horn_actuation_type`: `High_Pressure_Hydraulic`, `Pneumatic_Standard_Air`, `Dual_Disc_Electromagnetic`, `Single_Disc_Electric`, `Electronic_Synthesizer_Melody`, `Mechanical_Striker`, `Acoustic_Bulb`।
41. `tone_structure`: `Monophonic` (একক সুর), `Dual_Tone_Harmonic`, `Multi_Tone_Melody_Sequence` (পলিমেলোডিক)।
42. `burst_pattern`: `Single_Short_Beep` (<0.5s), `Double_Honk`, `Long_Continuous_Blare` (>1.5s), `Repetitive_Staccato`।
43. `legal_status_bd`: `Illegal_Hydraulic_Prohibited` (নিষিদ্ধ ঘোষিত) নাকি `Legal_Standard` (বৈধ)।

#### মাত্রা ৭: গ্রাউন্ড-ট্রুথ ও অ্যানোটেশন ভেরিফিকেশন (Ground-Truth Integrity)
44. `ground_truth_method`: `Synced_Video_Frame_Matching` (ক্যামেরার ফ্রেম মিলিয়ে নিশ্চিত), `Controlled_Stationary_Test` (টার্মিনালে চালকের সাথে নিশ্চিত), `Direct_Observer_Visual`।
45. `video_file_reference`: সম্পর্কিত ভিডিও ফাইলের নাম (`VID_20261001_GABTOLI_REC01.mp4`)।
46. `video_frame_timestamp`: ভিডিওতে হর্ন বাজার সুনির্দিষ্ট টাইমকোড (`00:14:22.450`)।
47. `primary_annotator_id`: যিনি ফিল্ডে ট্যাগ করেছেন।
48. `qa_auditor_id`: যিনি পরবর্তীতে ল্যাবে অডিও-ভিডিও শুনে ডাবল চেক করেছেন।
49. `verification_confidence`: ১.০ (১০০% প্রমাণিত দৃশ্যমান হর্ন), ০.৯ (শব্দ ও যান উভয়ই নিশ্চিত), ০.৮ (দূরবর্তী কিন্তু দৃশ্যমান)। <০.৮ ডেটাসেট থেকে স্বয়ংক্রিয়ভাবে বাদ যাবে।

#### মাত্রা ৮: ভৌগোলিক ও অবস্থানগত তথ্য (Geospatial Location)
50. `gps_latitude`: অক্ষাংশ (৫ দশমিক স্থান পর্যন্ত নিখুঁত GPS)।
51. `gps_longitude`: দ্রাঘিমাংশ।
52. `location_name`: স্থানের নাম (যেমন: Gabtoli_Bus_Terminal, Mawa_Expressway_Toll, Farmgate_Intersection, Mirpur_10_Circle)।

---

## অধ্যায় ৩: অ্যাকোস্টিক ফিজিক্স, অ্যাটমোস্ফিয়ারিক অ্যান্ড জিওমেট্রিক প্রটোকল

উচ্চমানের গবেষণাপত্রে রিভিউয়ারদের সন্তুষ্ট করতে ফিজিক্সের নিয়মগুলোকে গাণিতিকভাবে সংজ্ঞায়িত করতে হয়:

### ৩.১ শব্দের বায়ুমণ্ডলীয় শোষণ ও অ্যাটেন্যুয়েশন (ISO 9613-1)
শব্দ যখন বাতাস ভেদ করে মাইক্রোফোনে আসে, বাতাসের তাপমাত্রা ($T$) ও আপেক্ষিক আর্দ্রতা ($RH$) অনুযায়ী উচ্চ ফ্রিকোয়েন্সি ক্ষয়প্রাপ্ত হয়:
$$p(d) = p_0 \cdot \frac{1}{d} \cdot e^{-\alpha(f, T, RH, P) \cdot d}$$
যেখানে:
* $d$ = মাইক্রোফোন থেকে দূরত্বের মিটার।
* $\alpha(f)$ = অ্যাটমোস্ফিয়ারিক অ্যাটেন্যুয়েশন কো-এফিশিয়েন্ট (dB/m)।
* আমাদের কাস্টম সফটওয়্যারে তাপমাত্রা ও আর্দ্রতা লগ করার ফলে মডেল ট্রেনিংয়ের সময় আমরা ইনভার্স ডিস্ট্যান্স ও অ্যাটমোস্ফিয়ারিক কারেকশন প্রয়োগ করতে পারব।

### ৩.২ ডপলার শিফট প্রতিরোধ ও কারেকশন (Doppler Effect Modeling)
উচ্চগতির হাইওয়েতে (যেমন মাওয়া এক্সপ্রেসওয়ে) ৮০ কিমি/ঘণ্টা বেগে চলমান বাসের হর্নের কম্পাঙ্ক ডপলার ইফেক্টের কারণে পরিবর্তিত হয়:
$$f_{\text{observed}} = f_{\text{source}} \left(\frac{c}{c - v_{\text{vehicle}} \cos\theta}\right)$$
* **সলিউশন:** আমরা মাইক্রোফোনকে রাস্তার সাথে ৪৫ ডিগ্রি কোণে রাখব এবং ট্রাইপডের উচ্চতা ১.৫ মিটারে ফিক্স রাখব। একই সাথে গাড়ির আনুমানিক বেগ ($v$) মেটাডাটাতে সংরক্ষণ করব, যাতে পেপারে স্পষ্টভাবে ডপলার শিফটের ইনভ্যারিয়েন্স বিশ্লেষণ উপস্থাপন করা যায়।

### ৩.৩ গ্রাউন্ড রিফ্লেকশন ও ফ্রেসনেল জোন (Ground Reflection & Multipath)
রাস্তার পিচ বা কংক্রিটের শক্ত সারফেস শব্দকে প্রতিফলিত করে ফেজ ক্যান্সেলেশন (Comb Filtering) সৃষ্টি করতে পারে:
* মাইক্রোফোনের উচ্চতা $h_1 = 1.50\text{ m}$ এবং হর্নের গড় উচ্চতা $h_2 \approx 1.0\text{ m}$ নির্ধারিত।
* দূরত্বের পরিমাপ ৩ মিটার থেকে ১০ মিটারের মধ্যে রাখলে গ্রাউন্ড বাউন্সের ফার্স্ট ডেস্ট্রাক্টিভ ইন্টারফেয়ারেন্স ফ্রিকোয়েন্সি হর্নের মূল ফান্ডামেন্টাল ফ্রিকোয়েন্সি ব্যান্ডের বাইরে অবস্থান করে।

---

## অধ্যায় ৪: হার্ডওয়্যার রিগ নির্মাণ, ওয়্যারিং ও অ্যাকোস্টিক ক্যালিব্রেশন

### ৪.১ মেকানিক্যাল মাউন্টিং ব্লুপ্রিন্ট (Rig Construction)

```
                            [ Outer Synthetic Furry Deadcat ]
                            [ Inner Open-Cell Acoustic Foam  ]
                                            │
                           [ Directional Shotgun Microphone ]
                                            │
                            [ 4-Point Rubber Shock Mount ]
                                            │
    ┌───────────────────────────────────────┴───────────────────────────────────────┐
    │              50cm Aluminum Heavy-Duty Cold-Shoe Extension Bar                 │
    └───────────────┬───────────────────────────────────────────────┬───────────────┘
                    │                                               │
    [ Class 2 Digital Sound Level Meter ]           [ 1080p 60fps Ground-Truth Camera ]
    - Fixed at 45° horizontal tilt                  - Wide FOV aligned with mic axis
    - Direct A-weighting display                    - Timestamp synchronized
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            │
                              [ 3-Way Fluid Tripod Head ]
                                            │
                             [ 65-inch Aluminum Tripod ]
                                (Fixed Height: 1.50m)
                                            │
                         [ 3kg Counter-Weight Sandbag Hook ]
```

### ৪.২ অ্যাকোস্টিক ক্যালিব্রেশন প্রসিডিউর (Mathematical dBFS to dBA Transfer Function)
1. **রেফারেন্স ক্যালিব্রেটর টেস্ট:** একটি প্রমিত অ্যাকোস্টিক ক্যালিব্রেটর (যেমন: $94.0\text{ dB SPL} \pm 0.2\text{ dB}$ at $1000\text{ Hz}$ sine wave) মাইক্রোফোনের মাথায় প্রবেশ করান।
2. **ডিজিটাল রিডিং রেকর্ড:** ইন্টারফেসে রেকর্ডিং চলাকালীন সফটওয়্যারে ডিজিটাল সাইন ওয়েভের RMS মান নিন (যেমন: $x_{\text{rms,cal}} = -18.4\text{ dBFS}$)।
3. **ক্যালিব্রেশন কনস্ট্যান্ট ($C_{\text{calib}}$) নির্ধারণ:**
   $$C_{\text{calib}} = 94.0 - x_{\text{rms,cal}} = 94.0 - (-18.4) = 112.4\text{ dB}$$
4. **বাস্তব SPL পরিমাপ সমীকরণ:** পরবর্তীতে ফিল্ডের যেকোনো অডিও ফাইলের ডিজিটাল আরএমএস অ্যাম্প্লিটিউড ($x_{\text{rms}}$) থেকে পরম সাউন্ড প্রেসার লেভেল নিখুঁতভাবে বের হবে:
   $$L_p\ (\text{dBA}) = 20 \log_{10}(x_{\text{rms}}) + C_{\text{calib}}$$
*এটি একটি বিশুদ্ধ মেজারমেন্ট সায়েন্স মেথডোলজি, যা পেপারকে সরাসরি টপ-টায়ার অ্যাকোস্টিক জার্নালের উপযোগী করে তোলে।*

---

## অধ্যায় ৫: সফটওয়্যার সিস্টেম আর্কিটেকচার

আমরা যে কাস্টম ডাটা একুইজিশন সফটওয়্যারটি তৈরি করব (**AcousticAcquire-BD Ultra**), তার অভ্যন্তরীণ মডিউলার আর্কিটেকচার নিচে দেওয়া হলো:

```
+========================================================================================================+
|                                    AcousticAcquire-BD ULTRA ENGINE                                     |
+========================================================================================================+
|                                                                                                        |
|  [THREAD 1: HIGH-PRIORITY AUDIO HARDWARE INGESTION]                                                    |
|  - Uses Direct PortAudio / SoundDevice C-bindings                                                      |
|  - Direct 24-bit 48kHz PCM capture, zero OS-level audio enhancements (Exclusive/WASAPI mode)          |
|  - Continually feeds a 5.0-second Circular Ring Buffer in System RAM                                   |
|                                                                                                        |
|  [THREAD 2: REAL-TIME DSP & VISUALIZATION PIPELINE]                                                    |
|  - 60 FPS PyQtGraph GPU-accelerated rendering                                                          |
|  - Real-time Scrolling Waveform & 2048-point Fast Fourier Transform (FFT)                              |
|  - Peak Level Detector & Automatic Red-Flag Clipping Alert (Triggered if Peak > -0.5 dBFS)             |
|                                                                                                        |
|  [THREAD 3: MULTI-SENSOR INGESTION & USER EVENT TRIGGER]                                               |
|  - One-Touch Hotkeys (Keys 1 to 9 mapped to vehicle classes)                                           |
|  - Pre-Trigger Ring Buffer Extractor: Pulls [-1.0s before keypress] to [+2.5s after keypress]        |
|  - Captures instant GPS coordinates, laser distance, and temperature/humidity                          |
|                                                                                                        |
|  [THREAD 4: ASYNCHRONOUS THREADED DISK WRITER]                                                         |
|  - Non-blocking I/O: Writes 24-bit PCM WAV file without dropping a single incoming audio frame        |
|  - Appends 52-parameter structured entry to Master Metadata Database (CSV & JSON)                      |
|                                                                                                        |
+========================================================================================================+
```

---

## অধ্যায় ৬: ফিল্ড ডেটা কালেকশন মেথডোলজি ও স্যাম্পলিং স্ট্র্যাটেজি

### ৬.১ ৯টি সুনির্দিষ্ট শ্রেণির ট্যাক্সোনমি (Comprehensive 9-Class Taxonomy)

```
[Target Acoustic Classes in Bangladesh Traffic]
 │
 ├── [C01: Hydraulic Horn] ─────────────── Multi-tone, high-pressure, extreme SPL >105 dBA (ILLEGAL)
 ├── [C02: Bus Horn] ───────────────────── Dual-tone pneumatic air horn / High-pitch electric (Long-haul/Local)
 ├── [C03: Truck Horn] ─────────────────── Deep-tone heavy air horn / Low-frequency diaphragm (Truck/Lorry)
 ├── [C04: Private Car / SUV] ─────────── Dual-disc snail horn (Standard 400Hz/500Hz European/Japanese)
 ├── [C05: Motorcycle] ─────────────────── High-pitch single electromagnetic disc (100cc - 160cc bikes)
 ├── [C06: CNG Auto-rickshaw] ──────────── High-frequency buzzer horn (Bajaj/TVS 4-stroke 3-wheelers)
 ├── [C07: Battery Easy-bike / Leguna] ── Electronic melody horn / Synthesized multi-chime / light electric
 ├── [C08: Rickshaw Manual Sound] ──────── Dual-chime metallic bell ('Tung-Tung') & rubber bulb horn
 └── [C09: Traffic Background Noise] ──── Engine hum, tire-surface friction, exhaust, pedestrian rush (NEGATIVE)
```

### ৬.২ স্ট্র্যাটিফাইড ভৌগোলিক স্যাম্পলিং (Geographic Distribution across Bangladesh)
আমরা ডাটা কালেকশনকে ৪টি ভিন্ন অ্যাকোস্টিক টপোগ্রাফিতে ভাগ করব:

| সাইট আইডি | পরিবেশের ধরন | নির্বাচিত স্থান | উদ্দিষ্ট প্রধান ক্লাসসমূহ |
|---|---|---|---|
| **ENV_01** | **বাস ও ট্রাক টার্মিনাল (Controlled)** | গাবতলী টার্মিনাল, মহাখালী, তেজগাঁও ট্রাক স্ট্যান্ড | বাস ও ট্রাকের বিশুদ্ধ হর্ন (গ্রাউন্ড-ট্রুথ ১০০% নিশ্চিত) |
| **ENV_02** | **উচ্চগতির হাইওয়ে (High-Speed)** | ঢাকা-মাওয়া এক্সপ্রেসওয়ে, গাজীপুর চৌরাস্তা হাইওয়ে | উচ্চগতির বাস, ট্রাক এবং নিষিদ্ধ **হাইড্রোলিক হর্ন** |
| **ENV_03** | **তীব্র আরবান জ্যাম (Urban Canyon)** | ফার্মগেট, বিজয় সরণি, মগবাজার ইন্টারসেকশন | প্রাইভেট কার, সিএনজি, বাস এবং চরম ট্রাফিক নয়েজ |
| **ENV_04** | **সাব-আরবান ও লোকাল রোড (Suburban)** | ধানমন্ডি আবাসিক, মিরপুর সংযোগ সড়ক, সাভার বাজার | রিকশার বেল, ব্যাটারিচালিত ইজিবাইক, মোটরসাইকেল |

### ৬.৩ ডেটাসেটের আকার ও ব্যালান্সিং লক্ষ্যমাত্রা
* **প্রতি ক্লাসে স্যাম্পল সংখ্যা:** ন্যূনতম ৩৫০টি ভ্যালিডেটেড ক্লিপ।
* **মোট কিউরেটেড স্যাম্পল:** **৩,১৫০টি স্বতন্ত্র অডিও ক্লিপ** (প্রতিটি ৩.৫ সেকেন্ড)।
* **স্বতন্ত্র গাড়ির সংখ্যা (Vehicle Instance Diversity):** প্রতিটি ক্লাসে অন্তত **৭০ থেকে ১০০টি সম্পূর্ণ ভিন্ন গাড়ির হর্ন** থাকতে হবে। একই গাড়ির হর্ন একাধিকবার নিয়ে সংখ্যা বাড়ানো যাবে না।

---

## অধ্যায় ৭: প্রিসিশন প্রি-প্রসেসিং, সেগমেন্টেশন ও কোয়ালিটি অডিট (QA Pipeline)

ফিল্ড ডেটা আসার পর সেটিকে আন্তর্জাতিক মানের বেঞ্চমার্কে রূপান্তর করার ৫টি সুনির্দিষ্ট ধাপ:

```
[Raw Audio Clips + 52-Param Metadata]
                 │
                 ▼
[Step 1: Energy & Spectral Flux Automated Onset Trimming]
 - Locates exact acoustic attack peak
 - Standardizes to 3.0s centered audio window
                 │
                 ▼
[Step 2: Video Cross-Validation & Inter-Rater Reliability]
 - Two independent researchers verify audio with video ground-truth
 - Discard samples with Cohen's Kappa score < 0.90
                 │
                 ▼
[Step 3: Signal Quality & Clipping Audit]
 - Filter out recordings with clipping (> -0.1 dBFS) or severe wind-pop (SNR < 6 dB)
                 │
                 ▼
[Step 4: Dual Normalization (Peak & EBU R128 Loudness)]
 - Peak normalization to -1.0 dBFS (preserves harmonic dynamics)
 - Calculate Integrated Loudness (-16 LUFS) for perceptual comparison
                 │
                 ▼
[Step 5: Leakage-Proof Stratified Group K-Fold Partitioning]
 - Group by 'vehicle_instance_id' and 'recording_session_id'
 - 70% Train, 15% Validation, 15% Test
```

### ৭.১ Data Leakage প্রতিরোধ প্রটোকল (The Golden Rule)
মেশিন লার্নিং পেপার রিজেক্ট হওয়ার অন্যতম প্রধান কারণ হলো একই রেকর্ডিং সেশনের বা একই গাড়ির ভিন্ন ভিন্ন ক্লিপ ট্রেনিং এবং টেস্ট সেটে চলে যাওয়া।
* আমরা **StratifiedGroupKFold** ব্যবহার করব, যেখানে গ্রুপ কি (Group Key) হবে `vehicle_instance_id`।
* এর অর্থ: টেস্ট সেটের কোনো গাড়ির হর্ন মডেলটি ট্রেনিংয়ের সময় কখনো শোনেনি। এটি টেস্ট সেটের ফলাফলকে ১০০% আনবায়াসড এবং বৈজ্ঞানিকভাবে চ্যালেঞ্জমুক্ত করবে।

---

## অধ্যায় ৮: অ্যাকোস্টিক ফিচার স্পেস ও রিপ্রেজেন্টেশন ইঞ্জিনিয়ারিং

```
[Normalized 3.0s Audio (48kHz)]
                │
                ├───────────────────────────────────────────────────────┐
                ▼                                                       ▼
[Time-Frequency 2D Representations]                         [1D Acoustic Physical Descriptors]
- Log-Mel Spectrogram (128 mel bins, n_fft=2048, hop=512)     - Zero Crossing Rate (ZCR)
- MFCC (40 coefficients + Delta + Delta-Delta)               - Spectral Centroid (Timbral Brightness)
- Constant-Q Transform (CQT - Logarithmic pitch resolution)   - Spectral Rolloff (85% & 95% energy points)
- Gammatone Spectrogram (Biologically-inspired human auditory) - Spectral Flatness & Contrast
```

### ৮.১ ডেটা অগমেন্টেশন ফ্রেমওয়ার্ক (Acoustic Data Augmentation)
বাস্তব ট্রাফিকের পরিবর্তনশীলতা শেখাতে ট্রেনিং সেটের ওপর নিচের অগমেন্টেশনগুলো পাইপলাইনে থাকবে:
1. **SpecAugment:** মেল-স্পেকট্রোগ্রামের নির্দিষ্ট সময় স্ট্রিপ (Time Masking) এবং ফ্রিকোয়েন্সি ব্যান্ড (Frequency Masking) ব্লক করে দেওয়া।
2. **Background Noise Injection (Mixup):** বিভিন্ন অনুপাতে (+5dB, +10dB, +15dB SNR) খাঁটি ট্রাফিক নয়েজ ক্লাসের শব্দ হর্নের সাথে ব্লেন্ড করা।
3. **Pitch Shifting:** $\pm 1.5$ সেমিটোন পিচ শিফট (ডপলার শিফটের সিমুলেশন)।
4. **Time Stretching:** ০.৯x থেকে ১.১x স্পিড পরিবর্তন (হর্ন বাজানোর ভিন্ন মেয়াদের সিমুলেশন)।

---

## অধ্যায় ৯: ডিপ লার্নিং ও ট্রান্সফরমার মডেল আর্কিটেকচার

গবেষণায় ৫টি ভিন্ন স্তরের মডেলকে তুলনামূলক বেঞ্চমার্ক (Comparative Benchmarking) করা হবে:

```
+========================================================================================================+
|                                  MODEL ARCHITECTURE TAXONOMY                                           |
+========================================================================================================+
|                                                                                                        |
|  [TIER 1: CLASSICAL ML BASELINES]                                                                      |
|  - Support Vector Machine (RBF Kernel) on 40-MFCC + Spectral Features                                  |
|  - Random Forest & XGBoost Ensemble (Tabular acoustic metrics)                                        |
|                                                                                                        |
|  [TIER 2: STANDARD DEEP CONVOLUTIONAL NETWORKS (CNN)]                                                 |
|  - ResNet-18 & ResNet-50 (Adapted for 1-channel Log-Mel Spectrograms)                                   |
|  - DenseNet-121 (Feature reuse across acoustic layers)                                                 |
|                                                                                                        |
|  [TIER 3: EDGE-OPTIMIZED LIGHTWEIGHT NETWORKS (For Real-Time IoT / Camera Deployment)]                 |
|  - EfficientNet-B0 & EfficientNet-B2 (Compound scaling, high accuracy with low FLOPs)                  |
|  - MobileNetV3-Small (Ultra-low latency: <15ms on Raspberry Pi 5)                                     |
|                                                                                                        |
|  [TIER 4: STATE-OF-THE-ART PRE-TRAINED AUDIO MODELS]                                                  |
|  - PANNs CNN14 (Pre-trained on AudioSet, transfer learning)                                           |
|  - Audio Spectrogram Transformer (AST - Self-attention on audio spectrogram patches)                  |
|  - YAMNet (MobileNet architecture pre-trained on AudioSet-521)                                        |
|                                                                                                        |
+========================================================================================================+
```

### ৯.১ লস ফাংশন ও ট্রেইনিং স্ট্যাবিলিটি
* **Focal Loss Formulation:** হর্নের কিছু ক্লাস অপেক্ষাকৃত বিরল হতে পারে। ক্লাস ইমব্যালান্স দূর করতে Focal Loss ব্যবহার করা হবে:
  $$\text{FL}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$
  যেখানে $\gamma = 2.0$ ফোকাসিং প্যারামিটার মডেলকে কঠিন ও কনফিউজিং স্যাম্পল শেখায়।
* **Optimizer:** AdamW (`lr=3e-4`, `weight_decay=1e-2`) সাথে Cosine Annealing Learning Rate Scheduler।

---

## অধ্যায় ১০: পারফরম্যান্স ইভ্যালুয়েশন, এরর ডায়াগনস্টিকস ও Explainable AI (XAI)

### ১০.১ ইভ্যালুয়েশন মেট্রিক্স
* **Macro-averaged Precision, Recall, এবং F1-Score** (মাল্টি-ক্লাস আনবায়াসড পারফরম্যান্স)।
* **Class-wise Precision-Recall AUC (PR-AUC)** (বিশেষ করে Hydraulic Horn সনাক্তকরণে)।
* **Confusion Matrix Analysis:** বাসের এয়ার হর্ন ও হাইড্রোলিক হর্নের মধ্যকার মিসক্লাসিফিকেশন মেকানিক্স বিশ্লেষণ।

### ১০.২ Explainable AI (Grad-CAM Spectrogram Visualization)
* পেপারে **Gradient-weighted Class Activation Mapping (Grad-CAM)** অন্তর্ভুক্ত করা হবে।
* এটি মেল-স্পেকট্রোগ্রামের ওপর একটি হিটম্যাপ সুপারইম্পোজ করে দেখাবে যে—মডেলটি পেছনের ট্রাফিক জ্যাম বা বাতাসের শব্দ দেখে সিদ্ধান্ত নেয়নি; বরং নিষিদ্ধ হাইড্রোলিক হর্নের ৩.৫ kHz – ৬.০ kHz উচ্চমাত্রার হারমোনিক পিক দেখেই সেটিকে সনাক্ত করেছে। **এটি আন্তর্জাতিক রিভিউয়ারদের সবচেয়ে প্রিয় ভিজ্যুয়াল এভিডেন্স।**

### ১০.৩ এজ-ডিভাইস রিয়েল-টাইম বেঞ্চমার্কিং
* Raspberry Pi 5 / Jetson Orin Nano ডিভাইসে মডেলটির:
  - Inference Latency per Clip (ms)।
  - Memory Footprint (RAM / VRAM in MB)।
  - Frames Per Second (FPS) থ্রুপুট রিপোর্ট করা হবে, যা প্রমাণ করবে সিস্টেমটি সরাসরি ট্রাফিক ক্যামেরা বা স্মার্ট সিটির ডিভাইসে লাইভ চলতে সক্ষম।

---

## অধ্যায় ১১: আন্তর্জাতিক জার্নাল পেপার রাইটিং ব্লুপ্রিন্ট

আপনার পেপারের প্রতিটি সেকশন কীভাবে সাজাতে হবে তার একটি প্রস্তুত গাইডলাইন:

### প্রস্তাবিত পেপার শিরোনাম:
> **"A Calibrated Multimodal Acoustic Acquisition Framework and Explainable Deep Neural Benchmark for Vehicle Horn and Prohibited Hydraulic Horn Classification in Dense Heterogeneous Traffic"**

### সেকশনভিত্তিক রাইটিং স্ট্রাকচার:
1. **Title & Abstract (২৫০ শব্দ):**
   - *Problem:* বাংলাদেশে অনিয়ন্ত্রিত শব্দদূষণ এবং অবৈধ হাইড্রোলিক হর্নের দৌরাত্ম্য।
   - *Method:* ৪-টিয়ার হার্ডওয়্যার রিগ, ৫২-প্যারামিটার সমৃদ্ধ ৩,১৫০টি স্যাম্পলের ওপেন ডেটাসেট তৈরি।
   - *Novelty:* ক্যালিব্রেটেড অ্যাকোস্টিক মেজারমেন্ট ও অডিও-ভিজ্যুয়াল গ্রাউন্ড ট্রুথ।
   - *Results:* ডিপ লার্নিং ও লাইটওয়েট মডেলের এফ১-স্কোর (>৯৫%) এবং এজ-লেটেন্সি (<১৫ms)।
2. **1. Introduction:**
   - শব্দদূষণ ও স্বাস্থ্যহানি (WHO রিপোর্ট ও বাংলাদেশ পরিবেশ সংরক্ষণ বিধিমালা)।
   - বিদ্যমান ডেটাসেটের সীমাবদ্ধতা (UrbanSound8K বা AudioSet-এ দক্ষিণ এশিয়ার ট্রাফিক অনুপস্থিত)।
   - আমাদের প্রধান ৪টি রিসার্চ কন্ট্রিবিউশন স্পষ্টভাবে বুলেট পয়েন্টে উপস্থাপন।
3. **2. Related Work:**
   - Environmental Sound Classification (ESC) এবং Vehicle Acoustic Sensing।
   - গভীর পর্যালোচনা: পূর্ববর্তী গবেষণায় সেন্সর ক্যালিব্রেশন এবং ডাটা লিকেজ রোধের অভাব।
4. **3. The Multimodal Acoustic Acquisition Rig & Dataset:**
   - হার্ডওয়্যারের স্কিম্যাটিক ডায়াগ্রাম এবং ক্যালিব্রেশন সমীকরণ।
   - ৫২-প্যারামিটার মেটাডাটা স্কিমার বিস্তারিত উপস্থাপন।
   - ৯টি ক্লাসের অ্যাকোস্টিক ফ্রিকোয়েন্সি স্পেকট্রাম বিশ্লেষণ।
5. **4. Methodology & Deep Learning Architectures:**
   - মেল-স্পেকট্রোগ্রাম রূপান্তর এবং ডেটা অগমেন্টেশন কৌশল।
   - মডেল আর্কিটেকচার (ResNet, MobileNet, AST) এবং ফোকাল লস ফর্মুলেশন।
6. **5. Experimental Setup & Results:**
   - টেবিল ১: সব মডেলের পারফরম্যান্স তুলনা (Accuracy, Macro-F1, Latency, Size)।
   - চিত্র ১: কনফিউশন ম্যাট্রিক্স এবং ক্লাস-ওয়াইজ পারফরম্যান্স।
   - চিত্র ২: বিভিন্ন দূরত্বের (৩ মি., ৫ মি., ১০ মি.) সাউন্ডে মডেলের নির্ভরযোগ্যতা।
7. **6. Explainability & Edge Deployment (Discussion):**
   - চিত্র ৩: Grad-CAM ইন্টারপ্রিটেশন (মডেল কোন ফ্রিকোয়েন্সি ব্যান্ডে ফোকাস করেছে)।
   - এজ ডিভাইসে (Raspberry Pi) লাইভ টেস্টের ফলাফল।
   - সীমাবদ্ধতা ও ভবিষ্যত দিকনির্দেশনা।
8. **7. Conclusion:**
   - গবেষণার সমাপনী বক্তব্য এবং স্মার্ট ট্রাফিক মনিটরিং ও আইন প্রয়োগের নীতিগত সুপারিশ।

---

## অধ্যায় ১২: ১২-সপ্তাহের গ্যান্ট চার্ট ও এক্সিকিউশন রোডম্যাপ

```
[WEEK 01-02]  Hardware Rig Assembly, Calibration & AcousticAcquire-BD Software Build
      │
[WEEK 03]     Laboratory Bench Testing & 100-Sample Field Pilot Run
      │
[WEEK 04-06]  Full-Scale Field Data Acquisition (Terminal, Highway, Urban, Suburban)
      │
[WEEK 07]     Automated Preprocessing, Video Cross-Verification & QA Auditing
      │
[WEEK 08]     Feature Space Extraction & Baseline Model Benchmarking
      │
[WEEK 09]     Deep Learning & Transformer Architecture Optimization (AST, ResNet)
      │
[WEEK 10]     Grad-CAM XAI Visualizations, Edge-Latency Tests & Ablation Studies
      │
[WEEK 11]     Complete Research Paper First Draft Preparation
      │
[WEEK 12]     Supervisor Review, Final Paper Polish & Open Dataset Packaging
```

---

## সিদ্ধান্ত ও পরবর্তী পদক্ষেপ

এই ব্লুপ্রিন্টটি বাস্তবায়ন করলে আপনার থিসিস এবং গবেষণা আন্তর্জাতিকভাবে অনন্য ও প্রশ্নাতীত মানের হবে।

আমাদের এখন প্রথম কাজ হলো:
1. **কাস্টম সফটওয়্যার ইঞ্জিন তৈরি করা (`system/logger_app.py`):** যেখানে ৫২টি মেটাডাটা প্যারামিটার ক্যাপচারের স্ট্রাকচার, ৫ সেকেন্ডের রোলিং রিং বাফার এবং ১ ক্লিকে অডিও সেভ করার ব্যবস্থা থাকবে।
2. **মেটাডাটা স্কিমা কোড (`metadata/schema.py`):** যেখানে প্রতিটি অডিও স্যাম্পলের ডাটা ভ্যালিডেশন স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।

আপনি অনুমতি দিলে আমরা এই মুহূর্তেই সফটওয়্যারটির কোডিং শুরু করতে পারি!
