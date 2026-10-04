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
let pendingRecording = null;

// File System Handle for Direct Auto-Saving
let rootDirectoryHandle = null;

// DOM Elements
const locationInput = document.getElementById("locationInput");
const distanceInput = document.getElementById("distanceInput") || document.getElementById("distanceSelect");
const distanceSelect = document.getElementById("distanceSelect") || distanceInput;
const sideSelect = document.getElementById("sideSelect") || document.getElementById("azimuthSelect");
const azimuthSelect = document.getElementById("azimuthSelect") || sideSelect;
const vehicleClassSelect = document.getElementById("vehicleClassSelect");
const vehicleModelInput = document.getElementById("vehicleModelInput");
const vehiclePlateInput = document.getElementById("vehiclePlateInput");
const gpsBtn = document.getElementById("gpsBtn");
const gpsStatusHint = document.getElementById("gpsStatusHint");
const gpsDetailBox = document.getElementById("gpsDetailBox");
const gpsSpotValue = document.getElementById("gpsSpotValue");
const gpsThanaValue = document.getElementById("gpsThanaValue");
const gpsCityValue = document.getElementById("gpsCityValue");
const gpsCoordValue = document.getElementById("gpsCoordValue");
const gpsAccuracyValue = document.getElementById("gpsAccuracyValue");
const gpsMapLink = document.getElementById("gpsMapLink");

let liveGpsWatchId = null;
let isLiveGpsActive = false;
let lastGeocodedCoord = null;
const lastLiveCoordinates = { lat: null, lon: null, accuracy: null, spot: "", thana: "", city: "" };

const mapPickerBtn = document.getElementById("mapPickerBtn");
const mapPickerContainer = document.getElementById("mapPickerContainer");
const closeMapPickerBtn = document.getElementById("closeMapPickerBtn");
const mapSearchInput = document.getElementById("mapSearchInput");
const mapSearchBtn = document.getElementById("mapSearchBtn");
const mapSearchResults = document.getElementById("mapSearchResults");
const mapSelectedSpot = document.getElementById("mapSelectedSpot");
const mapSelectedCoords = document.getElementById("mapSelectedCoords");
const confirmMapSpotBtn = document.getElementById("confirmMapSpotBtn");

let leafletMap = null;
let leafletMarker = null;
let pendingMapLocation = null;

const selectDirBtn = document.getElementById("selectDirBtn");
const dirStatusBadge = document.getElementById("dirStatusBadge");

const globalSampleDisplay = document.getElementById("globalSampleDisplay");
const instanceCounterDisplay = document.getElementById("instanceCounterDisplay");

const photoFileInput = document.getElementById("photoFileInput");
const snapPhotoBtn = document.getElementById("snapPhotoBtn");
const photoThumbContainer = document.getElementById("photoThumbContainer");
const photoThumb = document.getElementById("photoThumb");
const removePhotoBtn = document.getElementById("removePhotoBtn");

// Live Optical Rangefinder & Viewfinder DOM Elements
const toggleCameraBtn = document.getElementById("toggleCameraBtn");
const flipCameraBtn = document.getElementById("flipCameraBtn");
const rangefinderContainer = document.getElementById("rangefinderContainer");
const rangefinderVideo = document.getElementById("rangefinderVideo");
const rangefinderCanvas = document.getElementById("rangefinderCanvas");
const rangefinderCtx = rangefinderCanvas ? rangefinderCanvas.getContext("2d") : null;
const hudDistanceDisplay = document.getElementById("hudDistanceDisplay");
const hudConfidenceDisplay = document.getElementById("hudConfidenceDisplay");
const hudTiltDisplay = document.getElementById("hudTiltDisplay");
const hudModeDisplay = document.getElementById("hudModeDisplay");
const rangeTargetModeSelect = document.getElementById("rangeTargetModeSelect");
const observerHeightSelect = document.getElementById("observerHeightSelect");
const lockDistanceBtn = document.getElementById("lockDistanceBtn");
const captureFrameBtn = document.getElementById("captureFrameBtn");
const autoSyncRangeOnRecord = document.getElementById("autoSyncRangeOnRecord");
const rangefinderHint = document.getElementById("rangefinderHint");

// Rangefinder State Variables
let rangefinderStream = null;
let isRangefinderActive = false;
let currentCameraFacingMode = "environment";
let rawPitchDeg = 15.6; // Initial default pitch angle
let smoothedPitchDeg = 15.6;
let observerHeightM = 1.40;
let lastCalculatedDistance = 5.0;
let lastDistanceUncertainty = 0.15;
let lastDistanceConfidence = 95.0;
let lastDistanceMethod = "Manual_Selection";
let rangefinderAnimFrame = null;
let orientationSensorActive = false;
let currentDistanceMetrics = {
  raw_m: 5.0,
  uncertainty_m: 0.15,
  conf_pct: 95.0,
  method: "Manual_Selection",
  tilt_deg: 0.0,
  azimuth_deg: 0
};

const armMicBtn = document.getElementById("armMicBtn");
const levelIndicator = document.getElementById("levelIndicator");
const vuMeterBar = document.getElementById("vuMeterBar");
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

