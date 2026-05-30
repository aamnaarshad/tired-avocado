// ═══════════════════════════════════════════════════════════════
//  avocado's corner — script.js
// ═══════════════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://uerryqabhgteigdzwfhi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcnJ5cWFiaGd0ZWlnZHp3ZmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTgzNDEsImV4cCI6MjA5NTY3NDM0MX0.qs1vbHAvk8vdc5kNice5t9TQV_YsoBQ0TqqkIOc6Y0c';
const OWNER_PASS    = 'avocadomin';   

// ── Tiny Supabase REST helper ────────────────────────────────────
const db = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + SUPABASE_ANON,
  },
  async select(table, query) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + (query || ''), {
      headers: { ...this.headers, 'Prefer': 'return=representation' }
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, body) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async rpc(fnName, params) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fnName, {
      method: 'POST',
      headers: { ...this.headers },
      body: JSON.stringify(params || {})
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

// ── Visitor Count Initialization ─────────────────────────────────
async function initVisitor() {
  try {
    const counted = sessionStorage.getItem('avo_counted');
    let count;
    
    if (!counted) {
      count = await db.rpc('increment_visitor');
      sessionStorage.setItem('avo_counted', '1');
    } else {
      const rows = await db.select('site_stats', '?select=visitor_count&limit=1');
      count = rows ? rows.visitor_count : '??';
    }

    const countStr = Number(count).toLocaleString();
    document.getElementById('visitorCount').textContent = countStr;
    document.getElementById('counterDisplay').textContent = String(count);
    document.getElementById('dialogVisitor').textContent = countStr;
  } catch(e) {
    console.error('Visitor count error:', e);
    document.getElementById('visitorCount').textContent = '????';
  }
}

// ── Load & Render Guestbook ──────────────────────────────────────
async function loadGuestbook() {
  try {
    const entries = await db.select('guestbook', '?select=name,message,created_at&order=created_at.desc&limit=100');
    const list = document.getElementById('gbList');
    list.innerHTML = '';

    if (!entries || entries.length === 0) {
      list.innerHTML = '<div style="font-family:var(--vt-font);font-size:16px;color:#888;padding:8px;">no messages yet... be the first!! 🌸</div>';
    } else {
      entries.forEach(function(e) {
        const div = document.createElement('div');
        div.className = 'gb-entry';
        div.innerHTML = 
          '<div class="gb-name"><span>💬 ' + escHtml(e.name) + '</span>' +
          '<span class="gb-date">' + formatDate(e.created_at) + '</span></div>' +
          '<div class="gb-msg">' + escHtml(e.message) + '</div>';
        list.appendChild(div);
      });
    }
    document.getElementById('gbCount').textContent = (entries ? entries.length : 0) + ' message' + ((entries && entries.length !== 1) ? 's' : '');
  } catch(e) {
    console.error('Guestbook load error:', e);
    document.getElementById('gbList').innerHTML = '<div style="font-family:var(--vt-font);font-size:16px;color:#888;padding:8px;">couldn\'t load messages 😔 try refreshing!</div>';
  }
}

async function submitGuestbook() {
  const name = document.getElementById('gbName').value.trim();
  const msg  = document.getElementById('gbMsg').value.trim();

  if (!name) { showToast('please enter your name!! 🌸'); return; }
  if (!msg)  { showToast('please write a message!! 💌'); return; }

  const btn = document.querySelector('#guestbook .win-form-btn.primary');
  btn.disabled = true;
  btn.textContent = 'sending...';

  try {
    await db.insert('guestbook', { name: name, message: msg });
    document.getElementById('gbName').value = '';
    document.getElementById('gbMsg').value  = '';
    await loadGuestbook();
    showToast('message sent!! thank you 💌');
  } catch(e) {
    console.error('Submit guestbook error:', e);
    showToast('something went wrong 😔 try again!');
  } finally {
    btn.disabled = false;
    btn.textContent = '📨 Sign!';
  }
}

// ── Load & Render Stats ──────────────────────────────────────────
const defaultStats = { mood: '😊', caffeine: 70, drama: 95, sleep: 80, happy: 88 };

async function loadStats() {
  try {
    const rows = await db.select('owner_stats', '?select=mood,caffeine,drama,sleep,happy&order=created_at.desc&limit=1');
    const current = rows || defaultStats;

    document.getElementById('moodDisplay').textContent = current.mood || defaultStats.mood;
    setBar('caffeine', current.caffeine !== undefined ? current.caffeine : defaultStats.caffeine);
    setBar('drama',    current.drama    !== undefined ? current.drama    : defaultStats.drama);
    setBar('sleep',    current.sleep    !== undefined ? current.sleep    : defaultStats.sleep);
    setBar('happy',    current.happy    !== undefined ? current.happy    : defaultStats.happy);
  } catch(e) {
    console.error('Stats load error:', e);
    renderDefaultStats();
  }
}

function renderDefaultStats() {
  document.getElementById('moodDisplay').textContent = defaultStats.mood;
  setBar('caffeine', defaultStats.caffeine);
  setBar('drama', defaultStats.drama);
  setBar('sleep', defaultStats.sleep);
  setBar('happy', defaultStats.happy);
}

function setBar(id, val) {
  const bar = document.getElementById('pb-' + id);
  const lbl = document.getElementById('pl-' + id);
  if (bar) bar.style.width = val + '%';
  if (lbl) lbl.textContent = val + '%';
}

// ── Load & Render Currently ──────────────────────────────────────
async function loadCurrently() {
  try {
    const rows = await db.select('owner_currently', '?select=watching,reading,listening,feeling&order=created_at.desc&limit=1');
    const current = rows || {};

    if (current.watching)  document.getElementById('curr-watching').textContent  = current.watching;
    if (current.reading)   document.getElementById('curr-reading').textContent   = current.reading;
    if (current.listening) document.getElementById('curr-listening').textContent = current.listening;
    if (current.feeling)   document.getElementById('curr-feeling').textContent   = current.feeling;
  } catch(e) {
    console.error('Currently load error:', e);
  }
}

// ── Owner Modals and Form Updates ────────────────────────────────
async function openStatsModal() {
  const pw = prompt('🔒 owner password:');
  if (!pw || pw !== OWNER_PASS) { if (pw !== null) showToast('wrong password!! 🔒'); return; }

  try {
    const rows = await db.select('owner_stats', '?select=mood,caffeine,drama,sleep,happy&order=created_at.desc&limit=1');
    const s = rows || defaultStats;

    const moods = ['😊','😄','😎','🥰','😴','😤','🥺','😂','🤔','✨','🥑','💖'];
    const selected = s.mood || '😊';

    let html = '<div style="margin-bottom:8px;">' +
               '<div style="font-family:var(--pixel-font);font-size:7px;color:var(--win-title);margin-bottom:6px;">MOOD:</div>' +
               '<div class="mood-selector" id="moodSel">';
    
    moods.forEach(function(m) {
      html += '<div class="mood-opt' + (m === selected ? ' selected' : '') + '" onclick="selectMood(this,\'' + m + '\')">' + m + '</div>';
    });
    html += '</div></div>';

    const rowsConfig = [
      ['caffeine', '☕ Caffeine %'],
      ['drama',    '📺 Drama Obsession %'],
      ['sleep',    '😴 Sleepiness %'],
      ['happy',    '💖 Happiness %']
    ];

    rowsConfig.forEach(function(r) {
      const val = s[r] !== undefined ? s[r] : defaultStats[r];
      html += '<div class="stat-row"><label>' + r + '</label>' +
              '<input type="range" min="0" max="100" value="' + val + '" oninput="document.getElementById(\'rv-' + r + '\').textContent=this.value+\'%\'" id="sr-' + r + '" />' +
              '<span class="val" id="rv-' + r + '">' + val + '%</span></div>';
    });

    html += '<div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;">' +
            '<button class="win-form-btn" onclick="closeStatsModal()">Cancel</button>' +
            '<button class="win-form-btn primary" onclick="saveStats()">💾 Save</button></div>';

    document.getElementById('statsModalContent').innerHTML = html;
    document.getElementById('statsModal').classList.remove('hidden');
  } catch(e) {
    console.error('Modal init error:', e);
    showToast('error reading current state');
  }
}

function selectMood(el, m) {
  document.querySelectorAll('.mood-opt').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  el.parentElement.setAttribute('data-value', m);
}

async function saveStats() {
  const moodEl = document.querySelector('.mood-opt.selected');
  const s = {
    mood: moodEl ? moodEl.textContent : '😊',
    caffeine: parseInt(document.getElementById('sr-caffeine').value),
    drama:    parseInt(document.getElementById('sr-drama').value),
    sleep:    parseInt(document.getElementById('sr-sleep').value),
    happy:    parseInt(document.getElementById('sr-happy').value)
  };

  try {
    await db.insert('owner_stats', s);
    await loadStats();
    closeStatsModal();
    showToast('stats updated!! 📊');
  } catch(e) {
    console.error('Save stats error:', e);
    showToast('save failed 😔 check console');
  }
}

async function openCurrentlyModal() {
  const pw = prompt('🔒 owner password:');
  if (!pw || pw !== OWNER_PASS) { if (pw !== null) showToast('wrong password!! 🔒'); return; }

  try {
    const rows = await db.select('owner_currently', '?select=watching,reading,listening,feeling&order=created_at.desc&limit=1');
    const c = rows || {};

    const fields = [
      ['watching',  '📺 Watching'],
      ['reading',   '📖 Reading'],
      ['listening', '🎵 Listening'],
      ['feeling',   '😴 Feeling']
    ];

    let html = '<div style="font-family:var(--pixel-font);font-size:7px;margin-bottom:8px;color:var(--win-title);">UPDATE CURRENTLY:</div>';
    
    fields.forEach(function(f) {
      const val = c[f] || '';
      html += '<div style="margin-bottom:6px;"><div style="font-family:var(--pixel-font);font-size:7px;margin-bottom:3px;color:#555;">' + f + ':</div>' +
              '<input class="win-form-input" id="curr-edit-' + f + '" type="text" value="' + escHtml(val) + '" placeholder="..." /></div>';
    });

    html += '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:10px;">' +
            '<button class="win-form-btn" onclick="closeStatsModal()">Cancel</button>' +
            '<button class="win-form-btn primary" onclick="saveCurrently()">💾 Save</button></div>';

    document.getElementById('statsModalContent').innerHTML = html;
    document.getElementById('statsModal').classList.remove('hidden');
  } catch(e) {
    console.error('Currently edit modal error:', e);
  }
}

async function saveCurrently() {
  const c = {
    watching:  document.getElementById('curr-edit-watching').value.trim(),
    reading:   document.getElementById('curr-edit-reading').value.trim(),
    listening: document.getElementById('curr-edit-listening').value.trim(),
    feeling:   document.getElementById('curr-edit-feeling').value.trim()
  };

  try {
    await db.insert('owner_currently', c);
    await loadCurrently();
    closeStatsModal();
    showToast('updated!! ✨');
  } catch(e) {
    console.error('Save currently error:', e);
    showToast('save failed 😔 check console');
  }
}

function closeStatsModal() {
  document.getElementById('statsModal').classList.add('hidden');
}

// ── Original Utility Helpers ─────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() { t.classList.add('hidden'); }, 2500);
}

