# System Engineering & Build Manual: Acoustic Data Acquisition System
> **প্রকল্প:** Standardized Multimodal Acoustic Acquisition Rig & Software Suite for Vehicle Horns  
> **ফাইল পরিচিতি:** সিস্টেমের হার্ডওয়্যার অ্যাসেম্বলি, সফটওয়্যার ডেভেলপমেন্ট, ক্যালিব্রেশন ও ফিল্ড অপারেশন ম্যানুয়াল।  
> **উদ্দেশ্য:** গবেষণার জন্য একটি রিপ্রডিউসিবল, ক্যালিব্রেটেড এবং পিয়ার-রিভিউড জার্নাল-মানের স্বয়ংসম্পূর্ণ ডাটা একুইজিশন সিস্টেম তৈরি করা।

---

## সূচিপত্র (Table of Contents)
1. [সিস্টেম আর্কিটেকচার ও মূল দর্শন (System Architecture & Philosophy)](#১-সিস্টেম-আর্কিটেকচার-ও-মূল-দর্শন)
2. [অধ্যায় ১: হার্ডওয়্যার রিগ কম্পোনেন্ট ও মেকানিক্যাল অ্যাসেম্বলি](#অধ্যায়-১-হার্ডওয়্যার-রিগ-কম্পোনেন্ট-ও-মেকানিক্যাল-অ্যাসেম্বলি)
3. [অধ্যায় ২: অ্যাকোস্টিক ক্যালিব্রেশন ও গেইন টিউনিং প্রটোকল](#অধ্যায়-২-অ্যাকোস্টিক-ক্যালিব্রেশন-ও-গেইন-টিউনিং-প্রটোকল)
4. [অধ্যায় ৩: সফটওয়্যার সিস্টেম ডেভেলপমেন্ট (AcousticAcquire-BD)](#অধ্যায়-৩-সফটওয়্যার-সিস্টেম-ডেভেলপমেন্ট-acousticacquire-bd)
5. [অধ্যায় ৪: সিস্টেম টেস্টিং ও ভ্যালিডেশন (Bench & Pilot Testing)](#অধ্যায়-৪-সিস্টেম-টেস্টিং-ও-ভ্যালিডেশন)
6. [অধ্যায় ৫: ফিল্ড অপারেশন্স ম্যানুয়াল (SOP - Standard Operating Procedure)](#অধ্যায়-৫-ফিল্ড-অপারেশন্স-ম্যানুয়াল-sop)

---

## ১. সিস্টেম আর্কিটেকচার ও মূল দর্শন

একটি বৈজ্ঞানিক গবেষণায় ডেটাসেটের গ্রহণযোগ্যতা নির্ভর করে তার সংগ্রহের নির্ভুলতার ওপর। আমাদের সিস্টেমটি দুটি প্রধান স্তম্ভের ওপর গঠিত:
1. **হার্ডওয়্যার রিগ (Hardware Rig):** ফিজিক্যাল অ্যাকোস্টিক সেন্সর, গ্রাউন্ড-ট্রুথ ক্যামেরা, ডেসিবল মিটার এবং নো-ডিএসপি অডিও ইন্টারফেসের সমন্বয়ে গঠিত একটি ফিক্সড-ফ্রেম সেটআপ।
2. **কাস্টম সফটওয়্যার স্যুট (AcousticAcquire-BD):** ল্যাপটপ বা সিঙ্গেল-বোর্ড কম্পিউটারে চালিত একটি রিয়েল-টাইম পাইথন অ্যাপ্লিকেশন, যা সারাক্ষণ র-অডিও মেমোরিতে (Rolling Ring Buffer) ধরে রাখে এবং কিবোর্ডের হট-কি (1–9) চাপার সাথে সাথে স্বয়ংক্রিয়ভাবে হর্নের শুরু ও শেষ কেটে মেটাডাটা সহ সেভ করে।

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
                       |       SOFTWARE SUITE (AcousticAcquire-BD)        |
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

## অধ্যায় ১: হার্ডওয়্যার রিগ কম্পোনেন্ট ও মেকানিক্যাল অ্যাসেম্বলি

### ১.১ প্রয়োজনীয় হার্ডওয়্যার তালিকা ও স্পেসিফিকেশন

আপনার বাজেট অনুযায়ী দুটি ভিন্ন টিয়ারের যে-কোনো একটি সেটআপ বেছে নেওয়া যাবে:

| কম্পোনেন্ট | প্রফেশনাল রিসার্চ সেটআপ (Tier 1) | বাজেট রিসার্চ সেটআপ (Tier 2 - সুলভ) | আবশ্যক স্পেসিফিকেশন |
|---|---|---|---|
| **মাইক্রোফোন (Acoustic Sensor)** | Rode NTG2 / Audio-Technica AT875R | Boya BY-PVM1000 / Boya BY-MM1 Pro | Supercardioid/Shotgun, 20Hz–20kHz flat, SNR > 75dB |
| **উইন্ডশিল্ড (Wind Protection)** | Rode DeadCat Furry Windshield | Boya Furry Outdoor Windscreen | ডেটক্যাট (ফারি) বাধ্যতামূলক; সাধারণ ফোম কভার চলবে না |
| **অডিও ইন্টারফেস / ADC** | Focusrite Scarlett Solo (4th Gen) | Behringer U-Phoria UMC22 / UMC202HD | 24-bit, 44.1/48 kHz, Flat preamp, নো সফটওয়্যার ডিএসপি |
| **অল-ইন-ওয়ান রেকর্ডার (বিকল্প)** | Zoom H4n Pro / Zoom H5 | Zoom H1n / Tascam DR-05X | ইন্টারফেস ছাড়া সরাসরি রেকর্ডিং ও USB অডিও ইন হিসেবে সক্ষম |
| **গ্রাউন্ড ট্রুথ ক্যামেরা** | GoPro Hero / Action Cam | 1080p USB Webcam / ট্রাইপড মাউন্টেড ফোন | ন্যূনতম 1080p @ 30fps, ওয়াইড অ্যাঙ্গেল লেন্স |
| **ডেসিবল মিটার (SLM)** | Testo 815 / Reed R8050 (Class 2) | UNI-T UT353 Sound Level Meter | Type 2 / Class 2, dBA & dBC স্কেল, Fast Response (125ms) |
| **মাউন্টিং ফ্রেম** | 65" Heavy-duty Aluminum Tripod | Standard Camera Tripod + Cold Shoe Bar | ভাইব্রেশন রোধে শক-মাউন্ট (Shockmount) সহ ট্রাইপড |
| **পাওয়ার ব্যাকআপ** | 20,000 mAh 65W PD Power Bank | 10,000 mAh 5V/2A Standard Power Bank | ল্যাপটপ ও অডিও ইন্টারফেসে একটানা ৪-৬ ঘণ্টা পাওয়ার সরবরাহ |

---

### ১.২ মেকানিক্যাল অ্যাসেম্বলি (Physical Rig Assembly)

রিগটি রাস্তায় স্থির ও ভাইব্রেশন-মুক্ত রাখার জন্য নিচের ডায়াগ্রাম অনুযায়ী ট্রাইপডে মাউন্ট করতে হবে:

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

#### অ্যাসেম্বলি নির্দেশিকা:
1. **শক-মাউন্ট ইনস্টলেশন:** মাইক্রোফোনটিকে সরাসরি শক্ত ক্লিপে না লাগিয়ে রাবার ব্যান্ডযুক্ত **Shock Mount**-এ আটকান। এতে গাড়ির চলাচলের কারণে মাটিতে বা ট্রাইপডে যে কম্পন হয়, তা সরাসরি অডিওতে লো-ফ্রিকোয়েন্সি থাপ বা হাম হিসেবে ধরা পড়বে না।
2. **কোল্ড-শু এক্সটেনশন বার:** ট্রাইপডের মূল হেডের ওপর একটি ডুয়াল বা ট্রিপল কোল্ড-শু এক্সটেনশন বার লাগান। এর মাঝখানে থাকবে মাইক্রোফোন, বামে থাকবে গ্রাউন্ড-ট্রুথ ক্যামেরা এবং ডানে থাকবে ডেসিবল মিটার।
3. **উইন্ডশিল্ড পরাণ:** মাইক্রোফোনের ওপর প্রথমে ফোম কভার এবং তার ওপর অবশ্যই **Furry Deadcat** পরিয়ে দিন। বাতাসে পশমগুলো বাতাসের টার্বুলেন্স ভেঙে দেয় কিন্তু শব্দের ফ্রিকোয়েন্সি আটকে রাখে না।
4. **কাউন্টার-ওয়েট:** রাস্তায় দ্রুতগতির বাসের ধাক্কায় বাতাস সৃষ্টি হয়। ট্রাইপডের নিচের হুকে একটি ছোট ব্যাগ বা পানির বোতল ঝুলিয়ে দিন যাতে ট্রাইপড পুরোপুরি অনড় থাকে।

---

### ১.৩ ওয়্যারিং ও কানেক্টিভিটি

```
  [Shotgun Mic] ──(XLR / 3.5mm Shielded Cable)──► [Audio Interface Input 1]
                                                           │
                                                (USB-C / USB-A Cable)
                                                           ▼
  [Ground-Truth Cam] ──────(USB Cable)──────────► [Field Laptop / PC]
                                                           │
                                                [AcousticAcquire-BD App]
```

* **কেবল সিলেকশন:** সবসময় শিল্ডেড (Shielded) ক্যাবল ব্যবহার করুন। আনশিল্ডেড সাধারণ ক্যাবলে আশপাশের মোবাইল টাওয়ার বা হাই-ভোল্টেজ তারের কারণে 50Hz ইলেকট্রিক্যাল হাম (Hum) ঢুকে যায়।
* **গো গ্রাউন্ড:** ল্যাপটপ ফিল্ডে চলাকালীন ব্যাটারি পাওয়ারে থাকবে (প্লাগ-ইন চার্জার দিয়ে চালালে আর্থিংয়ের কারণে অডিওতে ইলেকট্রিক নয়েজ ঢুকতে পারে)।

---

## অধ্যায় ২: অ্যাকোস্টিক ক্যালিব্রেশন ও গেইন টিউনিং প্রটোকল

### ২.১ ডিজিটাল হেডরুম ও গেইন ফিক্সিং প্রটোকল (Preventing Clipping)
যানবাহনের হর্ন হঠাৎ অত্যন্ত তীব্র শব্দ তৈরি করে। একটি সাধারণ বাসের হর্ন ৫ মিটার দূরত্বে **৯৫–১০৫ dBA** এবং একটি নিষিদ্ধ হাইড্রোলিক হর্ন **১০৫–১১৮ dBA** পর্যন্ত হতে পারে।

```
  0 dBFS  ─── [ CLIPPING DISTORTION - DATA RUINED ]
 -3 dBFS  ─── Maximum Allowed Transient Peak
 -6 dBFS  ─── Target Peak for Loudest Hydraulic Horn at 5m
-12 dBFS  ─── Standard Bus/Truck Air Horn Level
-18 dBFS  ─── Normal Traffic Background Noise Level
-40 dBFS  ─── System Noise Floor (Quiet Room / Clean Road)
```

#### গেইন সেট করার নিয়ম:
1. অডিও ইন্টারফেসের এনালগ গেইন নব (Gain Knob) সাধারণত **১০ টা থেকে ১১ টার পজিশনে (প্রায় ৩০–৪০% গেইন)** সেট করুন।
2. একটি টেস্ট হর্ন বাজিয়ে নিশ্চিত করুন যে পিক লেভেল যেন কোনো অবস্থাতেই **-6 dBFS**-এর বেশি না ওঠে।
3. **একবার গেইন সেট করার পর গবেষণার পুরো সেশনে এই নব আর স্পর্শ করা যাবে না।** টেপ দিয়ে নবটি আটকে দিন, যাতে মেকানিক্যাল মুভমেন্ট না হয়। পেপারে লিখতে হবে: *"All recordings were collected using a strictly fixed preamp gain of +24 dB without dynamic compression."*

---

### ২.২ ডেসিবল মিটার (SLM) টু ডিজিটাল অডিও ম্যাপিং
1. মাঠ পর্যায়ে রেকর্ডিংয়ের সময় ডেসিবল মিটারে হর্নের পিক সাউন্ড প্রেসার লেভেল (SPL in dBA) রিড করুন (যেমন: 104.2 dBA)।
2. সফটওয়্যারের মেটাডাটা এন্ট্রিতে এই মানটি ইনপুট দিন।
3. এর মাধ্যমে পরবর্তীতে ডিজিটাল অডিওর আরএমএস অ্যাম্প্লিটিউড ($x_{\text{rms}}$) থেকে বাস্তব বিশ্বের ফিজিক্যাল প্রাবল্য ($L_p$) বের করার ট্রান্সফার ফাংশন তৈরি করা যাবে:
   $$\text{SPL (dBA)} = 20 \log_{10}\left(\frac{x_{\text{rms}}}{x_{\text{ref}}}\right) + C_{\text{calib}}$$
   যেখানে $C_{\text{calib}}$ হলো আমাদের ক্যালিব্রেশন কনস্ট্যান্ট। এটি আপনার পেপারের মেথডোলজিকে অন্য সাধারণ পেপারের চেয়ে অনেক বেশি উচ্চতায় নিয়ে যাবে।

---

## অধ্যায় ৩: সফটওয়্যার সিস্টেম ডেভেলপমেন্ট (AcousticAcquire-BD)

মাঠ পর্যায়ে দ্রুত ডেটা সংগ্রহের জন্য আমরা একটি কাস্টম পাইথন-ভিত্তিক জিইউআই অ্যাপ্লিকেশন তৈরি করব। 

### ৩.১ সফটওয়্যারের স্থাপত্য ও রোলিং রিং বাফার মেকানিজম

```
[Audio Ingest 48kHz] ──► [5.0-Second Circular Ring Buffer in RAM]
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼                                                   ▼
[Real-Time Visualization]                             [Hotkey Event Trigger]
- Scrolling Waveform                                  - User hits key (1-9)
- Fast FFT Spectrum                                            │
- Clipping Warning (> -0.5 dBFS)                               ▼
                                                   [Pre/Post Audio Slicer]
                                                   Takes:
                                                   - 1.0s BEFORE trigger
                                                   - 2.5s AFTER trigger
                                                   Total: 3.5s Perfect Clip
                                                               │
                                                               ▼
                                                   [Threaded Disk Writer]
                                                   - Saves WAV (24-bit PCM)
                                                   - Appends metadata.csv
```

**কেন Rolling Ring Buffer আবশ্যক?**  
মানুষের চোখ ও কানের রিঅ্যাকশন টাইম গড়ে ২০০ থেকে ৪০০ মিলি-সেকেন্ড। রাস্তায় কোনো হর্ন বাজলে আপনি বোতাম চাপার আগেই হর্নের শুরুর ফ্র্যাকশন চলে যায়। রিং বাফার সারাক্ষণ পেছনের ১ সেকেন্ডের অডিও ধরে রাখে, তাই বোতাম চাপার সাথে সাথেই হর্নের প্রথম মিলি-সেকেন্ডসহ নিখুঁত ক্লিপ তৈরি হয়ে যায়!

---

### ৩.২ সফটওয়্যার ডিপেন্ডেন্সি ও এনভায়রনমেন্ট সেটআপ

প্রজেক্ট ফোল্ডারে `system/requirements.txt` ফাইলটিতে নিচের লাইব্রেরিগুলো থাকতে হবে:

```txt
sounddevice>=0.4.6
numpy>=1.24.0
scipy>=1.10.0
PyQt6>=6.5.0
pyqtgraph>=0.13.0
soundfile>=0.12.1
pandas>=2.0.0
```

---

### ৩.৩ সম্পূর্ণ প্রোডাকশন-রেডি সফটওয়্যার কোড (`system/logger_app.py`)

এই সম্পূর্ণ স্ক্রিপ্টটি তৈরি করে সরাসরি চালানো যাবে। এটি একটি পূর্ণাঙ্গ গ্রাফিক্যাল ইউজার ইন্টারফেস (GUI) প্রদান করে:

```python
"""
AcousticAcquire-BD: Standardized Acoustic Data Acquisition Suite
Author: Research Team
Description: Low-latency audio streaming, circular ring-buffering,
             real-time waveform/spectrum, one-touch hotkey tagging,
             and synchronized metadata logging for vehicle horn research.
"""

import sys
import os
import time
import datetime
import collections
import threading
import numpy as np
import sounddevice as sd
import soundfile as sf
import pandas as pd

from PyQt6 import QtWidgets, QtCore, QtGui
import pyqtgraph as pg

# --- System Configuration ---
SAMPLE_RATE = 48000           # 48 kHz standard research sampling rate
CHANNELS = 1                  # Mono channel for classification
DTYPE = 'float32'             # 32-bit float internal buffer
BUFFER_SECONDS = 5.0          # Total ring buffer length in RAM
PRE_TRIGGER_SEC = 1.0         # Seconds captured BEFORE hotkey press
POST_TRIGGER_SEC = 2.5        # Seconds captured AFTER hotkey press
TOTAL_EVENT_SEC = PRE_TRIGGER_SEC + POST_TRIGGER_SEC  # 3.5 seconds clip

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "01_raw_field_recordings"))
METADATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "metadata", "metadata_master.csv"))

# --- 9 Research Target Classes ---
CLASS_MAP = {
    QtCore.Qt.Key.Key_1: ("C01", "Hydraulic_Horn"),
    QtCore.Qt.Key.Key_2: ("C02", "Bus"),
    QtCore.Qt.Key.Key_3: ("C03", "Truck"),
    QtCore.Qt.Key.Key_4: ("C04", "Private_Car"),
    QtCore.Qt.Key.Key_5: ("C05", "Motorcycle"),
    QtCore.Qt.Key.Key_6: ("C06", "CNG_Autorickshaw"),
    QtCore.Qt.Key.Key_7: ("C07", "Easybike_Leguna"),
    QtCore.Qt.Key.Key_8: ("C08", "Rickshaw_Bell"),
    QtCore.Qt.Key.Key_9: ("C09", "Background_Traffic_Noise")
}

class AudioEngine:
    """Manages audio streams and the RAM circular ring buffer."""
    def __init__(self, sample_rate=SAMPLE_RATE, channels=CHANNELS, buffer_sec=BUFFER_SECONDS):
        self.sample_rate = sample_rate
        self.channels = channels
        self.buffer_size = int(sample_rate * buffer_sec)
        self.ring_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.write_index = 0
        self.is_running = False
        self.stream = None
        self.lock = threading.Lock()
        self.current_peak_dbfs = -100.0

    def audio_callback(self, indata, frames, time_info, status):
        """Audio callback triggered by low-level hardware driver."""
        if status:
            print(f"[Warning] Audio Stream Status: {status}")
        
        audio_chunk = indata[:, 0]
        
        # Calculate Peak dBFS
        peak_amp = np.max(np.abs(audio_chunk))
        if peak_amp > 1e-7:
            self.current_peak_dbfs = 20 * np.log10(peak_amp)
        else:
            self.current_peak_dbfs = -100.0

        # Circular buffer insertion with thread safety
        with self.lock:
            n = len(audio_chunk)
            if self.write_index + n <= self.buffer_size:
                self.ring_buffer[self.write_index:self.write_index + n] = audio_chunk
                self.write_index = (self.write_index + n) % self.buffer_size
            else:
                part1 = self.buffer_size - self.write_index
                part2 = n - part1
                self.ring_buffer[self.write_index:] = audio_chunk[:part1]
                self.ring_buffer[:part2] = audio_chunk[part1:]
                self.write_index = part2

    def start(self, device_id=None):
        self.is_running = True
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype=DTYPE,
            callback=self.audio_callback,
            device=device_id,
            blocksize=1024
        )
        self.stream.start()

    def stop(self):
        self.is_running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()

    def get_latest_samples(self, n_samples):
        """Fetches the last N samples cleanly from the circular buffer."""
        with self.lock:
            if self.write_index >= n_samples:
                return self.ring_buffer[self.write_index - n_samples:self.write_index].copy()
            else:
                part1 = self.ring_buffer[self.buffer_size - (n_samples - self.write_index):]
                part2 = self.ring_buffer[:self.write_index]
                return np.concatenate((part1, part2))


class AcquisitionGUI(QtWidgets.QMainWindow):
    """Main Graphic User Interface for field data collection."""
    def __init__(self, audio_engine: AudioEngine):
        super().__init__()
        self.audio_engine = audio_engine
        self.init_directories()
        self.init_ui()
        
        # Periodic UI update timer (30 FPS)
        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.update_live_display)
        self.timer.start(33)

        self.sample_count = self.get_initial_sample_count()

    def init_directories(self):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        os.makedirs(os.path.dirname(METADATA_FILE), exist_ok=True)
        if not os.path.exists(METADATA_FILE):
            df_init = pd.DataFrame(columns=[
                "sample_id", "filename", "class_id", "vehicle_class",
                "timestamp", "location", "distance_m", "measured_spl_dba",
                "peak_dbfs", "duration_sec", "sample_rate", "notes"
            ])
            df_init.to_csv(METADATA_FILE, index=False)

    def get_initial_sample_count(self):
        if os.path.exists(METADATA_FILE):
            df = pd.read_csv(METADATA_FILE)
            return len(df)
        return 0

    def init_ui(self):
        self.setWindowTitle("AcousticAcquire-BD: Vehicle Horn Data Logger")
        self.resize(1100, 750)
        self.setStyleSheet("background-color: #1e1e2e; color: #cdd6f4; font-family: Segoe UI, sans-serif;")

        main_widget = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(main_widget)

        # Header Title
        title_label = QtWidgets.QLabel("AcousticAcquire-BD: Vehicle Horn Data Acquisition Suite")
        title_label.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Weight.Bold))
        title_label.setStyleSheet("color: #89b4fa; padding: 6px;")
        layout.addWidget(title_label)

        # Top Control Row (Location, Distance, SPL, Status)
        ctrl_box = QtWidgets.QGroupBox("Session Parameters")
        ctrl_box.setStyleSheet("QGroupBox { font-weight: bold; border: 1px solid #45475a; border-radius: 6px; margin-top: 6px; padding: 10px; }")
        ctrl_layout = QtWidgets.QHBoxLayout(ctrl_box)

        self.loc_input = QtWidgets.QLineEdit("Gabtoli_Terminal")
        self.loc_input.setPlaceholderText("Location")
        self.loc_input.setStyleSheet("background: #313244; padding: 5px; border-radius: 4px;")
        ctrl_layout.addWidget(QtWidgets.QLabel("Location:"))
        ctrl_layout.addWidget(self.loc_input)

        self.dist_input = QtWidgets.QComboBox()
        self.dist_input.addItems(["3m", "5m", "7m", "10m", "15m", "Overbridge_45deg"])
        self.dist_input.setStyleSheet("background: #313244; padding: 5px;")
        ctrl_layout.addWidget(QtWidgets.QLabel("Distance:"))
        ctrl_layout.addWidget(self.dist_input)

        self.spl_input = QtWidgets.QDoubleSpinBox()
        self.spl_input.setRange(40.0, 140.0)
        self.spl_input.setValue(95.0)
        self.spl_input.setSuffix(" dBA")
        self.spl_input.setStyleSheet("background: #313244; padding: 5px;")
        ctrl_layout.addWidget(QtWidgets.QLabel("SLM Reading:"))
        ctrl_layout.addWidget(self.spl_input)

        self.clipping_badge = QtWidgets.QLabel("CLEAN SIGNAL")
        self.clipping_badge.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        self.clipping_badge.setStyleSheet("background: #a6e3a1; color: #11111b; font-weight: bold; padding: 6px; border-radius: 4px; min-width: 140px;")
        ctrl_layout.addWidget(self.clipping_badge)

        layout.addWidget(ctrl_box)

        # Real-time Plots (Waveform & Spectrum)
        pg.setConfigOption('background', '#181825')
        pg.setConfigOption('foreground', '#cdd6f4')
        
        self.plot_widget = pg.GraphicsLayoutWidget()
        layout.addWidget(self.plot_widget)

        self.wave_plot = self.plot_widget.addPlot(title="Real-Time Audio Waveform (Last 1 sec)")
        self.wave_plot.setYRange(-1.0, 1.0)
        self.wave_curve = self.wave_plot.plot(pen=pg.mkPen('#89b4fa', width=1.5))

        self.plot_widget.nextRow()
        self.spec_plot = self.plot_widget.addPlot(title="Fast FFT Spectrum (0 - 10 kHz)")
        self.spec_plot.setXRange(0, 10000)
        self.spec_plot.setYRange(-80, 0)
        self.spec_curve = self.spec_plot.plot(pen=pg.mkPen('#f38ba8', width=1.5))

        # Bottom Hotkey Guide
        guide_box = QtWidgets.QGroupBox("One-Touch Hotkey Event Logger (Press Keys 1 - 9 on Keyboard)")
        guide_box.setStyleSheet("QGroupBox { font-weight: bold; border: 1px solid #45475a; border-radius: 6px; margin-top: 6px; padding: 8px; }")
        guide_layout = QtWidgets.QGridLayout(guide_box)

        keys_info = [
            ("[Key 1]", "Hydraulic Horn (Banned)", "#f38ba8"),
            ("[Key 2]", "Bus (Air/Electric)", "#fab387"),
            ("[Key 3]", "Truck / Lorry", "#f9e2af"),
            ("[Key 4]", "Private Car / SUV", "#a6e3a1"),
            ("[Key 5]", "Motorcycle", "#94e2d5"),
            ("[Key 6]", "CNG Auto-rickshaw", "#89dceb"),
            ("[Key 7]", "Easybike / Leguna", "#74c7ec"),
            ("[Key 8]", "Rickshaw Bell/Bulb", "#b4befe"),
            ("[Key 9]", "Traffic Background Noise", "#cba6f7")
        ]

        for idx, (k, label, color) in enumerate(keys_info):
            lbl = QtWidgets.QLabel(f"<b>{k}</b>: {label}")
            lbl.setStyleSheet(f"color: {color}; padding: 3px; font-size: 13px;")
            guide_layout.addWidget(lbl, idx // 3, idx % 3)

        layout.addWidget(guide_box)

        # Status Bar
        self.status_label = QtWidgets.QLabel(f"Total Logged Events: {self.sample_count} | Ready to record...")
        self.status_label.setStyleSheet("color: #a6adc8; padding: 4px; font-weight: bold;")
        layout.addWidget(self.status_label)

        self.setCentralWidget(main_widget)

    def keyPressEvent(self, event: QtGui.QKeyEvent):
        key = event.key()
        if key in CLASS_MAP:
            class_id, class_name = CLASS_MAP[key]
            self.trigger_event_capture(class_id, class_name)
        else:
            super().keyPressEvent(event)

    def trigger_event_capture(self, class_id, class_name):
        """Captures the event synchronously from ring buffer and saves asynchronously."""
        # Grab the last TOTAL_EVENT_SEC samples
        n_samples = int(TOTAL_EVENT_SEC * SAMPLE_RATE)
        event_audio = self.audio_engine.get_latest_samples(n_samples)

        self.sample_count += 1
        sample_str = f"{self.sample_count:04d}"
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        location_str = self.loc_input.text().strip().replace(" ", "_")
        distance_str = self.dist_input.currentText()
        measured_spl = self.spl_input.value()
        peak_db = self.audio_engine.current_peak_dbfs

        filename = f"BDHORN_{class_id}_{class_name.upper()}_{location_str}_{sample_str}.wav"
        filepath = os.path.join(OUTPUT_DIR, filename)

        # Visual feedback on UI
        self.status_label.setText(f"SAVED [{class_name}] -> {filename} (Total: {self.sample_count})")
        self.status_label.setStyleSheet("color: #a6e3a1; font-weight: bold;")

        # Save to disk in background thread to avoid UI lag
        threading.Thread(target=self._save_worker, args=(
            filepath, event_audio, sample_str, filename, class_id, class_name,
            timestamp_str, location_str, distance_str, measured_spl, peak_db
        )).start()

    def _save_worker(self, filepath, audio, sample_id, filename, class_id, class_name,
                     timestamp, location, distance, spl, peak_db):
        # 1. Write WAV file (24-bit PCM)
        sf.write(filepath, audio, SAMPLE_RATE, subtype='PCM_24')

        # 2. Append to Master Metadata CSV
        meta_row = {
            "sample_id": sample_id,
            "filename": filename,
            "class_id": class_id,
            "vehicle_class": class_name,
            "timestamp": timestamp,
            "location": location,
            "distance_m": distance,
            "measured_spl_dba": spl,
            "peak_dbfs": round(peak_db, 2),
            "duration_sec": TOTAL_EVENT_SEC,
            "sample_rate": SAMPLE_RATE,
            "notes": "Logged via AcousticAcquire-BD"
        }
        df_new = pd.DataFrame([meta_row])
        df_new.to_csv(METADATA_FILE, mode='a', header=not os.path.exists(METADATA_FILE), index=False)

    def update_live_display(self):
        """Updates waveform, FFT, and clipping indicators."""
        # Update 1-second waveform
        wave_samples = self.audio_engine.get_latest_samples(SAMPLE_RATE // 4)
        self.wave_curve.setData(wave_samples[::8]) # Downsample for smooth 60fps rendering

        # Update FFT Spectrum
        if len(wave_samples) >= 1024:
            windowed = wave_samples[-1024:] * np.hanning(1024)
            fft_mag = np.abs(np.fft.rfft(windowed)) / 512.0
            fft_db = 20 * np.log10(np.maximum(fft_mag, 1e-6))
            freqs = np.fft.rfftfreq(1024, 1.0 / SAMPLE_RATE)
            self.spec_curve.setData(freqs, fft_db)

        # Clipping Alert Check
        peak_db = self.audio_engine.current_peak_dbfs
        if peak_db > -1.0:
            self.clipping_badge.setText("!! CLIPPING WARNING !!")
            self.clipping_badge.setStyleSheet("background: #f38ba8; color: #11111b; font-weight: bold; padding: 6px; border-radius: 4px;")
        elif peak_db > -6.0:
            self.clipping_badge.setText(f"HIGH: {peak_db:.1f} dBFS")
            self.clipping_badge.setStyleSheet("background: #fab387; color: #11111b; font-weight: bold; padding: 6px; border-radius: 4px;")
        else:
            self.clipping_badge.setText(f"CLEAN: {peak_db:.1f} dBFS")
            self.clipping_badge.setStyleSheet("background: #a6e3a1; color: #11111b; font-weight: bold; padding: 6px; border-radius: 4px;")


def main():
    app = QtWidgets.QApplication(sys.argv)
    
    # Initialize Engine
    engine = AudioEngine()
    engine.start()

    gui = AcquisitionGUI(engine)
    gui.show()

    exit_code = app.exec()
    engine.stop()
    sys.exit(exit_code)

if __name__ == '__main__':
    main()
```

---

## অধ্যায় ৪: সিস্টেম টেস্টিং ও ভ্যালিডেশন (Bench & Pilot Testing)

মাঠে বড় পরিসরে ডেটা কালেকশনে নামার পূর্বে পুরো রিগ ও সফটওয়্যারটিকে ৩টি ধাপে ল্যাবে ভ্যালিডেশন করতে হবে:

```
[Phase A: Bench Noise Floor Test] ──► [Phase B: Video Sync Test] ──► [Phase C: 50-Sample Pilot Run]
 (Verify Mic SNR & Zero Hum)           (Timecode / Visual Match)      (Field Gain Verification)
```

### ৪.১ ল্যাব টেস্ট: নয়েজ ফ্লোর ও ইলেকট্রিক্যাল হাম অডিট
1. রিগটিকে একটি সম্পূর্ণ নীরব রুমে স্থাপন করুন।
2. গেইন নব কাঙ্ক্ষিত অবস্থানে রেখে সফটওয়্যারে ৫ সেকেন্ডের একটি টেস্ট রেকর্ডিং নিন।
3. স্পেকট্রাম পর্যবেক্ষণ করুন:
   - **50 Hz বা 60 Hz হাম:** স্পেকট্রামে যদি ঠিক 50 Hz-এ কোনো উঁচু স্পাইক থাকে, তবে বুঝতে হবে ক্যাবল শিল্ডিংয়ে সমস্যা অথবা ল্যাপটপ চার্জারে কানেক্টেড। সমাধান: ল্যাপটপ ব্যাটারিতে চালান এবং প্রফেশনাল শিল্ডেড এক্সএলআর ক্যাবল ব্যবহার করুন।
   - **নয়েজ ফ্লোর:** ব্যাকগ্রাউন্ড অডিওর পিক যেন অবশ্যই **-50 dBFS থেকে -60 dBFS**-এর নিচে থাকে।

---

### ৪.২ অডিও-ভিডিও টাইমস্ট্যাম্প সিঙ্ক ভেরিফিকেশন (Clapperboard Test)
গ্রাউন্ড-ট্রুথ ক্যামেরার সাথে অডিও সফটওয়্যারের সময় যেন নিখুঁত মিলি-সেকেন্ডে মিলে, তার জন্য:
1. ক্যামেরা অন করে ট্রাইপডের সামনে হাত দিয়ে একটি জোরে তালি (Clap) দিন।
2. সফটওয়্যারে `Key 8` (বা যেকোনো কি) প্রেস করুন।
3. পরবর্তীতে ভিডিওতে হাত দুটি স্পর্শ করার ফ্রেমের টাইমকোড এবং অডিও ফাইলের ট্রানজিয়েন্ট স্পাইকের টাইমকোড মিলিয়ে দেখুন।两者 যেন ১০০% ম্যাচ করে।

---

### ৪.৩ ফিল্ড পাইলট ট্রায়াল (৫০টি স্যাম্পল টেস্ট রান)
* আপনার এলাকার নিকটস্থ কোনো রাস্তায় (যেখানে মাঝারি ট্রাফিক আছে) গিয়ে ট্রাইপড সেট করে ৫০টি হর্ন রেকর্ড করুন।
* চেক করুন:
  - কোনো অডিও ফাইলে উইন্ড পপ (খসখস শব্দ) হচ্ছে কি না।
  - দ্রুতগতির গাড়ির হর্নে কোনো ক্লিপিং (> -0.5 dBFS) হয়েছে কি না।
  - কিবোর্ডের হট-কি চাপার পর সফটওয়্যার ক্র্যাশ বা ল্যাগ করছে কি না।
* এই ৫০টি স্যাম্পল Audacity-তে ওপেন করে শুনুন। শব্দ পরিষ্কার ও পারফেক্ট হলে সিস্টেমটি ফুল-স্কেল ফিল্ড ডেটা কালেকশনের জন্য শতভাগ রেডি!

---

## অধ্যায় ৫: ফিল্ড অপারেশন্স ম্যানুয়াল (SOP - Standard Operating Procedure)

মাঠে গিয়ে কাজ করার সময় নিচে উল্লেখিত স্ট্যান্ডার্ড অপারেটিং প্রসিডিউর (SOP) মেনে কাজ করতে হবে:

### ৫.১ প্রি-ডিপার্চার চেকলিস্ট (ঘর থেকে বের হওয়ার আগে)
- [ ] ট্রাইপড এবং শটগান মাইক্রোফোন প্যাক করা হয়েছে।
- [ ] মাইক্রোফোনে **Furry Deadcat** লাগানো আছে।
- [ ] অডিও ইন্টারফেস ও ইউএসবি ক্যাবল ব্যাগে নেওয়া হয়েছে।
- [ ] ডেসিবল মিটারের ব্যাটারি ফুল চার্জ।
- [ ] ল্যাপটপ ১০০% চার্জ এবং ২০,০০০ mAh পাওয়ার ব্যাংক সাথে আছে।
- [ ] গবেষকদের জন্য **Hi-Vis Reflective Safety Vest** (নিরাপত্তা জ্যাকেট) নেওয়া হয়েছে।
- [ ] বিশ্ববিদ্যালয়ের স্টুডেন্ট আইডি কার্ড ও সুপারভাইজারের স্বাক্ষরিত রিসার্চ অথরাইজেশন লেটার সাথে আছে।

---

### ৫.২ অন-সাইট সেটআপ ও জ্যামিতিক পজিশনিং

```
                                  [ Flow of Traffic ]
=========================================\===/=========================================
                                          | | (Vehicles Moving)
                                          | |
                                         /   \
                                        / 45° \   <-- Target Angle
                                       /       \
[ Road Curb / Pavement Edge ] --------/---------\-------------------------------------
                                     /
                                    / 3m to 10m Distance
                                   /
                                  v
                    [ Standardized Hardware Rig ]
                    - Tripod Height: 1.50 meters
                    - Deadcat facing on-coming traffic at 45°
                    - Researcher on Laptop with Hotkey Logger
```

1. **নিরাপদ স্থান নির্বাচন:** ফুটপাত বা আইল্যান্ডের নিরাপদ প্রান্তে দাঁড়ান। কখনো ক্যারেজওয়েতে নামবেন না।
2. **উচ্চতা:** ট্রাইপডের উচ্চতা ফিতা দিয়ে মেপে ঠিক **১.৫ মিটার** করুন।
3. **কোণ:** মাইক্রোফোনটি ট্রাফিক প্রবাহের সাথে **৪৫ ডিগ্রি কোণে** তাক করুন।
4. **সফটওয়্যার চালু:** ল্যাপটপে `python system/logger_app.py` রান করুন। লোকেশনের নাম (যেমন: `Gabtoli_Terminal` বা `Mawa_Highway`) এবং দূরত্ব সিলেক্ট করুন।

---

### ৫.৩ অ্যাক্টিভ রেকর্ডিং চলাকালীন দায়িত্ব বণ্টন (Team of Two)
মাঠে দুজন গবেষক থাকা সর্বোত্তম:
* **গবেষক ১ (Audio & System Operator):** 
  - ল্যাপটপ হাতে বা ট্রাইপড ট্রের ওপর রেখে স্ক্রিনে চোখ রাখবেন।
  - সামনের গাড়ি লক্ষ্য করবেন এবং হর্ন বাজামাত্র হট-কি (`1` থেকে `9`) প্রেস করবেন।
  - ক্লিপিং হচ্ছে কি না স্ক্রিনের ব্যাজে নজর রাখবেন।
* **গবেষক ২ (Traffic Watcher & SLM Logger):** 
  - ডেসিবল মিটার হাতে ধরে হর্নের সর্বোচ্চ রিডিংটি নোট করবেন।
  - ট্রাফিকের সেফটি নিশ্চিত করবেন এবং গাড়ির নম্বর বা অতিরিক্ত তথ্য নোটে লিখে রাখবেন।

---

### ৫.৪ পোস্ট-রেকর্ডিং ব্যাকআপ ও ডাটা ভেরিফিকেশন (Daily Wrap-Up)
দিনের কাজ শেষ করে ল্যাবে ফিরে:
1. সংগৃহীত সব `.wav` ফাইল এবং `metadata_master.csv` ফাইলের একটি তাৎক্ষণিক ব্যাকআপ গুগল ড্রাইভে বা এক্সটার্নাল হার্ডড্রাইভে নিন (3-2-1 Backup Rule)।
2. একটি অটোমেটেড ভ্যালিডেশন স্ক্রিপ্ট চালিয়ে দেখুন কোনো করাপ্টেড ফাইল বা নাল মেটাডাটা রো রয়েছে কি না।
3. ক্লাস কাউন্ট দেখে নিন কোন ক্লাসের স্যাম্পল কতটি হলো (যেমন: হাইড্রোলিক হর্ন ৬০টি, বাস ৭০টি, রিকশা ১০০টি ইত্যাদি)।

---

## ৬. সংক্ষেপ ও পরবর্তী পদক্ষেপ

এই নির্দেশিকাটি অনুসরণের মাধ্যমে আপনার সিস্টেমটি সম্পূর্ণ প্রস্তুত হবে। 

এখন আমরা সরাসরি **`system/` ফোল্ডারে সফটওয়্যার কোডটি লিখে ফেলতে পারি এবং এর ডিপেন্ডেন্সি ফাইল প্রস্তুত করতে পারি**। আপনি জানালে আমি প্রজেক্ট ডিরেক্টরিতে `system/logger_app.py` এবং সংশ্লিষ্ট স্ক্রিপ্টগুলো তৈরি করে দেব!
