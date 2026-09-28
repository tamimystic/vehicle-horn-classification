/**
 * Vehicle Horn Acoustic Data Acquisition Engine - Step 3 Storage & Dual-Layer Routing
 * Implements:
 * 1. Dual-Layer File Organization:
 *    - Layer A: Dataset/Raw_By_Class/<Class>/<AudioFilename>.wav
 *    - Layer B: Dataset/Instances_By_Vehicle/<Class>/<Model_Plate>/<AudioFilename>.wav
 *    - Photo Layer: Dataset/Vehicle_Photos/<PhotoFilename>.jpg
 * 2. Local Directory Binding via File System Access API (Chrome/Edge direct auto-save)
 * 3. Client-Side Offline Persistence via IndexedDB (survives refreshes)
 * 4. Zero-Dependency Standalone Dual-Layer ZIP Exporter
 * 5. Full Relational metadata.csv Management
 */

// Application State
let activeMode = "tap"; // 'tap' or 'hold'
let isRecording = false;
let isMicArmed = false;
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let muteGain = null;
let actualSampleRate = 48000;
let recordedChunks = [];
let liveMonitoringBuffer = new Float32Array(512);
let recordingStartTime = 0;
let timerInterval = null;

let currentAudioBlob = null;
let currentPhotoBlob = null;
let currentDurationSec = 0;
let currentPeakDb = -100;
let currentRmsDb = -100;

let globalSampleIndex = 1;
const instanceCounters = {}; // Maps `${class}_${model}_${plate}` -> count
const metadataRecords = [];

// File System Handle for Direct Auto-Saving
let rootDirectoryHandle = null;

// DOM Elements
const locationInput = document.getElementById("locationInput");
const distanceSelect = document.getElementById("distanceSelect");
const vehicleClassSelect = document.getElementById("vehicleClassSelect");
const vehicleModelInput = document.getElementById("vehicleModelInput");
const vehiclePlateInput = document.getElementById("vehiclePlateInput");
const gpsBtn = document.getElementById("gpsBtn");
const selectDirBtn = document.getElementById("selectDirBtn");
const dirStatusBadge = document.getElementById("dirStatusBadge");

const globalSampleDisplay = document.getElementById("globalSampleDisplay");
const instanceCounterDisplay = document.getElementById("instanceCounterDisplay");

const photoFileInput = document.getElementById("photoFileInput");
const snapPhotoBtn = document.getElementById("snapPhotoBtn");
const photoThumbContainer = document.getElementById("photoThumbContainer");
const photoThumb = document.getElementById("photoThumb");
const removePhotoBtn = document.getElementById("removePhotoBtn");

const armMicBtn = document.getElementById("armMicBtn");
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
const exportZipBtn = document.getElementById("exportZipBtn");
const downloadMetadataBtn = document.getElementById("downloadMetadataBtn");
const clearSessionBtn = document.getElementById("clearSessionBtn");
const latestLogEl = document.getElementById("latestLog");

// Prevent mobile context menu on long press
mainRecordBtn.addEventListener("contextmenu", (e) => e.preventDefault());

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

[vehicleClassSelect, vehicleModelInput, vehiclePlateInput].forEach((el) => {
  el.addEventListener("input", () => {
    updateInstanceCounterDisplay();
    if (currentPhotoBlob) {
      currentPhotoBlob = null;
      photoFileInput.value = "";
      photoThumb.src = "";
      photoThumbContainer.style.display = "none";
    }
  });
});

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
      setTimeout(() => (gpsBtn.textContent = "📍 GPS"), 2500);
    },
    (err) => {
      gpsBtn.textContent = "📍 GPS Failed";
      alert("GPS Error: " + err.message);
      setTimeout(() => (gpsBtn.textContent = "📍 GPS"), 2000);
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

// Zero-Latency Microphone Pre-warming (Arming)
if (armMicBtn) {
  armMicBtn.addEventListener("click", async () => {
    if (!isMicArmed) {
      await preArmMicrophone();
    }
  });
}

async function preArmMicrophone() {
  if (isMicArmed) return true;
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
    const source = audioContext.createMediaStreamSource(mediaStream);
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      liveMonitoringBuffer = input;

      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const absVal = Math.abs(input[i]);
        if (absVal > peak) peak = absVal;
      }
      const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
      updateAudioLevel(peakDb);

      if (isRecording) {
        recordedChunks.push(new Float32Array(input));
      }
    };

    muteGain = audioContext.createGain();
    muteGain.gain.value = 0.0;
    source.connect(scriptProcessor);
    scriptProcessor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    isMicArmed = true;
    if (armMicBtn) {
      armMicBtn.textContent = "🟢 Mic Armed (0ms)";
      armMicBtn.classList.add("armed");
    }
    requestAnimationFrame(renderWaveform);
    return true;
  } catch (err) {
    if (armMicBtn) armMicBtn.textContent = "❌ Mic Error";
    alert("Microphone Error: " + err.message);
    return false;
  }
}