function formatDate(d) {
  const date = new Date(d);
  return (date.getMonth() + 1).toString().padStart(2, '0') + '.' + 
         date.getDate().toString().padStart(2, '0') + '.' + 
         String(date.getFullYear()).slice(2);
}

// ── Clock ────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clockDisplay').textContent = h + ':' + m + ' ' + ampm;
}
updateClock();
setInterval(updateClock, 1000);
document.getElementById('lastUpdatedHeader').textContent = formatDate(Date.now());

function scrollTo(id) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── EQ bars ──────────────────────────────────────────────────────
const eqC = document.getElementById('eqBars');
if (eqC) {
const heights =[8, 14, 6, 12, 10, 4, 16, 8, 12];
heights.forEach(function(h, i) {
    const b = document.createElement('div');
b.className = 'eq-bar';
b.style.setProperty('--h', h + 'px');
b.style.setProperty('--d', (0.25 + Math.random() * 0.45) + 's');
b.style.animationDelay = (i * 0.05) + 's';
eqC.appendChild(b);
  });
}

// ── Music player ─────────────────────────────────────────────────
const tracks = [
  '🎵 kpop playlist — shuffle mode',
  '🎵 IVE — After LIKE',
  '🎵 aespa — Supernova',
  '🎵 NewJeans — Hype Boy',
  '🎵 BLACKPINK — How You Like That',
  '🎵 LE SSERAFIM — FEARLESS',
  '🎵 EXO — Love Shot',
  '🎵 BTS — Dynamite',
];
let trackIdx = 0;
const playlist = document.getElementById('playlist');
if (playlist) {
  tracks.slice(1).forEach(function(t, i) {
    const d = document.createElement('div');
    d.style.cssText = 'font-family:var(--pixel-font);font-size:7px;color:#00aa33;padding:1px 3px;cursor:pointer;';
    d.textContent = (i + 1) + '. ' + t.replace('🎵 ', '');
    d.onclick = function() { trackIdx = i + 1; updateTrack(); };
    d.onmouseover = function() { d.style.background = '#003300'; };
    d.onmouseout  = function() { d.style.background = ''; };
    playlist.appendChild(d);
  });
}

