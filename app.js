const AMOUNT = 20;
const STORAGE_KEY = 'moneylog_entries';
const HOLD_DURATION = 1800; // ms to hold for reset

// ── DOM refs ──
const totalAmountEl = document.getElementById('totalAmount');
const logList       = document.getElementById('logList');
const logCount      = document.getElementById('logCount');
const monthLabel    = document.getElementById('monthLabel');
const totalBtn      = document.getElementById('totalBtn');
const toast         = document.getElementById('toast');
const resetOverlay  = document.getElementById('resetOverlay');
const resetProgress = document.getElementById('resetProgress');

let entries = [];
let holdTimer = null;
let holdStart = null;
let holdRafId = null;
let toastTimer = null;

// ── Init ──
function init() {
  loadData();
  renderAll();
  updateMonthLabel();
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

// ── Render ──
function renderAll() {
  const total = entries.length * AMOUNT;
  totalAmountEl.textContent = total;

  // Update ring rotation subtly based on entry count (cosmetic)
  const ring = document.querySelector('.ring::after');
  document.querySelector('.ring').style.setProperty(
    '--rotation', `${(entries.length * 15) % 360}deg`
  );

  // Log count
  logCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

  // Log list
  if (entries.length === 0) {
    logList.innerHTML = '<li class="log-empty" id="emptyState">No entries yet</li>';
    return;
  }

  // Render newest first
  logList.innerHTML = '';
  const reversed = [...entries].reverse();
  reversed.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'log-item';
    if (i === 0) li.classList.add('new-item');

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

function updateMonthLabel() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  monthLabel.textContent = now.toLocaleDateString('en-IL', options);
}

function formatDate(ts) {
  const d = new Date(ts);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}  ${hours}:${mins}`;
}

// ── Add entry ──
function addEntry() {
  const entry = { timestamp: Date.now() };
  entries.push(entry);
  saveData();
  renderAll();
  flashButton();
  showToast(`+₪${AMOUNT} added`);
}

function flashButton() {
  totalBtn.classList.add('flash');
  setTimeout(() => totalBtn.classList.remove('flash'), 400);
}

// ── Reset ──
function resetData() {
  entries = [];
  saveData();
  renderAll();
  showToast('Data reset');
}

// ── Toast ──
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── Hold-to-reset logic ──
function startHold(e) {
  if (e.type === 'touchstart') e.preventDefault(); // prevent ghost click
  totalBtn.classList.add('pressed');
  holdStart = performance.now();

  resetOverlay.classList.add('active');
  animateReset();

  holdTimer = setTimeout(() => {
    cancelHold();
    resetData();
  }, HOLD_DURATION);
}

function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  holdStart = null;
  cancelAnimationFrame(holdRafId);
  totalBtn.classList.remove('pressed');
  resetOverlay.classList.remove('active');
  resetProgress.style.transform = 'rotate(0deg)';
}

function animateReset() {
  if (!holdStart) return;
  const elapsed = performance.now() - holdStart;
  const pct = Math.min(elapsed / HOLD_DURATION, 1);
  const deg = pct * 360;
  resetProgress.style.transform = `rotate(${deg}deg)`;
  resetProgress.style.borderTopColor = pct > 0.8 ? '#ff4d4d' : '#ff9999';
  if (pct < 1) {
    holdRafId = requestAnimationFrame(animateReset);
  }
}

// ── Button event listeners ──
// Touch events (iPhone primary)
totalBtn.addEventListener('touchstart', startHold, { passive: false });
totalBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  const wasHolding = holdTimer !== null;
  cancelHold();
  // Only add if it was a tap (not a completed hold)
  const elapsed = holdStart ? performance.now() - holdStart : 0;
  if (elapsed < 300 || wasHolding) {
    // short tap = add; if hold completed, resetData already called
    if (wasHolding) addEntry();
  }
});
totalBtn.addEventListener('touchcancel', cancelHold);

// Mouse events (desktop/testing)
totalBtn.addEventListener('mousedown', (e) => {
  holdStart = performance.now();
  startHoldMouse();
});
document.addEventListener('mouseup', (e) => {
  if (holdTimer || holdStart) {
    const elapsed = performance.now() - (holdStart || 0);
    const wasHolding = holdTimer !== null;
    cancelHold();
    if (elapsed < 300 || wasHolding) {
      if (wasHolding) addEntry();
    }
  }
});

let mouseHoldTimer = null;
function startHoldMouse() {
  totalBtn.classList.add('pressed');
  holdStart = performance.now();
  resetOverlay.classList.add('active');
  animateReset();
  holdTimer = setTimeout(() => {
    cancelHold();
    resetData();
  }, HOLD_DURATION);
}

// Separate simpler approach for touch:
totalBtn.removeEventListener('touchend', arguments);

// ── Clean re-implementation of touch handler ──
let touchHoldTimer = null;
let touchStartTime = null;
let touchCompleted = false;

totalBtn.addEventListener('touchstart', function(e) {
  e.preventDefault();
  touchStartTime = performance.now();
  touchCompleted = false;
  totalBtn.classList.add('pressed');
  holdStart = touchStartTime;

  resetOverlay.classList.add('active');
  animateReset();

  touchHoldTimer = setTimeout(() => {
    touchCompleted = true;
    cancelAnimationFrame(holdRafId);
    totalBtn.classList.remove('pressed');
    resetOverlay.classList.remove('active');
    resetProgress.style.transform = 'rotate(0deg)';
    holdStart = null;
    resetData();
  }, HOLD_DURATION);
}, { passive: false });

totalBtn.addEventListener('touchend', function(e) {
  e.preventDefault();
  clearTimeout(touchHoldTimer);
  cancelAnimationFrame(holdRafId);
  const elapsed = performance.now() - (touchStartTime || 0);
  totalBtn.classList.remove('pressed');
  resetOverlay.classList.remove('active');
  resetProgress.style.transform = 'rotate(0deg)';
  holdStart = null;

  if (!touchCompleted && elapsed < HOLD_DURATION) {
    addEntry();
  }
  touchCompleted = false;
}, { passive: false });

totalBtn.addEventListener('touchcancel', function() {
  clearTimeout(touchHoldTimer);
  cancelAnimationFrame(holdRafId);
  totalBtn.classList.remove('pressed');
  resetOverlay.classList.remove('active');
  resetProgress.style.transform = 'rotate(0deg)';
  holdStart = null;
  touchCompleted = false;
});

// ── Start ──
init();