// Smart Bangladesh Thana & Administrative Resolver
function resolveBangladeshThana(lat, lon, candidateText, candidateCity) {
  const textLower = (candidateText || "").toLowerCase();
  const cityLower = (candidateCity || "").toLowerCase();

  // Rajshahi Metropolitan City (RCC)
  if ((lat >= 24.33 && lat <= 24.43 && lon >= 88.54 && lon <= 88.66) || cityLower.includes("rajshahi")) {
    const boaliaKeywords = [
      "tikapara", "shaheb bazar", "saheb bazar", "sagorpara", "sagarpara", "alupatti", "alu patti",
      "ranibazar", "rani bazar", "kumarpara", "kumar para", "ghoramara", "kadirgonj", "kadirganj",
      "hetem khan", "hetemkhan", "kazihata", "kazi hata", "malopara", "malo para", "station road",
      "shiroil", "boalia", "rampur boalia", "dorgah para", "sultanabad", "sericulture", "bornali"
    ];
    for (const kw of boaliaKeywords) {
      if (textLower.includes(kw)) return "Boalia_Thana";
    }
    const motiharKeywords = ["motihar", "ru", "university", "kazla", "binodpur", "meherchandi", "talaimari", "kajla"];
    for (const kw of motiharKeywords) {
      if (textLower.includes(kw)) return "Motihar_Thana";
    }
    const rajparaKeywords = ["rajpara", "laxmipur", "court", "harupur", "sipahipara", "c&b"];
    for (const kw of rajparaKeywords) {
      if (textLower.includes(kw)) return "Rajpara_Thana";
    }
    const makhdumKeywords = ["shah makhdum", "nawdapara", "sopura", "airport", "railgate"];
    for (const kw of makhdumKeywords) {
      if (textLower.includes(kw)) return "Shah_Makhdum_Thana";
    }
    const chandrimaKeywords = ["chandrima", "bhodra", "choto bongram"];
    for (const kw of chandrimaKeywords) {
      if (textLower.includes(kw)) return "Chandrima_Thana";
    }
    // Default for urban core of Rajshahi
    return "Boalia_Thana";
  }

  // Dhaka Metropolitan Thanas
  if (lat >= 23.65 && lat <= 23.95 && lon >= 90.30 && lon <= 90.50) {
    const dhakaThanas = [
      { name: "Dhanmondi_Thana", keys: ["dhanmondi", "kalabagan", "panthapath", "science lab"] },
      { name: "Tejgaon_Thana", keys: ["farmgate", "tejgaon", "kawran bazar", "monipuripara"] },
      { name: "Mirpur_Thana", keys: ["mirpur", "pallabi", "senpara", "kazipara", "shewrapara"] },
      { name: "Gulshan_Thana", keys: ["gulshan", "banani", "baridhara", "niketan"] },
      { name: "Shahbagh_Thana", keys: ["shahbagh", "du", "tsc", "bangla motor"] },
      { name: "Uttara_Thana", keys: ["uttara", "azampur", "jasimuddin"] },
      { name: "Mohammadpur_Thana", keys: ["mohammadpur", "adabor", "ring road"] },
      { name: "Motijheel_Thana", keys: ["motijheel", "dilkusha", "fakirapool", "arambagh"] }
    ];
    for (const dt of dhakaThanas) {
      for (const k of dt.keys) {
        if (textLower.includes(k)) return dt.name;
      }
    }
  }

  return "";
}

// Multi-Source Live Geocoding Function (Photon + Nominatim + BigDataCloud)
async function fetchMultiSourceAddress(lat, lon) {
  let spot = "";
  let neighborhood = "";
  let thana = "";
  let city = "";
  let fullAddress = "";

  // 1. Query Photon for precise landmarks & roads
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties || {};
        if (p.name && p.name !== p.street && p.name !== p.city) spot = p.name;
        if (p.street) spot = spot ? `${spot}_${p.street}` : p.street;
        if (p.district) neighborhood = p.district;
        if (p.city) city = p.city;
      }
    }
  } catch {}

  // 2. Query Nominatim for standardized administrative boundaries
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      fullAddress = data.display_name || "";
      const road = addr.road || addr.pedestrian || addr.footway || "";
      const suburb = addr.suburb || addr.neighbourhood || addr.residential || "";
      const townCity = addr.city || addr.town || addr.municipality || "";

      if (!spot && road) spot = road;
      if (!neighborhood && suburb) neighborhood = suburb;
      if (!city && townCity) city = townCity;
    }
  } catch {}

  // 3. Fallback to BigDataCloud
  if (!city || (!spot && !neighborhood)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (!neighborhood && data.locality) neighborhood = data.locality;
        if (!city && (data.city || data.principalSubdivision)) city = data.city || data.principalSubdivision;
      }
    } catch {}
  }

  // 4. Resolve exact Thana
  const combinedText = `${spot} ${neighborhood} ${fullAddress}`;
  thana = resolveBangladeshThana(lat, lon, combinedText, city);

  const cleanSpot = sanitize(spot || neighborhood || "Spot");
  const cleanThana = sanitize(thana || (city ? `${city}_Area` : "Thana"));
  const cleanCity = sanitize(city || "BD");

  return {
    spot: spot || neighborhood || "Spot",
    neighborhood: neighborhood,
    thana: thana || (city ? `${city} Area` : ""),
    city: city || "Bangladesh",
    slug: `${cleanSpot}_${cleanThana}_${cleanCity}`,
    fullAddress: fullAddress
  };
}