function updateTrack() {
  document.getElementById('trackName').textContent = tracks[trackIdx] + '    ';
}
function nextTrack() { trackIdx = (trackIdx + 1) % tracks.length; updateTrack(); }
function prevTrack() { trackIdx = (trackIdx - 1 + tracks.length) % tracks.length; updateTrack(); }
function stopTrack() { trackIdx = 0; updateTrack(); }
function togglePlay() { /* cosmetic placeholder */ }

// ── Interest Cards Hook ─────────────────────────────────────────
const interestLabels = {
  'K-DRAMA': 'you have excellent taste in kdramas 🎬',
  'T-DRAMA': 'thai dramass >< i c , i c 📺',
  'K-POP': 'kpop has taken over my entire brain 🎵',
  'ART\n(maybe??)': 'i do art... sometimes... maybe... we\'ll see 🎨',
  'MANHWAS\n(sometimes)': 'reading manhwas at 3am is a personality type 📖',
  'CUTE\nCODING': 'html is literally just decorating a webpage!! 💻',
  'ME\nMYSELF': 'self appreciation is very important 🥑',
  'SLEEPING': 'sleeping is a skill and i am a master 😴',
  'DOING\nNOTHING': 'the art of doing absolutely nothing 🛋️'
};

document.querySelectorAll('.interest-card').forEach(function(card) {
  card.addEventListener('click', function() {
    const label = card.querySelector('.ic-label').textContent.trim();
    const msg = interestLabels[label] || 'shrine coming soon!! 🌸';
    showToast(msg);
  });
});

// ── Master App Launcher ──────────────────────────────────────────
initVisitor();
loadGuestbook();
loadStats();
loadCurrently();
