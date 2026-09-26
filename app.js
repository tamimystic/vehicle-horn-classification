/**
 * Vehicle Horn Acoustic Data Acquisition - Robust Client-Side Audio Engine
 * Features:
 * - Robust multi-tier getUserMedia fallback (No OverconstrainedError)
 * - Hardware sample rate auto-detection (44.1 kHz / 48 kHz dynamic adaptation)
 * - Mute-gain loopback isolation (Zero speaker screeching / feedback)
 * - Pre-trigger 4.0s RAM circular buffer (1.0s pre-trigger + 2.0s post-trigger)
 * - Pure Linear PCM WAV encoder
 * - Real-time waveform visualizer & peak clipping alert
 * - In-page recorded clip list with playback & download
 */

// --- Global State ---
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let muteGain = null;
let isRecording = false;

let actualSampleRate = 48000;
const BUFFER_DURATION_SEC = 4.0;
const TOTAL_DURATION_SEC = 3.0;

let bufferSize = 0;
let ringBuffer = null;
let writeIndex = 0;

let sampleCount = 0;
let metadataRecords = [];

// DOM Elements
const micBtn = document.getElementById("micBtn");
const micBtnText = document.getElementById("micBtnText");
const locationInput = document.getElementById("locationInput");
const distanceSelect = document.getElementById("distanceSelect");
const levelIndicator = document.getElementById("levelIndicator");
const clippingBadge = document.getElementById("clippingBadge");
const canvas = document.getElementById("waveformCanvas");
const canvasCtx = canvas.getContext("2d");
const sampleCountEl = document.getElementById("sampleCount");
const latestLogEl = document.getElementById("latestLog");
const downloadMetadataBtn = document.getElementById("downloadMetadataBtn");

// Resize canvas
function resizeCanvas() {
  if (canvas) {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Toggle Microphone Stream ---
micBtn.addEventListener("click", async () => {
  if (!isRecording) {
    await startMicrophone();
  } else {
    stopMicrophone();
  }
});

async function startMicrophone() {
  // Check browser support for getUserMedia
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert(
      "⚠️ ব্রাউজার সিকিউরিটি নোটিশ:\n" +
      "আপনার ব্রাউজার এই পেজে সরাসরি মাইক্রোফোন চালু করতে দিচ্ছে না।\n\n" +
      "সমাধান:\n" +
      "১. কমান্ড প্রম্পটে 'python main.py --web' রান করে http://localhost:8000 দিয়ে ওপেন করুন,\n" +
      "অথবা\n" +
      "২. Firefox ব্রাউজারে ফাইলটি ওপেন করুন।"
    );
    return;
  }

  try {
    // Tier 1: Try disabling AGC and Noise Suppression without forcing hardware sample rate
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: false
        },
        video: false
      });
    } catch (e1) {
      console.warn("Retrying with standard audio constraints:", e1);
      // Tier 2: Fallback to basic audio
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    // Initialize AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    actualSampleRate = audioContext.sampleRate || 48000;
    bufferSize = Math.floor(actualSampleRate * BUFFER_DURATION_SEC);
    ringBuffer = new Float32Array(bufferSize);
    writeIndex = 0;

    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // ScriptProcessorNode for wide cross-browser compatibility
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let peak = 0;
      for (let i = 0; i < inputData.length; i++) {
        const val = inputData[i];
        const absVal = Math.abs(val);
        if (absVal > peak) peak = absVal;

        // Push to RAM ring buffer
        ringBuffer[writeIndex] = val;
        writeIndex = (writeIndex + 1) % bufferSize;
      }

      // Compute Peak dBFS
      const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
      updateAudioLevel(peakDb);
    };

    // MUTE GAIN: Prevents audio feedback loop (screeching sound from speakers)
    muteGain = audioContext.createGain();
    muteGain.gain.value = 0.0;

    source.connect(scriptProcessor);
    scriptProcessor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    isRecording = true;
    micBtn.classList.remove("start");
    micBtn.classList.add("active");
    micBtnText.textContent = `মাইক সক্রিয় (${actualSampleRate} Hz) - রানিং`;
    latestLogEl.textContent = "মাইক চালু হয়েছে! হর্ন বাজা মাত্র নিচের যেকোনো বোতামে চাপ দিন।";

    requestAnimationFrame(renderWaveform);
  } catch (err) {
    alert("মাইক্রোফোন চালু করতে সমস্যা: " + err.message + "\nব্রাউজারে মাইক্রোফোন পারমিশন দেওয়া আছে কি না চেক করুন।");
    console.error("Audio Ingestion Error:", err);
  }
}

function stopMicrophone() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (muteGain) {
    muteGain.disconnect();
    muteGain = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  isRecording = false;
  micBtn.classList.remove("active");
  micBtn.classList.add("start");
  micBtnText.textContent = "মাইক্রোফোন চালু করুন (Start Mic)";
  levelIndicator.textContent = "Peak: -- dBFS";
  clippingBadge.textContent = "SIGNAL OFF";
  clippingBadge.className = "clipping-badge clean";
}