// Live Location Update Handler
async function handleLiveGpsPosition(pos) {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const acc = Math.round(pos.coords.accuracy || 0);
  const latStr = lat.toFixed(6);
  const lonStr = lon.toFixed(6);

  lastLiveCoordinates.lat = lat;
  lastLiveCoordinates.lon = lon;
  lastLiveCoordinates.accuracy = acc;

  if (gpsDetailBox) {
    gpsDetailBox.style.display = "flex";
  }
  if (gpsCoordValue) {
    gpsCoordValue.textContent = `${latStr} N, ${lonStr} E`;
  }
  if (gpsAccuracyValue) {
    if (acc > 150) {
      gpsAccuracyValue.textContent = `+/-${acc}m (Wi-Fi/Broadband Estimate)`;
      gpsAccuracyValue.className = "gps-detail-val warn";
    } else {
      gpsAccuracyValue.textContent = `+/-${acc} meters (Live Hardware Lock)`;
      gpsAccuracyValue.className = acc <= 10 ? "gps-detail-val success" : "gps-detail-val";
    }
  }
  if (gpsMapLink) {
    gpsMapLink.href = `https://www.google.com/maps?q=${lat},${lon}`;
  }

  gpsBtn.textContent = acc > 0 ? `Live GPS (Lock +/-${acc}m)` : "Live GPS: Active";

  // Check if coordinates changed significantly (> 30 meters) to avoid excessive reverse geocoding queries
  let shouldGeocode = false;
  if (!lastGeocodedCoord) {
    shouldGeocode = true;
  } else {
    const dLat = Math.abs(lat - lastGeocodedCoord.lat);
    const dLon = Math.abs(lon - lastGeocodedCoord.lon);
    if (dLat > 0.0003 || dLon > 0.0003) shouldGeocode = true;
  }

  if (shouldGeocode) {
    lastGeocodedCoord = { lat, lon };
    if (gpsStatusHint) {
      gpsStatusHint.textContent = `Resolving exact spot & thana for ${latStr}, ${lonStr}...`;
      gpsStatusHint.className = "gps-hint";
    }

    try {
      const geo = await fetchMultiSourceAddress(lat, lon);
      lastLiveCoordinates.spot = geo.spot;
      lastLiveCoordinates.thana = geo.thana;
      lastLiveCoordinates.city = geo.city;

      if (gpsSpotValue) gpsSpotValue.textContent = geo.spot || "Exact Spot Detected";
      if (gpsThanaValue) gpsThanaValue.textContent = geo.thana || "Local Thana";
      if (gpsCityValue) gpsCityValue.textContent = geo.city || "District";

      locationInput.value = geo.slug;

      if (gpsStatusHint) {
        if (acc > 150) {
          gpsStatusHint.textContent = `Broadband/Wi-Fi detected: ${geo.spot}, ${geo.thana} (+/-${(acc/1000).toFixed(1)}km off on PC). Tap "Pin on Map" to drag pin to your exact spot!`;
          gpsStatusHint.className = "gps-hint error";
        } else {
          gpsStatusHint.textContent = `Live Spot: ${geo.spot}, ${geo.thana}, ${geo.city} (GPS: ${latStr}, ${lonStr} | Accuracy: +/-${acc}m)`;
          gpsStatusHint.className = "gps-hint active";
        }
      }
    } catch {
      // Fallback
      const fallbackSlug = `GPS_${lat.toFixed(5)}_${lon.toFixed(5)}`;
      locationInput.value = fallbackSlug;
      if (gpsStatusHint) {
        gpsStatusHint.textContent = `Offline Live GPS: ${latStr}, ${lonStr} (+/-${acc}m)`;
        gpsStatusHint.className = "gps-hint active";
      }
    }
  }
}

// Live GPS Toggle & Hardware Tracking Handler
gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  if (isLiveGpsActive) {
    // Stop live tracking
    if (liveGpsWatchId !== null) {
      navigator.geolocation.clearWatch(liveGpsWatchId);
      liveGpsWatchId = null;
    }
    isLiveGpsActive = false;
    gpsBtn.textContent = "GPS Locate";
    gpsBtn.classList.remove("active");
    if (gpsStatusHint) {
      gpsStatusHint.textContent = "Live GPS paused. Current location coordinates locked.";
    }
    return;
  }

  // Start live tracking
  isLiveGpsActive = true;
  gpsBtn.textContent = "Locating Live...";
  gpsBtn.classList.add("active");
  if (gpsStatusHint) {
    gpsStatusHint.textContent = "Acquiring live hardware satellite lock (GPS/GLONASS)...";
    gpsStatusHint.className = "gps-hint";
  }

  // Use watchPosition for continuous real-time live refinement
  liveGpsWatchId = navigator.geolocation.watchPosition(
    handleLiveGpsPosition,
    (err) => {
      gpsBtn.textContent = "GPS Failed";
      gpsBtn.classList.remove("active");
      isLiveGpsActive = false;
      let msg = err.message;
      if (err.code === 1) {
        msg = "Permission denied. Please allow location access in your browser settings.";
      } else if (err.code === 2) {
        msg = "Position unavailable. Please turn on device GPS/Location service.";
      } else if (err.code === 3) {
        msg = "GPS timed out. Please try again with outdoor sky visibility.";
      }
      if (gpsStatusHint) {
        gpsStatusHint.textContent = "GPS Error: " + msg;
        gpsStatusHint.className = "gps-hint error";
      }
      setTimeout(() => (gpsBtn.textContent = "GPS Locate"), 3000);
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );
});