// Dual Interaction Mechanics with Pointer Capture
let isPointerHeld = false;

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
  isPointerHeld = true;
  try {
    mainRecordBtn.setPointerCapture(e.pointerId);
  } catch {}
  await startAudioRecording();
});

mainRecordBtn.addEventListener("pointerup", (e) => {
  if (activeMode !== "hold") return;
  e.preventDefault();
  if (isPointerHeld) {
    isPointerHeld = false;
    try {
      mainRecordBtn.releasePointerCapture(e.pointerId);
    } catch {}
    if (isRecording) stopAudioRecording();
  }
});

mainRecordBtn.addEventListener("pointercancel", (e) => {
  if (activeMode !== "hold") return;
  if (isPointerHeld) {
    isPointerHeld = false;
    try {
      mainRecordBtn.releasePointerCapture(e.pointerId);
    } catch {}
    if (isRecording) stopAudioRecording();
  }
});

// Core Audio Recording Logic
async function startAudioRecording() {
  if (reviewSection.style.display === "block") {
    reviewSection.style.display = "none";
  }

  if (!isMicArmed) {
    const ok = await preArmMicrophone();
    if (!ok) return;
  }

  recordedChunks = [];
  isRecording = true;
  recordingStartTime = performance.now();

  if (navigator.vibrate) {
    try { navigator.vibrate(40); } catch {}
  }

  mainRecordBtn.classList.remove("idle");
  mainRecordBtn.classList.add("recording");
  recordInstruction.textContent = activeMode === "tap" ? "Recording... Tap again to STOP" : "Recording... Release to STOP";

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = (performance.now() - recordingStartTime) / 1000;
    const mins = Math.floor(elapsed / 60);
    const secs = (elapsed % 60).toFixed(1);
    recordingTimer.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(4, "0")}`;
  }, 50);
}

function stopAudioRecording() {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(timerInterval);

  if (navigator.vibrate) {
    try { navigator.vibrate([30, 40, 30]); } catch {}
  }

  mainRecordBtn.classList.remove("recording");
  mainRecordBtn.classList.add("idle");
  recordInstruction.textContent = activeMode === "tap"
    ? "Tap button once when horn starts, tap again when horn stops"
    : "Press and hold button while horn sounds, release to stop";

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

  // Remove DC Offset (1st order High-Pass filter R=0.995)
  let prevX = 0, prevY = 0;
  for (let i = 0; i < mergedAudio.length; i++) {
    const x = mergedAudio[i];
    const y = x - prevX + 0.995 * prevY;
    prevX = x;
    prevY = y;
    mergedAudio[i] = y;
  }

  // Compute True Peak & RMS dBFS
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

  // Compute Target Filenames & Paths
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
    <div><strong>1. Class Layer:</strong> <span class="path-tag">Dataset/Raw_By_Class/${cls}/${wavName}</span></div>
    <div><strong>2. Instance Layer:</strong> <span class="path-tag">Dataset/Instances_By_Vehicle/${cls}/${model}_${plate}/${wavName}</span></div>
    ${currentPhotoBlob ? `<div><strong>3. Photo Layer:</strong> <span class="path-tag">Dataset/Vehicle_Photos/${photoName}</span></div>` : `<div style="color:#a6adc8;">(No vehicle photo attached)</div>`}
  `;

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
  if (!isMicArmed) return;
  const width = canvas.width, height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.lineWidth = 2 * window.devicePixelRatio;
  canvasCtx.strokeStyle = isRecording ? "#f38ba8" : "#89b4fa";
  canvasCtx.beginPath();

  const buf = liveMonitoringBuffer;
  if (buf && buf.length > 0) {
    const sliceWidth = width / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i += 2) {
      const y = (0.5 + buf[i] * 0.45) * height;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth * 2;
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

saveRecordingBtn.addEventListener("click", async () => {
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

  const record = {
    sample_id: sampleId,
    instance_id: instanceId,
    filename: wavFileName,
    audio_filename: wavFileName,
    photo_filename: photoFileName,
    vehicle_class: cls,
    vehicle_model: model,
    license_plate: plate,
    location: loc,
    distance_m: dist,
    duration_sec: currentDurationSec.toFixed(2),
    peak_dbfs: currentPeakDb.toFixed(2),
    rms_dbfs: currentRmsDb.toFixed(2),
    sample_rate: actualSampleRate,
    timestamp: now.toISOString()
  };

  // 1. Direct File System Auto-Save if folder is bound
  let savedToDisk = false;
  if (rootDirectoryHandle) {
    try {
      await saveDirectToDirectory(rootDirectoryHandle, cls, `${model}_${plate}`, wavFileName, photoFileName, currentAudioBlob, currentPhotoBlob, record);
      savedToDisk = true;
    } catch (err) {
      console.warn("Direct directory save failed, falling back to download:", err);
    }
  }

  // 2. Standard Download Fallback (if not bound to disk)
  if (!savedToDisk) {
    downloadBlob(currentAudioBlob, wavFileName);
    if (currentPhotoBlob) {
      downloadBlob(currentPhotoBlob, photoFileName);
    }
  }

  // 3. Save to IndexedDB Offline Storage
  await saveToIndexedDB(record, currentAudioBlob, currentPhotoBlob);

  // 4. Update In-Memory State
  instanceCounters[key] = instanceNum;
  globalSampleIndex++;
  metadataRecords.push(record);
  updateInstanceCounterDisplay();
  await persistSessionState();

  sampleCountEl.textContent = metadataRecords.length;
  latestLogEl.innerHTML = savedToDisk
    ? `Direct Saved (#${metadataRecords.length}): <b>${wavFileName}</b> (Dual-layer written to disk)`
    : `Saved (#${metadataRecords.length}): <b>${wavFileName}</b> (Cached offline & downloaded)`;
  latestLogEl.style.color = "#a6e3a1";

  // Reset Review & Photo State
  currentAudioBlob = null;
  audioPlayback.src = "";
  reviewSection.style.display = "none";
  recordingTimer.textContent = "00:00.0";
  currentPhotoBlob = null;
  photoFileInput.value = "";
  photoThumb.src = "";
  photoThumbContainer.style.display = "none";
});

// File System Access API - Direct Dual-Layer Auto-Saver
if (selectDirBtn) {
  selectDirBtn.addEventListener("click", async () => {
    if (!window.showDirectoryPicker) {
      alert("File System Access API is not supported in this browser. You can still use the 'Export ZIP' button anytime!");
      return;
    }
    try {
      rootDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      selectDirBtn.textContent = "📁 Folder Bound";
      selectDirBtn.classList.add("bound");
      dirStatusBadge.style.display = "inline-block";
      dirStatusBadge.textContent = "📁 Direct Auto-Save Active";
      latestLogEl.textContent = "Dataset folder bound! Recordings will auto-save directly to disk.";
    } catch (err) {
      if (err.name !== "AbortError") {
        alert("Directory Selection Error: " + err.message);
      }
    }
  });
}

async function getOrCreateSubdir(dirHandle, segments) {
  let curr = dirHandle;
  for (const seg of segments) {
    curr = await curr.getDirectoryHandle(seg, { create: true });
  }
  return curr;
}

async function saveDirectToDirectory(rootHandle, cls, instanceFolder, wavName, photoName, audioBlob, photoBlob, record) {
  // Layer A: Raw_By_Class/<Class>/
  const rawDir = await getOrCreateSubdir(rootHandle, ["Dataset", "Raw_By_Class", cls]);
  const rawFile = await rawDir.getFileHandle(wavName, { create: true });
  const w1 = await rawFile.createWritable();
  await w1.write(audioBlob);
  await w1.close();

  // Layer B: Instances_By_Vehicle/<Class>/<Model_Plate>/
  const instDir = await getOrCreateSubdir(rootHandle, ["Dataset", "Instances_By_Vehicle", cls, instanceFolder]);
  const instFile = await instDir.getFileHandle(wavName, { create: true });
  const w2 = await instFile.createWritable();
  await w2.write(audioBlob);
  await w2.close();

  // Photo Layer: Vehicle_Photos/
  if (photoBlob && photoName) {
    const photoDir = await getOrCreateSubdir(rootHandle, ["Dataset", "Vehicle_Photos"]);
    const photoFile = await photoDir.getFileHandle(photoName, { create: true });
    const wp = await photoFile.createWritable();
    await wp.write(photoBlob);
    await wp.close();
  }

  // Master metadata.csv
  const datasetDir = await getOrCreateSubdir(rootHandle, ["Dataset"]);
  const metaFile = await datasetDir.getFileHandle("metadata.csv", { create: true });
  const fileData = await metaFile.getFile();
  const existingText = fileData.size > 0 ? await fileData.text() : "";
  const header = Object.keys(record).join(",");
  const row = Object.values(record).map((v) => `"${v}"`).join(",");
  let newCsvContent = "";
  if (!existingText.trim()) {
    newCsvContent = `${header}\n${row}\n`;
  } else {
    newCsvContent = `${existingText.trimEnd()}\n${row}\n`;
  }
  const wm = await metaFile.createWritable();
  await wm.write(newCsvContent);
  await wm.close();
}

// IndexedDB Persistence Engine
const DB_NAME = "BDHornCollectorDB";
const DB_VERSION = 1;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("samples")) {
        db.createObjectStore("samples", { keyPath: "sample_id" });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveToIndexedDB(record, audioBlob, photoBlob) {
  try {
    const db = await openDB();
    const tx = db.transaction(["samples"], "readwrite");
    const store = tx.objectStore("samples");
    store.put({
      sample_id: record.sample_id,
      record: record,
      audioBlob: audioBlob,
      photoBlob: photoBlob || null
    });
    return new Promise((res) => { tx.oncomplete = () => res(); });
  } catch (err) {
    console.warn("IndexedDB save failed:", err);
  }
}

async function persistSessionState() {
  try {
    const db = await openDB();
    const tx = db.transaction(["metadata"], "readwrite");
    const store = tx.objectStore("metadata");
    store.put({ key: "globalSampleIndex", val: globalSampleIndex });
    store.put({ key: "instanceCounters", val: instanceCounters });
    store.put({ key: "metadataRecords", val: metadataRecords });
  } catch (err) {
    console.warn("Persist session error:", err);
  }
}

async function restoreSessionState() {
  try {
    const db = await openDB();
    const tx = db.transaction(["metadata"], "readonly");
    const store = tx.objectStore("metadata");
    const gReq = store.get("globalSampleIndex");
    const iReq = store.get("instanceCounters");
    const mReq = store.get("metadataRecords");

    await new Promise((res) => { tx.oncomplete = () => res(); });

    if (gReq.result && gReq.result.val) globalSampleIndex = gReq.result.val;
    if (iReq.result && iReq.result.val) Object.assign(instanceCounters, iReq.result.val);
    if (mReq.result && mReq.result.val && Array.isArray(mReq.result.val)) {
      metadataRecords.length = 0;
      metadataRecords.push(...mReq.result.val);
    }
    sampleCountEl.textContent = metadataRecords.length;
    updateInstanceCounterDisplay();
    if (metadataRecords.length > 0) {
      latestLogEl.textContent = `Restored ${metadataRecords.length} offline samples. Ready for next capture.`;
    }
  } catch (err) {
    console.warn("Restore state error:", err);
  }
}
restoreSessionState();

// Clear Session / New Batch
if (clearSessionBtn) {
  clearSessionBtn.addEventListener("click", async () => {
    if (!confirm("Start new batch? This will clear the offline cache and reset sample counters to 1. (Previously exported/downloaded files will not be deleted).")) {
      return;
    }
    const db = await openDB();
    const tx = db.transaction(["samples", "metadata"], "readwrite");
    tx.objectStore("samples").clear();
    tx.objectStore("metadata").clear();
    await new Promise((res) => { tx.oncomplete = () => res(); });

    globalSampleIndex = 1;
    for (const k in instanceCounters) delete instanceCounters[k];
    metadataRecords.length = 0;
    sampleCountEl.textContent = "0";
    updateInstanceCounterDisplay();
    latestLogEl.textContent = "Session reset. Ready for new batch.";
  });
}

// Zero-Dependency Pure JS ZIP Generator
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}