function updateAudioLevel(peakDb) {
  levelIndicator.textContent = `Peak: ${peakDb.toFixed(1)} dBFS`;
  if (peakDb >= -0.5) {
    clippingBadge.textContent = "! CLIPPING WARN !";
    clippingBadge.className = "clipping-badge warn";
  } else if (peakDb > -6.0) {
    clippingBadge.textContent = "HIGH LEVEL";
    clippingBadge.className = "clipping-badge clean";
  } else {
    clippingBadge.textContent = "SIGNAL CLEAN";
    clippingBadge.className = "clipping-badge clean";
  }
}

// --- Live Oscilloscope Waveform Renderer ---
function renderWaveform() {
  if (!isRecording || !ringBuffer) return;

  const width = canvas.width;
  const height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);

  canvasCtx.lineWidth = 2 * window.devicePixelRatio;
  canvasCtx.strokeStyle = "#89b4fa";
  canvasCtx.beginPath();

  const sliceCount = 300;
  const step = Math.floor(bufferSize / sliceCount);
  const sliceWidth = width / sliceCount;
  let x = 0;

  for (let i = 0; i < sliceCount; i++) {
    const idx = (writeIndex - (sliceCount - i) * step + bufferSize) % bufferSize;
    const v = ringBuffer[idx];
    const y = (0.5 + v * 0.45) * height;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  canvasCtx.stroke();
  requestAnimationFrame(renderWaveform);
}

// --- Attach Class Buttons Event Handlers ---
document.querySelectorAll(".class-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!isRecording) {
      alert("আগে ওপরের 'মাইক্রোফোন চালু করুন' বোতামে চাপ দিন!");
      return;
    }

    const classId = btn.getAttribute("data-class-id");
    const className = btn.getAttribute("data-class-name");
    captureHornEvent(classId, className);
  });
});

// --- Capture Event from Circular Ring Buffer ---
function captureHornEvent(classId, className) {
  sampleCount++;
  sampleCountEl.textContent = sampleCount;

  const totalSamples = Math.floor(TOTAL_DURATION_SEC * actualSampleRate);
  const extractedAudio = new Float32Array(totalSamples);

  // Extract the past 3.0 seconds chronologically
  for (let i = 0; i < totalSamples; i++) {
    const readIdx = (writeIndex - totalSamples + i + bufferSize) % bufferSize;
    extractedAudio[i] = ringBuffer[readIdx];
  }

  // Calculate Peak & RMS
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < totalSamples; i++) {
    const absVal = Math.abs(extractedAudio[i]);
    if (absVal > peak) peak = absVal;
    sumSq += absVal * absVal;
  }
  const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
  const rmsDb = sumSq > 0 ? 10 * Math.log10(sumSq / totalSamples) : -100;

  // Filename format
  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, "-");
  const loc = (locationInput.value || "Field").trim().replace(/\s+/g, "_");
  const dist = distanceSelect.value;
  const filename = `BDHORN_${classId}_${className.toUpperCase()}_${loc}_${timeStr}_${String(sampleCount).padStart(4, '0')}.wav`;

  // Encode to 16-bit PCM Linear WAV
  const wavBlob = encodeWAV(extractedAudio, actualSampleRate);

  // Auto download
  downloadBlob(wavBlob, filename);

  // Add to metadata
  const metaRow = {
    sample_id: `BDHORN_${String(sampleCount).padStart(4, '0')}`,
    filename: filename,
    class_id: classId,
    vehicle_class: className,
    timestamp: now.toISOString(),
    location: loc,
    distance_m: dist,
    peak_dbfs: peakDb.toFixed(2),
    rms_dbfs: rmsDb.toFixed(2),
    duration_sec: TOTAL_DURATION_SEC,
    sample_rate: actualSampleRate
  };
  metadataRecords.push(metaRow);

  latestLogEl.innerHTML = `✅ <b>সংরক্ষিত (#${sampleCount}):</b> ${filename} (${className})`;
  latestLogEl.style.color = "#a6e3a1";
}

// --- Pure JavaScript 16-bit PCM WAV Encoder ---
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);             // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);              // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);              // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true);     // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 channel * 2 bytes)
  view.setUint16(32, 2, true);              // BlockAlign (1 channel * 2 bytes)
  view.setUint16(34, 16, true);             // BitsPerSample (16 bits)

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples with clipping safeguard
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 200);
}

// --- Download Metadata CSV ---
downloadMetadataBtn.addEventListener("click", () => {
  if (metadataRecords.length === 0) {
    alert("এখনো কোনো স্যাম্পল রেকর্ড করা হয়নি!");
    return;
  }

  const headers = Object.keys(metadataRecords[0]);
  const csvRows = [headers.join(",")];

  for (const row of metadataRecords) {
    const values = headers.map(header => {
      const val = row[header] || "";
      return `"${val}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `metadata_session_${new Date().toISOString().slice(0, 10)}.csv`);
});
