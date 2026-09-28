/**
 * Vehicle Horn Acoustic Data Acquisition Engine
 * Supports dual interaction modes (Tap-to-Toggle and Hold-to-Record),
 * 7-parameter filename schema, in-app review & quality control,
 * and multimodal vehicle photo acquisition.
 */

// Application State
let activeMode = "tap"; // 'tap' or 'hold'
let isRecording = false;
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let muteGain = null;
let actualSampleRate = 48000;
let recordedChunks = [];
let recordingStartTime = 0;
let timerInterval = null;

let currentAudioBlob = null;
let currentPhotoBlob = null;
let currentPhotoFileName = null;
let currentDurationSec = 0;
let currentPeakDb = -100;
let currentRmsDb = -100;

let globalSampleIndex = 1;
const instanceCounters = {}; // Maps `${class}_${model}_${plate}` -> count
const metadataRecords = [];

// DOM Elements
const locationInput = document.getElementById("locationInput");
const distanceSelect = document.getElementById("distanceSelect");
const vehicleClassSelect = document.getElementById("vehicleClassSelect");
const vehicleModelInput = document.getElementById("vehicleModelInput");
const vehiclePlateInput = document.getElementById("vehiclePlateInput");
const gpsBtn = document.getElementById("gpsBtn");

const globalSampleDisplay = document.getElementById("globalSampleDisplay");
const instanceCounterDisplay = document.getElementById("instanceCounterDisplay");

const photoFileInput = document.getElementById("photoFileInput");
const snapPhotoBtn = document.getElementById("snapPhotoBtn");
const photoThumbContainer = document.getElementById("photoThumbContainer");
const photoThumb = document.getElementById("photoThumb");
const removePhotoBtn = document.getElementById("removePhotoBtn");

const levelIndicator = document.getElementById("levelIndicator");
const recordingTimer = document.getElementById("recordingTimer");
const clippingBadge = document.getElementById("clippingBadge");
const canvas = document.getElementById("waveformCanvas");
const canvasCtx = canvas.getContext("2d");

const modeTapBtn = document.getElementById("modeTapBtn");
const modeHoldBtn = document.getElementById("modeHoldBtn");
const mainRecordBtn = document.getElementById("mainRecordBtn");
const recordInstruction = document.getElementById("recordInstruction");

const reviewSection = document.getElementById("reviewSection");
const clipDurationDisplay = document.getElementById("clipDurationDisplay");
const audioPlayback = document.getElementById("audioPlayback");
const reviewDetails = document.getElementById("reviewDetails");
const saveRecordingBtn = document.getElementById("saveRecordingBtn");
const discardRecordingBtn = document.getElementById("discardRecordingBtn");

const sampleCountEl = document.getElementById("sampleCount");
const downloadMetadataBtn = document.getElementById("downloadMetadataBtn");
const latestLogEl = document.getElementById("latestLog");