function calculateCRC32(bytes) {
  let c = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ CRC32_TABLE[(c ^ bytes[i]) & 0xff];
  }
  return (c ^ (-1)) >>> 0;
}

class FastZipBuilder {
  constructor() {
    this.files = [];
  }

  addFile(relativePath, uint8Array) {
    this.files.push({ path: relativePath, data: uint8Array });
  }

  buildBlob() {
    const parts = [];
    const centralDirParts = [];
    let offset = 0;

    for (const f of this.files) {
      const nameBytes = new TextEncoder().encode(f.path);
      const crc = calculateCRC32(f.data);
      const size = f.data.length;

      // Local File Header (30 bytes)
      const localHdr = new Uint8Array(30);
      const lv = new DataView(localHdr.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true); // Version 2.0
      lv.setUint16(6, 0, true);  // General flags
      lv.setUint16(8, 0, true);  // Compression 0 (Store)
      lv.setUint16(10, 0, true); // Time
      lv.setUint16(12, 0, true); // Date
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true); // Extra length

      parts.push(localHdr, nameBytes, f.data);

      // Central Directory Header (46 bytes)
      const cdHdr = new Uint8Array(46);
      const cv = new DataView(cdHdr.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); // Made by
      cv.setUint16(6, 20, true); // Needed
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true); // Extra
      cv.setUint16(32, 0, true); // Comment
      cv.setUint16(34, 0, true); // Disk
      cv.setUint16(36, 0, true); // Internal attr
      cv.setUint32(38, 0, true); // External attr
      cv.setUint32(42, offset, true); // Relative offset