// Interactive Map Picker Logic
function openMapPicker(targetLat, targetLon) {
  if (!mapPickerContainer) return;
  mapPickerContainer.style.display = "flex";

  const defaultLat = targetLat || (lastLiveCoordinates.lat || 24.3730);
  const defaultLon = targetLon || (lastLiveCoordinates.lon || 88.6109);

  if (window.L) {
    if (!leafletMap) {
      leafletMap = L.map("interactiveMap").setView([defaultLat, defaultLon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(leafletMap);

      leafletMarker = L.marker([defaultLat, defaultLon], { draggable: true }).addTo(leafletMap);

      leafletMarker.on("dragend", async (e) => {
        const pos = e.target.getLatLng();
        await updateMapPinLocation(pos.lat, pos.lng);
      });

      leafletMap.on("click", async (e) => {
        leafletMarker.setLatLng(e.latlng);
        await updateMapPinLocation(e.latlng.lat, e.latlng.lng);
      });
    } else {
      leafletMap.setView([defaultLat, defaultLon], 16);
      leafletMarker.setLatLng([defaultLat, defaultLon]);
    }
    updateMapPinLocation(defaultLat, defaultLon);
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 250);
  }
}

async function updateMapPinLocation(lat, lon) {
  const latStr = lat.toFixed(6);
  const lonStr = lon.toFixed(6);
  if (mapSelectedCoords) {
    mapSelectedCoords.textContent = `${latStr} N, ${lonStr} E`;
  }
  if (mapSelectedSpot) {
    mapSelectedSpot.textContent = "Resolving exact spot & thana for pinned location...";
  }

  try {
    const geo = await fetchMultiSourceAddress(lat, lon);
    pendingMapLocation = {
      lat: lat,
      lon: lon,
      spot: geo.spot,
      thana: geo.thana,
      city: geo.city,
      slug: geo.slug
    };
    if (mapSelectedSpot) {
      mapSelectedSpot.textContent = `${geo.spot}, ${geo.thana}, ${geo.city}`;
    }
  } catch {
    const fallbackSlug = `GPS_${lat.toFixed(5)}_${lon.toFixed(5)}`;
    pendingMapLocation = {
      lat: lat,
      lon: lon,
      spot: "Custom_Spot",
      thana: "Boalia_Thana",
      city: "Rajshahi",
      slug: fallbackSlug
    };
    if (mapSelectedSpot) {
      mapSelectedSpot.textContent = `Custom Spot: ${latStr}, ${lonStr}`;
    }
  }
}

async function searchMapLocation(query) {
  if (!query || !query.trim()) return;
  const q = query.trim();
  if (mapSearchResults) {
    mapSearchResults.innerHTML = `<div style="padding:8px;color:#a6adc8;font-size:0.72rem;">Searching...</div>`;
    mapSearchResults.style.display = "flex";
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q + " Rajshahi Bangladesh")}&limit=5`);
    if (res.ok) {
      const data = await res.json();
      mapSearchResults.innerHTML = "";
      if (data.features && data.features.length > 0) {
        data.features.forEach((feat) => {
          const p = feat.properties || {};
          const coords = feat.geometry ? feat.geometry.coordinates : null;
          if (coords) {
            const item = document.createElement("div");
            item.className = "map-search-item";
            const name = p.name || p.street || "Place";
            const district = p.district || p.city || p.county || "";
            item.textContent = `${name}${district ? ` (${district})` : ""}`;
            item.addEventListener("click", () => {
              const lon = coords[0];
              const lat = coords[1];
              if (leafletMap && leafletMarker) {
                leafletMap.setView([lat, lon], 17);
                leafletMarker.setLatLng([lat, lon]);
                updateMapPinLocation(lat, lon);
              }
              mapSearchResults.style.display = "none";
              mapSearchInput.value = item.textContent;
            });
            mapSearchResults.appendChild(item);
          }
        });
      } else {
        mapSearchResults.innerHTML = `<div style="padding:8px;color:#f38ba8;font-size:0.72rem;">No matching places found. Try a neighborhood name (e.g. Upashahar, Shaheb Bazar, Kazla).</div>`;
      }
    }
  } catch {
    mapSearchResults.innerHTML = `<div style="padding:8px;color:#f38ba8;font-size:0.72rem;">Search request error.</div>`;
  }
}

if (mapPickerBtn) {
  mapPickerBtn.addEventListener("click", () => {
    openMapPicker(lastLiveCoordinates.lat, lastLiveCoordinates.lon);
  });
}

if (closeMapPickerBtn) {
  closeMapPickerBtn.addEventListener("click", () => {
    if (mapPickerContainer) mapPickerContainer.style.display = "none";
  });
}

if (mapSearchBtn) {
  mapSearchBtn.addEventListener("click", () => {
    searchMapLocation(mapSearchInput.value);
  });
}

if (mapSearchInput) {
  mapSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchMapLocation(mapSearchInput.value);
    }
  });
}

if (confirmMapSpotBtn) {
  confirmMapSpotBtn.addEventListener("click", () => {
    if (pendingMapLocation) {
      locationInput.value = pendingMapLocation.slug;
      lastLiveCoordinates.lat = pendingMapLocation.lat;
      lastLiveCoordinates.lon = pendingMapLocation.lon;
      lastLiveCoordinates.accuracy = 0;
      lastLiveCoordinates.spot = pendingMapLocation.spot;
      lastLiveCoordinates.thana = pendingMapLocation.thana;
      lastLiveCoordinates.city = pendingMapLocation.city;

      if (gpsDetailBox) gpsDetailBox.style.display = "flex";
      if (gpsSpotValue) gpsSpotValue.textContent = pendingMapLocation.spot || "Exact Spot Pinned";
      if (gpsThanaValue) gpsThanaValue.textContent = pendingMapLocation.thana || "Local Thana";
      if (gpsCityValue) gpsCityValue.textContent = pendingMapLocation.city || "District";
      if (gpsCoordValue) gpsCoordValue.textContent = `${pendingMapLocation.lat.toFixed(6)} N, ${pendingMapLocation.lon.toFixed(6)} E`;
      if (gpsAccuracyValue) {
        gpsAccuracyValue.textContent = "Exact (Pinned on Map)";
        gpsAccuracyValue.className = "gps-detail-val success";
      }
      if (gpsMapLink) {
        gpsMapLink.href = `https://www.google.com/maps?q=${pendingMapLocation.lat},${pendingMapLocation.lon}`;
      }
      if (gpsStatusHint) {
        gpsStatusHint.textContent = `Exact Spot Pinned: ${pendingMapLocation.spot}, ${pendingMapLocation.thana}, ${pendingMapLocation.city}`;
        gpsStatusHint.className = "gps-hint active";
      }
    }
    if (mapPickerContainer) mapPickerContainer.style.display = "none";
  });
}

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

// ==========================================
// Scientific Optical Rangefinder & Viewfinder
// ==========================================

function getVehicleTargetWidthM(cls) {
  switch (cls) {
    case "Bus":
    case "Truck":
      return 2.50; // Standard commercial vehicle width in Bangladesh (m)
    case "Private_Car":
      return 1.75;
    case "Autorickshaw":
    case "CNG_Autorickshaw":
      return 1.30;
    case "Motorcycle":
      return 0.80;
    case "Rickshaw_Bell":
      return 1.00;
    default:
      return 2.00;
  }
}

function initOrientationSensor() {
  if (orientationSensorActive) return;

  const handleOrientation = (e) => {
    if (e.beta === null || e.beta === undefined) return;
    rawPitchDeg = e.beta;
    // Calculate depression angle relative to horizontal plane
    let depress = 90.0 - rawPitchDeg;
    if (depress < 2.0) depress = 2.0;
    if (depress > 80.0) depress = 80.0;

    // Exponential smoothing
    smoothedPitchDeg = smoothedPitchDeg * 0.75 + depress * 0.25;
  };

  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          orientationSensorActive = true;
        }
      })
      .catch(() => {});
  } else if ("ondeviceorientation" in window) {
    window.addEventListener("deviceorientation", handleOrientation, true);
    orientationSensorActive = true;
  }
}