// Canvas Setup
function resizeCanvas() {
  if (canvas) {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Text Sanitizer (strips forbidden characters for file systems)
function sanitize(str) {
  return (str || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

function getInstanceKey() {
  const cls = sanitize(vehicleClassSelect.value);
  const model = sanitize(vehicleModelInput.value);
  const plate = sanitize(vehiclePlateInput.value);
  return `${cls}_${model}_${plate}`;
}

function updateInstanceCounterDisplay() {
  const key = getInstanceKey();
  const nextNum = (instanceCounters[key] || 0) + 1;
  instanceCounterDisplay.textContent = `Sample #${nextNum}`;
  globalSampleDisplay.textContent = `BDHORN_${String(globalSampleIndex).padStart(4, "0")}`;
}

[vehicleClassSelect, vehicleModelInput, vehiclePlateInput].forEach(el => {
  el.addEventListener("input", updateInstanceCounterDisplay);
});
updateInstanceCounterDisplay();

// Geolocation Auto-Detect
gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  gpsBtn.textContent = "⏳ Locating...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      locationInput.value = `GPS_${lat}_${lon}`;
      gpsBtn.textContent = "📍 GPS Set";
      setTimeout(() => (gpsBtn.textContent = "📍 GPS Location"), 2500);
    },
    (err) => {
      gpsBtn.textContent = "📍 GPS Failed";
      alert("GPS Error: " + err.message);
      setTimeout(() => (gpsBtn.textContent = "📍 GPS Location"), 2000);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// Photo Capture Handlers
snapPhotoBtn.addEventListener("click", () => photoFileInput.click());

photoFileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    currentPhotoBlob = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      photoThumb.src = ev.target.result;
      photoThumbContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

removePhotoBtn.addEventListener("click", () => {
  currentPhotoBlob = null;
  photoFileInput.value = "";
  photoThumb.src = "";
  photoThumbContainer.style.display = "none";
});

// Mode Switching (Tap vs Hold)
modeTapBtn.addEventListener("click", () => {
  activeMode = "tap";
  modeTapBtn.classList.add("active");
  modeHoldBtn.classList.remove("active");
  recordInstruction.textContent = "Tap button once when horn starts, tap again when horn stops";
});

modeHoldBtn.addEventListener("click", () => {
  activeMode = "hold";
  modeHoldBtn.classList.add("active");
  modeTapBtn.classList.remove("active");
  recordInstruction.textContent = "Press and hold button while horn sounds, release to stop";
});

// Dual Interaction Mechanics on Main Record Button
mainRecordBtn.addEventListener("click", async (e) => {
  if (activeMode !== "tap") return;
  e.preventDefault();
  if (!isRecording) {
    await startAudioRecording();
  } else {
    stopAudioRecording();
  }
});

mainRecordBtn.addEventListener("pointerdown", async (e) => {
  if (activeMode !== "hold") return;
  e.preventDefault();
  if (!isRecording) {
    await startAudioRecording();
  }
});

window.addEventListener("pointerup", (e) => {
  if (activeMode === "hold" && isRecording) {
    stopAudioRecording();
  }
});

window.addEventListener("pointercancel", (e) => {
  if (activeMode === "hold" && isRecording) {
    stopAudioRecording();
  }
});

// Core Audio Recording Logic
async function startAudioRecording() {
  if (reviewSection.style.display === "block") {
    // If a previous clip is unreviewed, prompt user
    if (!confirm("Start new recording? Current unreviewed clip will be discarded.")) {
      return;
    }
    reviewSection.style.display = "none";
  }

  try {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (!mediaStream) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
          video: false
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
    }

    actualSampleRate = audioContext.sampleRate || 48000;
    recordedChunks = [];

    const source = audioContext.createMediaStreamSource(mediaStream);
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      recordedChunks.push(new Float32Array(input));

      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const absVal = Math.abs(input[i]);
        if (absVal > peak) peak = absVal;
      }
      const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
      updateAudioLevel(peakDb);
    };

    muteGain = audioContext.createGain();
    muteGain.gain.value = 0.0;
    source.connect(scriptProcessor);
    scriptProcessor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    isRecording = true;
    recordingStartTime = performance.now();

    mainRecordBtn.classList.remove("idle");
    mainRecordBtn.classList.add("recording");
    recordInstruction.textContent = activeMode === "tap" ? "Recording... Tap again to STOP" : "Recording... Release to STOP";

    // Start Live Timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const elapsed = (performance.now() - recordingStartTime) / 1000;
      const mins = Math.floor(elapsed / 60);
      const secs = (elapsed % 60).toFixed(1);
      recordingTimer.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(4, "0")}`;
    }, 50);

    requestAnimationFrame(renderWaveform);
  } catch (err) {
    alert("Microphone Error: " + err.message);
  }
}

function stopAudioRecording() {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(timerInterval);

  mainRecordBtn.classList.remove("recording");
  mainRecordBtn.classList.add("idle");
  recordInstruction.textContent = activeMode === "tap"
    ? "Tap button once when horn starts, tap again when horn stops"
    : "Press and hold button while horn sounds, release to stop";

  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (muteGain) {
    muteGain.disconnect();
    muteGain = null;
  }

  // Flatten recorded Float32Array chunks
  let totalLength = 0;
  for (const chunk of recordedChunks) totalLength += chunk.length;
  const mergedAudio = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of recordedChunks) {
    mergedAudio.set(chunk, offset);
    offset += chunk.length;
  }

  currentDurationSec = mergedAudio.length / actualSampleRate;
  if (currentDurationSec < 0.1) {
    latestLogEl.textContent = "Clip too short (<0.1s). Ignored.";
    return;
  }

  // Audio Stats
  let peak = 0, sumSq = 0;
  for (let i = 0; i < mergedAudio.length; i++) {
    const val = Math.abs(mergedAudio[i]);
    if (val > peak) peak = val;
    sumSq += val * val;
  }
  currentPeakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
  currentRmsDb = sumSq > 0 ? 10 * Math.log10(sumSq / mergedAudio.length) : -100;

  // Encode to WAV Blob
  currentAudioBlob = encodeWAV(mergedAudio, actualSampleRate);

  // Load into Review Player
  const audioUrl = URL.createObjectURL(currentAudioBlob);
  audioPlayback.src = audioUrl;
  clipDurationDisplay.textContent = `${currentDurationSec.toFixed(2)}s`;

  // Compute Target Filenames for Review Details
  const now = new Date();
  const timeStr = formatTimestamp(now);
  const sampleId = `BDHORN_${String(globalSampleIndex).padStart(4, "0")}`;
  const key = getInstanceKey();
  const instanceNum = (instanceCounters[key] || 0) + 1;
  const instanceId = `S${String(instanceNum).padStart(2, "0")}`;
  const loc = sanitize(locationInput.value || "Field");
  const dist = distanceSelect.value;
  const cls = sanitize(vehicleClassSelect.value);
  const model = sanitize(vehicleModelInput.value || "Unknown");
  const plate = sanitize(vehiclePlateInput.value || "Unknown");

  const baseFileName = `${sampleId}_${instanceId}_${loc}_${dist}_${cls}_${model}_${plate}_${timeStr}`;
  const wavName = `${baseFileName}.wav`;
  const photoName = `${baseFileName}.jpg`;

  reviewDetails.innerHTML = `
    <div><strong>Target Audio:</strong> ${wavName}</div>
    ${currentPhotoBlob ? `<div><strong>Target Photo:</strong> ${photoName}</div>` : `<div style="color:#a6adc8;">(No vehicle photo attached)</div>`}
  `;

  // Display review section
  reviewSection.style.display = "block";
  reviewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

function renderWaveform() {
  if (!isRecording) return;
  const width = canvas.width, height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.lineWidth = 2 * window.devicePixelRatio;
  canvasCtx.strokeStyle = "#89b4fa";
  canvasCtx.beginPath();

  if (recordedChunks.length > 0) {
    const lastChunk = recordedChunks[recordedChunks.length - 1];
    const sliceWidth = width / lastChunk.length;
    let x = 0;
    for (let i = 0; i < lastChunk.length; i += 4) {
      const y = (0.5 + lastChunk[i] * 0.45) * height;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth * 4;
    }
  }
  canvasCtx.stroke();
  requestAnimationFrame(renderWaveform);
}

// Review Section Actions
discardRecordingBtn.addEventListener("click", () => {
  currentAudioBlob = null;
  audioPlayback.src = "";
  reviewSection.style.display = "none";
  recordingTimer.textContent = "00:00.0";
  latestLogEl.innerHTML = `<span style="color:#f38ba8;">Clip discarded. Ready for retake.</span>`;
});

saveRecordingBtn.addEventListener("click", () => {
  if (!currentAudioBlob) return;

  const now = new Date();
  const timeStr = formatTimestamp(now);
  const sampleId = `BDHORN_${String(globalSampleIndex).padStart(4, "0")}`;
  const key = getInstanceKey();
  const instanceNum = (instanceCounters[key] || 0) + 1;
  const instanceId = `S${String(instanceNum).padStart(2, "0")}`;
  const loc = sanitize(locationInput.value || "Field");
  const dist = distanceSelect.value;
  const cls = sanitize(vehicleClassSelect.value);
  const model = sanitize(vehicleModelInput.value || "Unknown");
  const plate = sanitize(vehiclePlateInput.value || "Unknown");

  const baseFileName = `${sampleId}_${instanceId}_${loc}_${dist}_${cls}_${model}_${plate}_${timeStr}`;
  const wavFileName = `${baseFileName}.wav`;
  const photoFileName = currentPhotoBlob ? `${baseFileName}.jpg` : "";

  // 1. Download WAV
  downloadBlob(currentAudioBlob, wavFileName);

  // 2. Download Photo if attached
  if (currentPhotoBlob) {
    downloadBlob(currentPhotoBlob, photoFileName);
  }

  // 3. Update Counters & Metadata
  instanceCounters[key] = instanceNum;
  globalSampleIndex++;
  updateInstanceCounterDisplay();

  const record = {
    sample_id: sampleId,
    instance_id: instanceId,
    vehicle_class: cls,
    vehicle_model: model,
    license_plate: plate,
    location: loc,
    distance_m: dist,
    duration_sec: currentDurationSec.toFixed(2),
    peak_dbfs: currentPeakDb.toFixed(2),
    rms_dbfs: currentRmsDb.toFixed(2),
    sample_rate: actualSampleRate,
    audio_filename: wavFileName,
    photo_filename: photoFileName,
    timestamp: now.toISOString()
  };
  metadataRecords.push(record);

  sampleCountEl.textContent = metadataRecords.length;
  latestLogEl.innerHTML = `Saved (#${metadataRecords.length}): <b>${wavFileName}</b>`;
  latestLogEl.style.color = "#a6e3a1";

  // Reset Review State
  currentAudioBlob = null;
  audioPlayback.src = "";
  reviewSection.style.display = "none";
  recordingTimer.textContent = "00:00.0";
});

// Format Timestamp Helper: YYYYMMDD_HHMMSS
function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${m}${day}_${h}${min}${s}`;
}

// WAV Encoder
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// File Download Helper
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
  }, 300);
}

// Metadata CSV Export
downloadMetadataBtn.addEventListener("click", () => {
  if (metadataRecords.length === 0) {
    alert("No recordings saved in this session yet.");
    return;
  }
  const headers = Object.keys(metadataRecords[0]);
  const rows = [headers.join(",")];
  for (const r of metadataRecords) {
    rows.push(headers.map((h) => `"${r[h] || ""}"`).join(","));
  }
  const csvBlob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(csvBlob, `metadata_session_${formatTimestamp(new Date())}.csv`);
});
