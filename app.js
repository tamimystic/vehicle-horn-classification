/**
 * AcousticAcquire Mobile - Client-Side Raw Audio Ingestion & WAV Logger
 * Features:
 * - Zero AGC / Zero Noise Suppression (Programmatic bypass)
 * - 4.0s RAM Circular Ring Buffer (Pre-trigger 1.0s + Post-trigger 2.0s)
 * - Pure 16-bit Linear PCM WAV encoder in pure JavaScript
 * - Dynamic metadata CSV logger & real-time oscilloscope
 */

// --- Global State ---
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let isRecording = false;

const SAMPLE_RATE = 44100;
const BUFFER_DURATION_SEC = 4.0;
const PRE_TRIGGER_SEC = 1.0;
const POST_TRIGGER_SEC = 2.0;
const TOTAL_DURATION_SEC = PRE_TRIGGER_SEC + POST_TRIGGER_SEC; // 3.0s

const BUFFER_SIZE = Math.floor(SAMPLE_RATE * BUFFER_DURATION_SEC);
let ringBuffer = new Float32Array(BUFFER_SIZE);
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
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
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
  try {
    // 1. Audio Constraints explicitly disabling AGC, Noise Suppression, Echo Cancellation
    const constraints = {
      audio: {
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
        channelCount: 1,
        sampleRate: SAMPLE_RATE
      },
      video: false
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE
    });

    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // ScriptProcessor for universal cross-platform mobile compatibility
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Peak Level for visualizer
      let peak = 0;
      for (let i = 0; i < inputData.length; i++) {
        const absVal = Math.abs(inputData[i]);
        if (absVal > peak) peak = absVal;

        // Push to RAM circular ring buffer
        ringBuffer[writeIndex] = inputData[i];
        writeIndex = (writeIndex + 1) % BUFFER_SIZE;
      }

      // Update Peak dBFS
      const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
      updateAudioLevel(peakDb);
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    isRecording = true;
    micBtn.classList.remove("start");
    micBtn.classList.add("active");
    micBtnText.textContent = "মাইক চালু আছে (রানিং...)";
    latestLogEl.textContent = "মাইক সক্রিয়। যেকোনো গাড়ির হর্ন বাজলে বাটনে চাপ দিন!";

    requestAnimationFrame(renderWaveform);
  } catch (err) {
    alert("মাইক্রোফোন চালু করতে সমস্যা হয়েছে: " + err.message + "\nব্রাউজারে মাইক্রোফোনের পারমিশন দেওয়া আছে কি না চেক করুন।");
    console.error(err);
  }
}

function stopMicrophone() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  if (scriptProcessor) {
    scriptProcessor.disconnect();
  }
  if (audioContext) {
    audioContext.close();
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
  } else {
    clippingBadge.textContent = "SIGNAL CLEAN";
    clippingBadge.className = "clipping-badge clean";
  }
}

// --- Live Waveform Renderer ---
function renderWaveform() {
  if (!isRecording) return;

  const width = canvas.width;
  const height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);

  canvasCtx.lineWidth = 2 * window.devicePixelRatio;
  canvasCtx.strokeStyle = "#89b4fa";
  canvasCtx.beginPath();

  const sliceCount = 300;
  const step = Math.floor(BUFFER_SIZE / sliceCount);
  const sliceWidth = width / sliceCount;
  let x = 0;

  for (let i = 0; i < sliceCount; i++) {
    const idx = (writeIndex - (sliceCount - i) * step + BUFFER_SIZE) % BUFFER_SIZE;
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

// --- Class Buttons Event Listeners ---
document.querySelectorAll(".class-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!isRecording) {
      alert("আগে ওপরের 'মাইক্রোফোন চালু করুন' বোতামে চাপ দিয়ে মাইক অন করুন!");
      return;
    }

    const classId = btn.getAttribute("data-class-id");
    const className = btn.getAttribute("data-class-name");
    captureHornEvent(classId, className);
  });
});

// --- Capture Event from Circular Buffer ---
function captureHornEvent(classId, className) {
  sampleCount++;
  sampleCountEl.textContent = sampleCount;

  const totalSamples = Math.floor(TOTAL_DURATION_SEC * SAMPLE_RATE);
  const extractedAudio = new Float32Array(totalSamples);

  // Extract past 3 seconds chronologically from ring buffer
  for (let i = 0; i < totalSamples; i++) {
    const readIdx = (writeIndex - totalSamples + i + BUFFER_SIZE) % BUFFER_SIZE;
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

  // Build Metadata
  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, "-");
  const loc = (locationInput.value || "Field").trim().replace(/\s+/g, "_");
  const dist = distanceSelect.value;
  const filename = `BDHORN_${classId}_${className.toUpperCase()}_${loc}_${timeStr}_${String(sampleCount).padStart(4, '0')}.wav`;

  // Encode to 16-bit PCM WAV
  const wavBlob = encodeWAV(extractedAudio, SAMPLE_RATE);

  // Trigger Automatic Download to Phone Storage
  downloadBlob(wavBlob, filename);

  // Save metadata row
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
    sample_rate: SAMPLE_RATE,
    notes: "Captured via Mobile AcousticAcquire PWA"
  };
  metadataRecords.push(metaRow);

  // UI Feedback
  latestLogEl.innerHTML = `✅ <b>সংরক্ষিত (#${sampleCount}):</b> ${filename} (${className})`;
  latestLogEl.style.color = "#a6e3a1";
}

// --- Pure JavaScript 16-bit PCM WAV Encoder ---
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);           // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true);  // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 * 2)
  view.setUint16(32, 2, true);           // BlockAlign (1 * 2)
  view.setUint16(34, 16, true);          // BitsPerSample (16 bit)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples with clipping protection
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

// --- Helper: Download Blob in Browser ---
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
  }, 100);
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