      centralDirParts.push(cdHdr, nameBytes);
      offset += 30 + nameBytes.length + size;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const p of centralDirParts) cdSize += p.length;

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true); // Disk
    ev.setUint16(6, 0, true); // CD Disk
    ev.setUint16(8, this.files.length, true);
    ev.setUint16(10, this.files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...parts, ...centralDirParts, eocd], { type: "application/zip" });
  }
}

// Export Full Dual-Layer Dataset as ZIP
exportZipBtn.addEventListener("click", async () => {
  if (metadataRecords.length === 0) {
    alert("No samples recorded to export.");
    return;
  }

  exportZipBtn.textContent = "⏳ Generating ZIP...";
  exportZipBtn.disabled = true;

  try {
    const db = await openDB();
    const tx = db.transaction(["samples"], "readonly");
    const store = tx.objectStore("samples");
    const req = store.getAll();

    await new Promise((res) => { tx.oncomplete = () => res(); });
    const samples = req.result || [];

    const zip = new FastZipBuilder();

    // 1. Pack Audio & Photos into Dual-Layer Structure
    for (const item of samples) {
      const rec = item.record;
      const audioArrayBuffer = await item.audioBlob.arrayBuffer();
      const audioBytes = new Uint8Array(audioArrayBuffer);

      // Layer A: Raw_By_Class/<Class>/
      zip.addFile(`Dataset/Raw_By_Class/${rec.vehicle_class}/${rec.audio_filename}`, audioBytes);

      // Layer B: Instances_By_Vehicle/<Class>/<Model_Plate>/
      const instFolder = `${rec.vehicle_model}_${rec.license_plate}`;
      zip.addFile(`Dataset/Instances_By_Vehicle/${rec.vehicle_class}/${instFolder}/${rec.audio_filename}`, audioBytes);

      // Photo Layer: Vehicle_Photos/
      if (item.photoBlob && rec.photo_filename) {
        const photoArrayBuffer = await item.photoBlob.arrayBuffer();
        zip.addFile(`Dataset/Vehicle_Photos/${rec.photo_filename}`, new Uint8Array(photoArrayBuffer));
      }
    }

    // 2. Pack metadata.csv
    const headers = Object.keys(metadataRecords[0]);
    const rows = [headers.join(",")];
    for (const r of metadataRecords) {
      rows.push(headers.map((h) => `"${r[h] || ""}"`).join(","));
    }
    const csvBytes = new TextEncoder().encode(rows.join("\n"));
    zip.addFile("Dataset/metadata.csv", csvBytes);

    // 3. Build & Download ZIP
    const zipBlob = zip.buildBlob();
    downloadBlob(zipBlob, `BDHORN_Dataset_Export_${formatTimestamp(new Date())}.zip`);
    latestLogEl.innerHTML = `<span style="color:#f9e2af;">Dataset exported: <b>BDHORN_Dataset_Export_${formatTimestamp(new Date())}.zip</b></span>`;
  } catch (err) {
    alert("ZIP Export Failed: " + err.message);
  } finally {
    exportZipBtn.textContent = "📦 Export ZIP";
    exportZipBtn.disabled = false;
  }
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

// WAV Encoder (16-bit PCM RIFF format)
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
