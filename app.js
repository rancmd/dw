const AMOUNT        = 20;
const STORAGE_KEY   = 'moneylog_entries';
const HOLD_DURATION = 1800; // ms

// ── DOM refs ──
const totalAmountEl  = document.getElementById('totalAmount');
const logList        = document.getElementById('logList');
const logCount       = document.getElementById('logCount');
const monthLabel     = document.getElementById('monthLabel');
const totalBtn       = document.getElementById('totalBtn');
const toast          = document.getElementById('toast');
const resetRingFill  = document.getElementById('resetRingFill');

// SVG circle circumference: 2π × r = 2π × 132 ≈ 829
const CIRCUMFERENCE = 2 * Math.PI * 132;

let entries      = [];
let touchStartTime = null;
let touchCompleted = false;
let touchHoldTimer = null;
let rafId          = null;
let toastTimer     = null;

// ── Init ──
function init() {
  loadData();
  renderAll();
  updateDateLabel();
}

// ── Storage ──
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch {
    entries = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ── Date label ──
function updateDateLabel() {
  const now = new Date();
  const day   = String(now.getDate()).padStart(2, '0');
  const month = now.toLocaleString('en', { month: 'long' });
  const year  = now.getFullYear();
  monthLabel.textContent = `${day} ${month} ${year}`;
}

// ── Render ──
function renderAll() {
  const total = entries.length * AMOUNT;
  totalAmountEl.textContent = total;

  logCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

  if (entries.length === 0) {
    logList.innerHTML = '<li class="log-empty">No entries yet</li>';
    return;
  }

  logList.innerHTML = '';
  const reversed = [...entries].reverse();
  reversed.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'log-item';

    const dateEl = document.createElement('span');
    dateEl.className = 'log-date';
    dateEl.textContent = formatDate(entry.timestamp);

    const amountEl = document.createElement('span');
    amountEl.className = 'log-amount';
    amountEl.textContent = `+₪${AMOUNT}`;

    li.appendChild(dateEl);
    li.appendChild(amountEl);
    logList.appendChild(li);
  });
}

function formatDate(ts) {
  const d = new Date(ts);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const hrs   = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}  ${hrs}:${mins}`;
}

// ── Add entry ──
function addEntry() {
  entries.push({ timestamp: Date.now() });
  saveData();
  renderAll();
  // Flash green
  totalBtn.classList.add('flash');
  setTimeout(() => totalBtn.classList.remove('flash'), 400);
  showToast(`+₪${AMOUNT} added`);
}

// ── Reset ──
function resetData() {
  entries = [];
  saveData();
  renderAll();
  showToast('Reset');
}

// ── Toast ──
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// ── SVG ring animation ──
function setRingProgress(pct) {
  // pct 0→1: stroke-dashoffset goes from CIRCUMFERENCE→0
  const offset = CIRCUMFERENCE * (1 - pct);
  resetRingFill.style.strokeDashoffset = offset;
}

function clearRing() {
  cancelAnimationFrame(rafId);
  rafId = null;
  resetRingFill.style.strokeDashoffset = CIRCUMFERENCE;
}

function animateRing(startTime) {
  const elapsed = performance.now() - startTime;
  const pct = Math.min(elapsed / HOLD_DURATION, 1);
  setRingProgress(pct);
  if (pct < 1) {
    rafId = requestAnimationFrame(() => animateRing(startTime));
  }
}

// ── Touch handlers ──
totalBtn.addEventListener('touchstart', function(e) {
  e.preventDefault();
  touchStartTime = performance.now();
  touchCompleted = false;

  totalBtn.classList.add('pressed');
  animateRing(touchStartTime);

  touchHoldTimer = setTimeout(() => {
    touchCompleted = true;
    clearRing();
    totalBtn.classList.remove('pressed');
    resetData();
  }, HOLD_DURATION);
}, { passive: false });

totalBtn.addEventListener('touchend', function(e) {
  e.preventDefault();
  clearTimeout(touchHoldTimer);
  clearRing();
  totalBtn.classList.remove('pressed');

  if (!touchCompleted) {
    addEntry();
  }
  touchCompleted = false;
}, { passive: false });

totalBtn.addEventListener('touchcancel', function() {
  clearTimeout(touchHoldTimer);
  clearRing();
  totalBtn.classList.remove('pressed');
  touchCompleted = false;
});

// ── Mouse handlers (desktop testing) ──
let mouseStartTime = null;
let mouseCompleted = false;
let mouseHoldTimer = null;

totalBtn.addEventListener('mousedown', function(e) {
  mouseStartTime = performance.now();
  mouseCompleted = false;
  totalBtn.classList.add('pressed');
  animateRing(mouseStartTime);

  mouseHoldTimer = setTimeout(() => {
    mouseCompleted = true;
    clearRing();
    totalBtn.classList.remove('pressed');
    resetData();
  }, HOLD_DURATION);
});

document.addEventListener('mouseup', function() {
  if (mouseStartTime === null) return;
  clearTimeout(mouseHoldTimer);
  clearRing();
  totalBtn.classList.remove('pressed');

  if (!mouseCompleted) {
    addEntry();
  }
  mouseStartTime = null;
  mouseCompleted = false;
});

// ── Start ──
init();