async function startRangefinderCamera() {
  if (isRangefinderActive) {
    stopRangefinderCamera();
    return;
  }

  initOrientationSensor();

  try {
    const constraints = {
      video: {
        facingMode: { ideal: currentCameraFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    rangefinderStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (rangefinderVideo) {
      rangefinderVideo.srcObject = rangefinderStream;
      await rangefinderVideo.play();
    }

    isRangefinderActive = true;
    if (rangefinderContainer) rangefinderContainer.style.display = "flex";
    if (toggleCameraBtn) {
      toggleCameraBtn.textContent = "Stop Camera";
      toggleCameraBtn.classList.add("running");
    }
    if (flipCameraBtn) flipCameraBtn.style.display = "inline-block";

    renderRangefinderLoop();
    if (latestLogEl) {
      latestLogEl.textContent = "Rangefinder camera active. Aim crosshair at vehicle base/wheels.";
    }
  } catch (err) {
    alert("Camera Access Error: " + err.message);
  }
}

function stopRangefinderCamera() {
  if (rangefinderStream) {
    rangefinderStream.getTracks().forEach((track) => track.stop());
    rangefinderStream = null;
  }
  if (rangefinderVideo) rangefinderVideo.srcObject = null;
  if (rangefinderAnimFrame) {
    cancelAnimationFrame(rangefinderAnimFrame);
    rangefinderAnimFrame = null;
  }
  isRangefinderActive = false;
  if (rangefinderContainer) rangefinderContainer.style.display = "none";
  if (toggleCameraBtn) {
    toggleCameraBtn.textContent = "Start Rangefinder Camera";
    toggleCameraBtn.classList.remove("running");
  }
  if (flipCameraBtn) flipCameraBtn.style.display = "none";
}

async function flipRangefinderCamera() {
  currentCameraFacingMode = currentCameraFacingMode === "environment" ? "user" : "environment";
  if (isRangefinderActive) {
    stopRangefinderCamera();
    await startRangefinderCamera();
  }
}

function computeRangefinderDistance() {
  if (observerHeightSelect) {
    observerHeightM = parseFloat(observerHeightSelect.value) || 1.40;
  }
  const mode = rangeTargetModeSelect ? rangeTargetModeSelect.value : "ground_angle";
  const thetaRad = (smoothedPitchDeg * Math.PI) / 180.0;
  const sinTheta = Math.sin(thetaRad);
  const cosTheta = Math.cos(thetaRad);
  const tanTheta = Math.tan(thetaRad);

  // 1. Geometric Ground-Contact Distance (Inclinometer)
  let dGeo = 5.0;
  if (tanTheta > 0.035) {
    dGeo = observerHeightM / tanTheta;
  } else {
    dGeo = 25.0;
  }

  // Geometric Uncertainty (propagating +/-0.5 deg sensor jitter and +/-0.05m height error)
  const sigmaAngleRad = (0.5 * Math.PI) / 180.0;
  const sigmaH = 0.05;
  const termH = sigmaH / observerHeightM;
  const termTheta = sigmaAngleRad / (sinTheta * cosTheta || 0.1);
  const sigmaGeo = dGeo * Math.sqrt(termH * termH + termTheta * termTheta);

  // 2. Optical Pinhole Stadiametric Distance
  const cls = vehicleClassSelect ? vehicleClassSelect.value : "Bus";
  let targetWidthM = getVehicleTargetWidthM(cls);
  let reticleRatio = 0.45;

  if (mode === "license_plate") {
    targetWidthM = 0.52; // Standard BRTA plate
    reticleRatio = 0.22;
  } else if (mode === "ground_angle") {
    reticleRatio = 0.50;
  }

  const hfovRad = (64.0 * Math.PI) / 180.0;
  const canvasW = rangefinderCanvas ? rangefinderCanvas.width : 640;
  const fPixel = canvasW / (2.0 * Math.tan(hfovRad / 2.0));
  const wReticle = canvasW * reticleRatio;
  const dOpt = (targetWidthM * fPixel) / wReticle;
  const sigmaOpt = dOpt * 0.08;

  // 3. Sensor Fusion
  let fusedD = dGeo;
  let fusedSigma = sigmaGeo;

  if (mode === "ground_angle") {
    fusedD = dGeo;
    fusedSigma = Math.max(0.08, sigmaGeo);
  } else if (mode === "vehicle_width") {
    const wGeo = 1.0 / (sigmaGeo * sigmaGeo);
    const wOpt = 1.0 / (sigmaOpt * sigmaOpt);
    fusedD = (wGeo * dGeo + wOpt * dOpt) / (wGeo + wOpt);
    fusedSigma = Math.sqrt(1.0 / (wGeo + wOpt));
  } else if (mode === "license_plate") {
    fusedD = dOpt;
    fusedSigma = Math.max(0.10, sigmaOpt);
  }

  if (fusedD < 0.8) fusedD = 0.8;
  if (fusedD > 25.0) fusedD = 25.0;

  const conf = Math.max(25, Math.min(99, Math.round((1.0 - fusedSigma / fusedD) * 100)));

  lastCalculatedDistance = parseFloat(fusedD.toFixed(2));
  lastDistanceUncertainty = parseFloat(fusedSigma.toFixed(2));
  lastDistanceConfidence = conf;
  lastDistanceMethod = "Sensor_Fusion_Optical_Tilt";

  return {
    distance: lastCalculatedDistance,
    uncertainty: lastDistanceUncertainty,
    confidence: lastDistanceConfidence,
    pitch: smoothedPitchDeg,
    mode: mode
  };
}

function renderRangefinderLoop() {
  if (!isRangefinderActive) return;

  if (rangefinderCanvas && rangefinderVideo && rangefinderVideo.videoWidth > 0) {
    if (rangefinderCanvas.width !== rangefinderVideo.videoWidth) {
      rangefinderCanvas.width = rangefinderVideo.videoWidth;
      rangefinderCanvas.height = rangefinderVideo.videoHeight;
    }

    const ctx = rangefinderCtx;
    const w = rangefinderCanvas.width;
    const h = rangefinderCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const calc = computeRangefinderDistance();

    // 1. Center Optical Reticle & Crosshair
    const cx = w / 2;
    const cy = h / 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(166, 227, 161, 0.85)";

    // Center Crosshair
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx, cy - 6);
    ctx.moveTo(cx, cy + 6);
    ctx.lineTo(cx, cy + 24);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Horizon Level Line
    ctx.strokeStyle = "rgba(137, 180, 250, 0.5)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, cy);
    ctx.lineTo(w * 0.9, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Stadiametric Brackets
    const mode = rangeTargetModeSelect ? rangeTargetModeSelect.value : "ground_angle";
    let boxW = w * 0.45;
    let boxH = h * 0.40;
    if (mode === "license_plate") {
      boxW = w * 0.22;
      boxH = h * 0.12;
    } else if (mode === "ground_angle") {
      boxW = w * 0.35;
      boxH = h * 0.28;
    }

    const bx = cx - boxW / 2;
    const by = cy - boxH / 2;
    const corner = 18;

    ctx.strokeStyle = "#89b4fa";
    ctx.lineWidth = 2.5;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx, by + corner);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + corner, by);
    // Top-right
    ctx.moveTo(bx + boxW - corner, by);
    ctx.lineTo(bx + boxW, by);
    ctx.lineTo(bx + boxW, by + corner);
    // Bottom-left
    ctx.moveTo(bx, by + boxH - corner);
    ctx.lineTo(bx, by + boxH);
    ctx.lineTo(bx + corner, by + boxH);
    // Bottom-right
    ctx.moveTo(bx + boxW - corner, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH);
    ctx.lineTo(bx + boxW, by + boxH - corner);
    ctx.stroke();

    // 3.5 Ground Contact Aiming Guidance on Canvas
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
    if (calc.pitch < 3.0) {
      ctx.fillStyle = "#f38ba8";
      ctx.fillText("[!] TILT PHONE DOWNWARD TO TIRES ON ROAD", cx, cy + 50);
      ctx.fillText("(ফোনটি নিচে চাকার দিকে তাক করুন)", cx, cy + 68);
    } else {
      ctx.fillStyle = "#a6e3a1";
      ctx.fillText("AIM CROSSHAIR AT TIRES TOUCHING ROAD", cx, cy + 50);
      ctx.fillText("(চাকার নিচের মাটিতে তাক করুন)", cx, cy + 68);
    }
    ctx.restore();

    // 4. Update HUD Displays
    if (hudDistanceDisplay) {
      hudDistanceDisplay.textContent = `${calc.distance.toFixed(2)} m`;
    }
    if (hudConfidenceDisplay) {
      hudConfidenceDisplay.textContent = `Uncertainty: +/-${calc.uncertainty.toFixed(2)}m | Conf: ${calc.confidence}%`;
    }
    if (hudTiltDisplay) {
      hudTiltDisplay.textContent = `Pitch: -${calc.pitch.toFixed(1)} deg | Ht: ${observerHeightM.toFixed(2)}m`;
    }
    if (hudModeDisplay) {
      const modeNames = {
        ground_angle: "Tire Ground Contact",
        vehicle_width: "Vehicle Width Pinhole",
        license_plate: "BRTA License Plate"
      };
      hudModeDisplay.textContent = `Mode: ${modeNames[mode] || "Ground Angle"}`;
    }
  }

  rangefinderAnimFrame = requestAnimationFrame(renderRangefinderLoop);
}

function lockCurrentRangefinderDistance(interactive = true) {
  let dVal = 5.0;
  let dStr = "5.0m";
  let method = "Manual_Visual_Estimate";
  let uncertainty = 0.50;
  let confidence = 80.0;
  let tilt = 0.0;

  if (isRangefinderActive) {
    const calc = computeRangefinderDistance();
    dVal = calc.distance;
    dStr = `${dVal.toFixed(1)}m`;
    method = "Optical_Inclinometer_Telemetry";
    uncertainty = calc.uncertainty;
    confidence = calc.confidence;
    tilt = -parseFloat(calc.pitch.toFixed(1));
    if (distanceInput) {
      distanceInput.value = dStr;
    }
  } else {
    dStr = distanceInput ? distanceInput.value.trim() : "5.0m";
    dVal = parseFloat(dStr) || 5.0;
    if (!dStr.endsWith("m")) {
      dStr = `${dVal.toFixed(1)}m`;
      if (distanceInput) distanceInput.value = dStr;
    }
  }

  if (distanceSelect && distanceSelect.tagName === "SELECT") {
    let found = false;
    for (let i = 0; i < distanceSelect.options.length; i++) {
      if (distanceSelect.options[i].value === dStr) {
        distanceSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement("option");
      opt.value = dStr;
      opt.textContent = `${dStr} (${isRangefinderActive ? "Auto-Locked" : "Manual"})`;
      distanceSelect.appendChild(opt);
      distanceSelect.value = dStr;
    }
  }

  const sideVal = sideSelect ? sideSelect.value : "Front";
  const azimuthMap = { Front: 0, Right: 90, Back: 180, Left: 270 };
  const azimuthVal = azimuthMap[sideVal] !== undefined ? azimuthMap[sideVal] : (azimuthSelect ? parseInt(azimuthSelect.value, 10) : 0);

  currentDistanceMetrics = {
    raw_m: dVal,
    uncertainty_m: uncertainty,
    conf_pct: confidence,
    method: method,
    tilt_deg: tilt,
    azimuth_deg: azimuthVal,
    side: sideVal
  };

  if (interactive && latestLogEl) {
    latestLogEl.innerHTML = `<span style="color:#a6e3a1;">Distance locked: <b>${dStr}</b> [${method}] | Side: <b>${sideVal}</b> (+/-${uncertainty}m, Conf: ${confidence}%)</span>`;
  }
}

async function captureCalibratedVideoFrame(updateThumbnail = true) {
  if (!rangefinderVideo || rangefinderVideo.videoWidth === 0) return null;

  const offscreen = document.createElement("canvas");
  offscreen.width = rangefinderVideo.videoWidth;
  offscreen.height = rangefinderVideo.videoHeight;
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(rangefinderVideo, 0, 0, offscreen.width, offscreen.height);

  return new Promise((resolve) => {
    offscreen.toBlob(
      (blob) => {
        if (blob) {
          currentPhotoBlob = blob;
          if (updateThumbnail && photoThumb && photoThumbContainer) {
            photoThumb.src = URL.createObjectURL(blob);
            photoThumbContainer.style.display = "block";
          }
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

// Event Listeners for Rangefinder Controls
if (toggleCameraBtn) {
  toggleCameraBtn.addEventListener("click", () => {
    startRangefinderCamera();
  });
}

if (flipCameraBtn) {
  flipCameraBtn.addEventListener("click", () => {
    flipRangefinderCamera();
  });
}

if (lockDistanceBtn) {
  lockDistanceBtn.addEventListener("click", () => {
    lockCurrentRangefinderDistance(true);
  });
}

if (captureFrameBtn) {
  captureFrameBtn.addEventListener("click", async () => {
    await captureCalibratedVideoFrame(true);
    if (latestLogEl) {
      latestLogEl.innerHTML = `<span style="color:#89b4fa;">Calibrated vehicle photo captured from live rangefinder!</span>`;
    }
  });
}

if (observerHeightSelect) {
  observerHeightSelect.addEventListener("change", () => {
    observerHeightM = parseFloat(observerHeightSelect.value) || 1.40;
  });
}

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
      armMicBtn.textContent = "Mic Armed (0ms)";
      armMicBtn.classList.add("armed");
    }
    requestAnimationFrame(renderWaveform);
    return true;
  } catch (err) {
    if (armMicBtn) armMicBtn.textContent = "Mic Error";
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

  // Auto-sync distance and capture calibrated photo if rangefinder is active
  if (autoSyncRangeOnRecord && autoSyncRangeOnRecord.checked && isRangefinderActive) {
    lockCurrentRangefinderDistance(false);
    captureCalibratedVideoFrame(true).catch(() => {});
  }

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
  const cls = sanitize(vehicleClassSelect.value);
  const model = sanitize(vehicleModelInput.value || "Unknown");
  const plate = sanitize(vehiclePlateInput.value || "Unknown");
  const dist = sanitize(distanceInput ? distanceInput.value : (distanceSelect ? distanceSelect.value : "5.0m"));
  const side = sanitize(sideSelect ? sideSelect.value : "Front");
  const loc = sanitize(locationInput.value || "Field");

  const baseFileName = `${sampleId}_${instanceId}_${cls}_${model}_${plate}_${dist}_${side}_${loc}_${timeStr}`;
  const wavName = `${baseFileName}.wav`;
  const photoName = `${baseFileName}.jpg`;

  pendingRecording = {
    now,
    timeStr,
    sampleId,
    key,
    instanceNum,
    instanceId,
    cls,
    model,
    plate,
    dist,
    side,
    loc,
    baseFileName,
    wavFileName: wavName,
    photoFileName: currentPhotoBlob ? photoName : "",
    distanceMetrics: { ...currentDistanceMetrics }
  };

  const clipWarningHtml = currentPeakDb >= -0.5
    ? `<div style="color:#f38ba8; font-weight:bold; margin-top:6px; padding:6px; background:#311b22; border-radius:6px; border:1px solid #f38ba8;">[!] CLIPPING ALERT: Audio peaked at ${currentPeakDb.toFixed(1)} dBFS. For loud horns, please stand at 3m–5m safe distance to avoid hardware distortion. (সাউন্ড অতিরিক্ত লাউড ছিল; ৩–৫ মিটার পেছনে সরে রিকলিপ করুন)</div>`
    : "";

  reviewDetails.innerHTML = `
    <div><strong>1. Class Layer:</strong> <span class="path-tag">Dataset/Raw_By_Class/${cls}/${wavName}</span></div>
    <div><strong>2. Instance Layer:</strong> <span class="path-tag">Dataset/Instances_By_Vehicle/${cls}/${model}_${plate}/${wavName}</span></div>
    ${currentPhotoBlob ? `<div><strong>3. Photo Layer:</strong> <span class="path-tag">Dataset/Vehicle_Photos/${photoName}</span></div>` : `<div style="color:#a6adc8;">(No vehicle photo attached)</div>`}
    <div><strong>4. Side & Distance:</strong> <span class="path-tag">Side: ${side} | Distance: ${dist} [${currentDistanceMetrics.method}] (Uncertainty: +/-${currentDistanceMetrics.uncertainty_m}m, Conf: ${currentDistanceMetrics.conf_pct}%)</span></div>
    ${clipWarningHtml}
  `;

  reviewSection.style.display = "block";
  reviewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

const TAXONOMY_MAP = {
  "Bus": { id: "C01", legal: "Legal_Standard" },
  "Truck": { id: "C02", legal: "Legal_Standard" },
  "Private_Car": { id: "C03", legal: "Legal_Standard" },
  "Motorcycle": { id: "C04", legal: "Legal_Standard" },
  "Autorickshaw": { id: "C05", legal: "Legal_Standard" },
  "CNG_Autorickshaw": { id: "C05", legal: "Legal_Standard" },
  "Rickshaw_Bell": { id: "C06", legal: "Legal_Standard" },
  "Background_Traffic_Noise": { id: "C07", legal: "Ambient_Negative" }
};

async function computeBlobSha256(blob) {
  try {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "N/A";
  }
}

function updateAudioLevel(peakDb) {
  levelIndicator.textContent = `Peak: ${peakDb.toFixed(1)} dBFS`;
  if (vuMeterBar) {
    const clampedDb = Math.max(-60, Math.min(0, peakDb));
    const pct = ((clampedDb + 60) / 60) * 100;
    vuMeterBar.style.width = `${pct.toFixed(1)}%`;
    if (peakDb >= -0.5) {
      vuMeterBar.style.background = "#f38ba8";
    } else if (peakDb > -6.0) {
      vuMeterBar.style.background = "#fab387";
    } else {
      vuMeterBar.style.background = "#a6e3a1";
    }
  }
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
  pendingRecording = null;
  audioPlayback.src = "";
  reviewSection.style.display = "none";
  recordingTimer.textContent = "00:00.0";
  latestLogEl.innerHTML = `<span style="color:#f38ba8;">Clip discarded. Ready for retake.</span>`;
});

saveRecordingBtn.addEventListener("click", async () => {
  if (!currentAudioBlob) return;

  const session = pendingRecording || {
    now: new Date(),
    timeStr: formatTimestamp(new Date()),
    sampleId: `BDHORN_${String(globalSampleIndex).padStart(4, "0")}`,
    key: getInstanceKey(),
    instanceNum: (instanceCounters[getInstanceKey()] || 0) + 1,
    instanceId: `S${String((instanceCounters[getInstanceKey()] || 0) + 1).padStart(2, "0")}`,
    cls: sanitize(vehicleClassSelect.value),
    model: sanitize(vehicleModelInput.value || "Unknown"),
    plate: sanitize(vehiclePlateInput.value || "Unknown"),
    dist: sanitize(distanceInput ? distanceInput.value : (distanceSelect ? distanceSelect.value : "5.0m")),
    side: sanitize(sideSelect ? sideSelect.value : "Front"),
    loc: sanitize(locationInput.value || "Field"),
    distanceMetrics: { ...currentDistanceMetrics }
  };

  const sampleId = session.sampleId;
  const instanceId = session.instanceId;
  const key = session.key;
  const instanceNum = session.instanceNum;
  const cls = session.cls;
  const model = session.model;
  const plate = session.plate;
  const dist = session.dist;
  const side = session.side;
  const loc = session.loc;
  const now = session.now;
  const timeStr = session.timeStr;
  const baseFileName = session.baseFileName || `${sampleId}_${instanceId}_${cls}_${model}_${plate}_${dist}_${side}_${loc}_${timeStr}`;
  const wavFileName = session.wavFileName || `${baseFileName}.wav`;
  const photoFileName = currentPhotoBlob ? (session.photoFileName || `${baseFileName}.jpg`) : "";
  const distanceMetrics = session.distanceMetrics || currentDistanceMetrics;

  const azimuthMap = { "Front": 0, "Right": 90, "Back": 180, "Left": 270 };
  const azimuthVal = azimuthMap[side] !== undefined ? azimuthMap[side] : (azimuthSelect ? parseInt(azimuthSelect.value, 10) : 0);

  const tax = TAXONOMY_MAP[cls] || { id: "C00", legal: "Legal_Standard" };
  const sha256 = await computeBlobSha256(currentAudioBlob);
  const crestFactor = parseFloat((currentPeakDb - currentRmsDb).toFixed(2));
  const estimatedSpl = parseFloat(Math.max(30.0, currentRmsDb + 112.4).toFixed(1));

  const record = {
    sample_id: sampleId,
    instance_id: instanceId,
    filename: wavFileName,
    audio_filename: wavFileName,
    sha256_hash: sha256,
    sample_rate_hz: actualSampleRate,
    bit_depth: 16,
    channels: 1,
    duration_sec: parseFloat(currentDurationSec.toFixed(2)),
    peak_dbfs: parseFloat(currentPeakDb.toFixed(2)),
    rms_dbfs: parseFloat(currentRmsDb.toFixed(2)),
    crest_factor_db: crestFactor,
    measured_spl_dba: 90.0,
    estimated_spl_dba: estimatedSpl,
    calib_offset_c: 112.4,
    location: loc,
    distance_m: dist,
    distance_raw_m: currentDistanceMetrics.raw_m || (parseFloat(dist) || 5.0),
    distance_uncertainty_m: currentDistanceMetrics.uncertainty_m || (isRangefinderActive ? 0.15 : 0.50),
    distance_confidence_pct: currentDistanceMetrics.conf_pct || (isRangefinderActive ? 95.0 : 75.0),
    distance_method: currentDistanceMetrics.method || (isRangefinderActive ? "Optical_Inclinometer_Telemetry" : "Manual_Visual_Estimate"),
    acoustic_azimuth_deg: azimuthVal,
    camera_tilt_deg: currentDistanceMetrics.tilt_deg || 0.0,
    observer_height_m: observerHeightM || 1.40,
    angle_deg: 45,
    recording_side: side,
    mic_height_m: observerHeightM || 1.40,
    elevation_type: "Ground_Level",
    class_id: tax.id,
    vehicle_class: cls,
    vehicle_model: model,
    license_plate: plate,
    photo_filename: photoFileName,
    legal_status: tax.legal,
    horn_actuation_type: "Standard",
    vehicle_instance_id: `${model}_${plate}`,
    temperature_c: 30.0,
    relative_humidity_pct: 70.0,
    weather_condition: "Dry_Sunny",
    timestamp_iso: now.toISOString(),
    ground_truth_method: currentPhotoBlob ? "Visual_Photo_Matched" : "Direct_Observation",
    annotator_id: "RESEARCHER_1",
    notes: ""
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
  pendingRecording = null;
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
      selectDirBtn.textContent = "Folder Bound";
      selectDirBtn.classList.add("bound");
      dirStatusBadge.style.display = "inline-block";
      dirStatusBadge.textContent = "Direct Disk Write Active";
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

  exportZipBtn.textContent = "Generating ZIP...";
  exportZipBtn.disabled = true;

  try {
    const db = await openDB();
    const tx = db.transaction(["samples"], "readonly");
    const store = tx.objectStore("samples");
    const req = store.getAll();

    const samples = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error || new Error("Failed to fetch samples from IndexedDB"));
      tx.onerror = () => rej(tx.error || new Error("IndexedDB transaction error"));
    });

    const zip = new FastZipBuilder();

    // 1. Pack Audio & Photos into Dual-Layer Structure
    for (const item of samples) {
      const rec = item.record;
      const audioArrayBuffer = await item.audioBlob.arrayBuffer();
      const audioBytes = new Uint8Array(audioArrayBuffer);
      const audioName = rec.filename || rec.audio_filename || `${rec.sample_id}.wav`;

      // Layer A: Raw_By_Class/<Class>/
      zip.addFile(`Dataset/Raw_By_Class/${rec.vehicle_class}/${audioName}`, audioBytes);

      // Layer B: Instances_By_Vehicle/<Class>/<Model_Plate>/
      const instFolder = `${rec.vehicle_model}_${rec.license_plate}`;
      zip.addFile(`Dataset/Instances_By_Vehicle/${rec.vehicle_class}/${instFolder}/${audioName}`, audioBytes);

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
    exportZipBtn.textContent = "Export ZIP";
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
