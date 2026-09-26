let audioContext = null, mediaStream = null, scriptProcessor = null, muteGain = null, isRecording = false;
let actualSampleRate = 48000, bufferSize = 0, ringBuffer = null, writeIndex = 0, sampleCount = 0;
const BUFFER_DURATION_SEC = 4.0, TOTAL_DURATION_SEC = 3.0, metadataRecords = [];

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

function resizeCanvas() {
  if (canvas) {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

micBtn.addEventListener("click", async () => {
  if (!isRecording) await startMicrophone();
  else stopMicrophone();
});

async function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Microphone API unavailable. Run 'python main.py --web' and access http://localhost:8000 or use Firefox.");
    return;
  }
  try {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
        video: false
      });
    } catch {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();

    actualSampleRate = audioContext.sampleRate || 48000;
    bufferSize = Math.floor(actualSampleRate * BUFFER_DURATION_SEC);
    ringBuffer = new Float32Array(bufferSize);
    writeIndex = 0;

    const source = audioContext.createMediaStreamSource(mediaStream);
    scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    scriptProcessor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const absVal = Math.abs(input[i]);
        if (absVal > peak) peak = absVal;
        ringBuffer[writeIndex] = input[i];
        writeIndex = (writeIndex + 1) % bufferSize;
      }
      updateAudioLevel(peak > 1e-6 ? 20 * Math.log10(peak) : -100);
    };

    muteGain = audioContext.createGain();
    muteGain.gain.value = 0.0;
    source.connect(scriptProcessor);
    scriptProcessor.connect(muteGain);
    muteGain.connect(audioContext.destination);

    isRecording = true;
    micBtn.classList.remove("start");
    micBtn.classList.add("active");
    micBtnText.textContent = `Mic Active (${actualSampleRate} Hz) - Recording`;
    latestLogEl.textContent = "Mic active. Click any class button to capture a horn event.";
    requestAnimationFrame(renderWaveform);
  } catch (err) {
    alert("Microphone error: " + err.message);
  }
}

function stopMicrophone() {
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (scriptProcessor) { scriptProcessor.disconnect(); scriptProcessor = null; }
  if (muteGain) { muteGain.disconnect(); muteGain = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  isRecording = false;
  micBtn.classList.remove("active");
  micBtn.classList.add("start");
  micBtnText.textContent = "Start Microphone";
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

function renderWaveform() {
  if (!isRecording || !ringBuffer) return;
  const width = canvas.width, height = canvas.height;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.lineWidth = 2 * window.devicePixelRatio;
  canvasCtx.strokeStyle = "#89b4fa";
  canvasCtx.beginPath();

  const sliceCount = 300, step = Math.floor(bufferSize / sliceCount), sliceWidth = width / sliceCount;
  let x = 0;
  for (let i = 0; i < sliceCount; i++) {
    const idx = (writeIndex - (sliceCount - i) * step + bufferSize) % bufferSize;
    const y = (0.5 + ringBuffer[idx] * 0.45) * height;
    if (i === 0) canvasCtx.moveTo(x, y);
    else canvasCtx.lineTo(x, y);
    x += sliceWidth;
  }
  canvasCtx.stroke();
  requestAnimationFrame(renderWaveform);
}

document.querySelectorAll(".class-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!isRecording) { alert("Please start the microphone first!"); return; }
    captureHornEvent(btn.getAttribute("data-class-id"), btn.getAttribute("data-class-name"));
  });
});

function captureHornEvent(classId, className) {
  sampleCount++;
  sampleCountEl.textContent = sampleCount;
  const totalSamples = Math.floor(TOTAL_DURATION_SEC * actualSampleRate);
  const audio = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    audio[i] = ringBuffer[(writeIndex - totalSamples + i + bufferSize) % bufferSize];
  }

  let peak = 0, sumSq = 0;
  for (let i = 0; i < totalSamples; i++) {
    const absVal = Math.abs(audio[i]);
    if (absVal > peak) peak = absVal;
    sumSq += absVal * absVal;
  }
  const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -100;
  const rmsDb = sumSq > 0 ? 10 * Math.log10(sumSq / totalSamples) : -100;

  const now = new Date();
  const timeStr = now.toISOString().replace(/[:.]/g, "-");
  const loc = (locationInput.value || "Field").trim().replace(/\s+/g, "_");
  const dist = distanceSelect.value;
  const filename = `BDHORN_${classId}_${className.toUpperCase()}_${loc}_${timeStr}_${String(sampleCount).padStart(4, '0')}.wav`;

  downloadBlob(encodeWAV(audio, actualSampleRate), filename);
  metadataRecords.push({
    sample_id: `BDHORN_${String(sampleCount).padStart(4, '0')}`,
    filename, class_id: classId, vehicle_class: className,
    timestamp: now.toISOString(), location: loc, distance_m: dist,
    peak_dbfs: peakDb.toFixed(2), rms_dbfs: rmsDb.toFixed(2),
    duration_sec: TOTAL_DURATION_SEC, sample_rate: actualSampleRate
  });
  latestLogEl.innerHTML = `Saved (#${sampleCount}): <b>${filename}</b>`;
  latestLogEl.style.color = "#a6e3a1";
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 200);
}

downloadMetadataBtn.addEventListener("click", () => {
  if (metadataRecords.length === 0) { alert("No recordings captured yet."); return; }
  const headers = Object.keys(metadataRecords[0]);
  const rows = [headers.join(",")];
  for (const r of metadataRecords) rows.push(headers.map(h => `"${r[h] || ""}"`).join(","));
  downloadBlob(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" }), `metadata_session_${new Date().toISOString().slice(0, 10)}.csv`);
});
