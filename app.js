const PER = 30, KEYS = ['a', 'b', 'c'];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ISO = /^\d{4}-\d{2}-\d{2}$/, IMG = /^data:image\/(jpeg|png|webp|gif);base64,/;
const defaults = () => ({ settings: { title: 'Our drawing challenge', start: iso(new Date()), days: 60, labels: ['Me', 'Them', 'Us'] }, entries: {} });

/* Validate anything that comes from storage or an imported file */
function clean(raw) {
  const o = defaults();
  if (!raw || typeof raw !== 'object') return o;
  const s = raw.settings || {};
  if (typeof s.title === 'string') o.settings.title = s.title.slice(0, 80);
  if (typeof s.start === 'string' && ISO.test(s.start)) o.settings.start = s.start;
  const dn = parseInt(s.days, 10);
  if (dn >= 1 && dn <= 366) o.settings.days = dn;
  if (Array.isArray(s.labels)) o.settings.labels = [0, 1, 2].map(i => typeof s.labels[i] === 'string' && s.labels[i].trim() ? s.labels[i].slice(0, 30) : o.settings.labels[i]);
  const en = raw.entries && typeof raw.entries === 'object' ? raw.entries : {};
  for (const k in en) {
    const n = parseInt(k, 10), e = en[k];
    if (!(n >= 1 && n <= o.settings.days) || !e || typeof e !== 'object') continue;
    const c = {};
    KEYS.forEach(x => { if (typeof e[x] === 'string' && IMG.test(e[x])) c[x] = e[x]; });
    if (typeof e.note === 'string' && e.note.trim()) c.note = e.note.slice(0, 500);
    if (typeof e.date === 'string' && ISO.test(e.date)) c.date = e.date;
    if (c.a || c.b || c.c || c.note) o.entries[n] = c;
  }
  return o;
}

/* Storage: IndexedDB, one record */
const dbp = new Promise((res, rej) => {
  try { const q = indexedDB.open('drawing-timeline', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e) { rej(e); }
});
const kv = (mode, fn) => dbp.then(d => new Promise((res, rej) => { const t = d.transaction('kv', mode), r = fn(t.objectStore('kv')); t.oncomplete = () => res(r.result); t.onerror = () => rej(t.error); }));
let S = defaults(), month = 0, warned = false;
const save = () => kv('readwrite', s => s.put(S, 'state')).catch(() => { if (!warned) { warned = true; alert("This browser can't save data right now (private mode?). Use Backup to keep your work."); } });

/* Dates */
const startD = () => parse(S.settings.start);
const defDate = n => calAddDays(startD(), n - 1);
const dateOf = n => { const e = S.entries[n]; return e && e.date ? parse(e.date) : defDate(n); };
const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const todayN = () => calDayNumber(startD(), new Date());
const tilt = n => { const r = Math.sin(n * 12.9898) * 43758.5453; return (r - Math.floor(r)) * 10 - 5; };

/* Timeline */
let lastCols = 0, lastMonth = -1;
function getColCount(w) {
  if (w < 500) return 2;
  if (w < 700) return 3;
  if (w < 900) return 4;
  if (w < 1200) return 6;
  if (w < 1600) return 7;
  return 8;
}
function render(force) {
  const total = S.settings.days, months = Math.ceil(total / PER);
  month = Math.max(0, Math.min(month, months - 1));
  const rows = $('rows'), W = rows.clientWidth || 320;
  const cols = getColCount(W);
  const first = month * PER + 1, n = Math.min(PER, total - month * PER), nrows = Math.ceil(n / cols);
  const cw = Math.min(150, (W / cols) * 0.8), sag = cw * 0.4, top = cw * 0.2;
  const rowH = top + sag + (cw - 16) + 44 + cw * 0.12, tn = todayN();
  $('ptitle').textContent = S.settings.title;
  $('mname').textContent = 'Month ' + (month + 1);
  $('range').textContent = fmt(defDate(first)) + ' to ' + fmt(defDate(first + n - 1));
  $('prev').disabled = month === 0;
  $('next').disabled = month >= months - 1;
  
  if (force || cols !== lastCols || month !== lastMonth) {
    lastCols = cols;
    lastMonth = month;
    let html = '';
    for (let r = 0; r < nrows; r++) {
      html += `<div class="row" style="height:${rowH}px"><svg width="${W}" height="${rowH}"><path d="M0 ${top} Q ${W / 2} ${top + sag * 2} ${W} ${top}"/></svg>`;
      for (let i = 0; i < cols; i++) {
        const idx = r * cols + i;
        if (idx >= n) break;
        const d = first + idx, t = (i + 0.5) / cols, x = t * W - cw / 2, y = top + sag * 4 * t * (1 - t);
        const e = S.entries[d] || {}, imgs = [e.a, e.b, e.c].filter(Boolean);
        const cls = 'card' + (imgs.length || e.note ? ' has' : '') + (d > tn ? ' future' : '') + (d === tn ? ' now' : '');
        let thumbContent;
        if (imgs.length === 0) {
          thumbContent = d;
        } else if (imgs.length === 1) {
          thumbContent = `<img src="${imgs[0]}" alt="">`;
        } else if (imgs.length === 2) {
          thumbContent = `<img src="${imgs[0]}" alt=""><img src="${imgs[1]}" alt="">`;
        } else {
          thumbContent = `<img src="${e.a}" alt="" class="p-a"><img src="${e.b}" alt="" class="p-b"><img src="${e.c}" alt="" class="p-c">`;
        }
        html += `<button class="${cls}" data-d="${d}" style="left:${x}px;top:${y}px;width:${cw}px;transform:rotate(${tilt(d).toFixed(1)}deg)" aria-label="Day ${d}, ${fmt(dateOf(d))}">`
          + `<span class="thumb c${imgs.length || 0}">${thumbContent}</span>`
          + `<span class="lab">Day ${d} &middot; ${fmt(dateOf(d))}</span>${d === tn ? '<span class="tag">today</span>' : ''}</button>`;
      }
      html += '</div>';
    }
    rows.innerHTML = html;
  } else {
    // Just update positioning without rebuilding DOM
    const rowEls = rows.querySelectorAll('.row');
    rowEls.forEach((row, r) => {
      row.style.height = `${rowH}px`;
      const svg = row.querySelector('svg');
      svg.setAttribute('width', W);
      svg.setAttribute('height', rowH);
      svg.querySelector('path').setAttribute('d', `M0 ${top} Q ${W / 2} ${top + sag * 2} ${W} ${top}`);
      const cards = row.querySelectorAll('.card');
      cards.forEach((card, i) => {
        const t = (i + 0.5) / cols, x = t * W - cw / 2, y = top + sag * 4 * t * (1 - t);
        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        card.style.width = `${cw}px`;
      });
    });
  }
}

/* Dialog */
const shut = () => { 
  $('modal').classList.remove('on'); 
  document.body.style.overflow = '';
};
function show(h) {
  $('sheet').innerHTML = '<button class="close" id="close" aria-label="Close">&times;</button>' + h;
  $('modal').classList.add('on');
  $('sheet').scrollTop = 0;
  $('close').onclick = shut;
  document.body.style.overflow = 'hidden';
}

const dateBtn = (id, label) => `<div class="field dp"><span>${label}</span><button type="button" class="fv" id="${id}-b" aria-expanded="false" aria-haspopup="dialog"><span id="${id}-t"></span><span aria-hidden="true">&#9662;</span></button><div id="${id}-c" class="pop" hidden></div></div>`;
function mountDate(id, v, opts, onPick) {
  const btn = $(id + '-b'), box = $(id + '-c');
  const text = () => { $(id + '-t').textContent = parse(v).toLocaleDateString(CAL_CONFIG.locale, { day: 'numeric', month: 'short', year: 'numeric' }); };
  const position = () => {
    const b = btn.getBoundingClientRect(), gap = 6, margin = 28;
    box.style.width = `${Math.min(340, window.innerWidth - 56)}px`;
    const boxH = box.offsetHeight || 360;
    const below = b.bottom + gap + boxH <= window.innerHeight - margin;
    const above = b.top - gap - boxH >= margin;
    const useBelow = below || !above;
    box.style.top = useBelow ? `${b.bottom + gap}px` : `${b.top - gap - boxH}px`;
    const boxW = box.offsetWidth;
    let left = b.left;
    if (left + boxW > window.innerWidth - margin) left = window.innerWidth - margin - boxW;
    if (left < margin) left = margin;
    box.style.left = `${left}px`;
  };
  const set = open => {
    box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) { position(); }
  };
  const cal = createCalendar(box, Object.assign({}, opts, {
    value: parse(v),
    onPick: dt => { v = iso(dt); text(); set(false); btn.focus(); if (onPick) onPick(dt); },
    onEscape: () => { set(false); btn.focus(); },
  }));
  btn.onclick = () => { set(box.hidden); if (!box.hidden) cal.focus(); };
  const away = e => { if (!box.isConnected) return document.removeEventListener('pointerdown', away); if (!box.hidden && !box.contains(e.target) && !btn.contains(e.target)) set(false); };
  document.addEventListener('pointerdown', away);
  text();
  return { get: () => v, set: x => { v = x; text(); cal.setValue(parse(x)); } };
}

function view(d) {
  const e = S.entries[d];
  if (!e) return edit(d);
  const L = S.settings.labels;
  const sl = (k, i, w) => `<div class="${w ? 'wide' : ''}"><span class="who">${esc(L[i])}</span><div class="slot ${e[k] ? 'f' : ''}">${e[k] ? `<img src="${e[k]}" alt="${esc(L[i])}">` : 'nothing here'}</div></div>`;
  show(`<h2>Day ${d}</h2><div class="sub">${esc(dateOf(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div>`
    + `<div class="grid">${sl('a', 0)}${sl('b', 1)}${sl('c', 2, 1)}</div>${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}`
    + `<div class="acts"><button class="btn" id="ed">Edit</button><button class="btn pri" id="sav">Save as image</button></div>`);
  $('ed').onclick = () => edit(d);
  $('sav').onclick = () => saveAsImage(d);
}

async function saveAsImage(d) {
  const e = S.entries[d];
  if (!e) return;
  
  // Wait for font to load
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  
  // Background
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#fffefa';
  ctx.fillRect(0, 0, W, H);
  
  // Load images
  const loadImg = src => new Promise((res, rej) => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
  
  const [imgA, imgB, imgC] = await Promise.all([loadImg(e.a), loadImg(e.b), loadImg(e.c)]);
  const imgs = [imgA, imgB, imgC].filter(Boolean);
  
  // Collage area (top 70% of canvas)
  const collageH = H * 0.7, gap = 8;
  
  const drawCover = (img, x, y, w, h) => {
    if (!img) return;
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };
  
  if (imgs.length === 1) {
    drawCover(imgs[0], 0, 0, W, collageH);
  } else if (imgs.length === 2) {
    const hw = (W - gap) / 2;
    drawCover(imgs[0], 0, 0, hw, collageH);
    drawCover(imgs[1], hw + gap, 0, hw, collageH);
  } else if (imgs.length === 3) {
    const topH = collageH * 0.4, botH = collageH - topH - gap;
    const hw = (W - gap) / 2;
    drawCover(imgA, 0, 0, hw, topH);
    drawCover(imgB, hw + gap, 0, hw, topH);
    drawCover(imgC, 0, topH + gap, W, botH);
  }
  
  // Text area
  const textY = collageH + 40;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#25302a';
  ctx.font = '700 56px Caveat';
  ctx.textAlign = 'center';
  ctx.fillText(`Day ${d} · ${fmt(dateOf(d))}`, W / 2, textY);
  
  if (e.note) {
    ctx.font = '500 42px Caveat';
    const lines = [], words = e.note.split(' '), maxW = W - 80;
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 6).forEach((ln, i) => {
      ctx.fillText(ln, W / 2, textY + 70 + i * 50);
    });
  }
  
  // Download or share
  c.toBlob(async blob => {
    const file = new File([blob], `timeline-day-${d}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Day ${d}` });
      } catch (err) {
        if (err.name !== 'AbortError') downloadFile(file);
      }
    } else {
      downloadFile(file);
    }
  }, 'image/png');
}

function downloadFile(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function edit(d) {
  const old = S.entries[d] || {}, w = { a: old.a, b: old.b, c: old.c }, orig = S.entries[d] ? d : null;
  const L = S.settings.labels, N = S.settings.days;
  let touched = !!old.date;
  const up = (k, i, wide) => `<div class="up ${wide ? 'wide' : ''}"><span class="who">${esc(L[i])}</span><label class="slot" id="pv-${k}" style="cursor:pointer" tabindex="0"><input type="file" accept="image/*" data-k="${k}" hidden></label></div>`;
  show(`<h2>${orig ? 'Edit day' : 'Add a day'}</h2>`
    + `<div class="two"><label class="field"><span>Day</span><input id="f-day" type="number" min="1" max="${N}" value="${d}"></label>`
    + `${dateBtn('f-date', 'Date')}</div>`
    + `<div class="grid">${up('a', 0)}${up('b', 1)}${up('c', 2, 1)}</div>`
    + `<label class="field"><span>Note (optional)</span><textarea id="f-note" rows="2" maxlength="500">${esc(old.note || '')}</textarea></label>`
    + `<div class="acts"><button class="btn pri" id="save">Save</button>${orig ? '<button class="btn danger" id="del">Delete</button>' : ''}<button class="btn" id="cancel">Cancel</button></div>`);
  const pv = k => { 
    const el = $('pv-' + k); 
    el.className = 'slot' + (w[k] ? ' f' : ''); 
    const input = el.querySelector('input');
    el.innerHTML = w[k] ? `<img src="${w[k]}" alt="">` : 'Click to add photo';
    el.appendChild(input);
  };
  KEYS.forEach(pv);
  $('sheet').querySelectorAll('input[type=file]').forEach(inp => inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try { w[inp.dataset.k] = await shrink(f); pv(inp.dataset.k); } catch (e) { alert("Couldn't read that image. Try a JPG or PNG."); }
    inp.value = '';
  });
  $('sheet').querySelectorAll('.slot').forEach(slot => {
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      const k = slot.id.replace('pv-', '');
      if (w[k] && confirm('Remove this photo?')) { delete w[k]; pv(k); }
    });
    slot.addEventListener('keydown', e => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const k = slot.id.replace('pv-', '');
        if (w[k] && confirm('Remove this photo?')) { delete w[k]; pv(k); }
      }
    });
  });
  const v0 = dateOf(d), lo = defDate(1), hi = defDate(N);
  const used = new Set(Object.keys(S.entries).filter(k => +k !== orig).map(k => iso(dateOf(+k))));
  const dp = mountDate('f-date', iso(v0), {
    min: v0 < lo ? v0 : lo, max: v0 > hi ? v0 : hi,
    marked: dt => used.has(iso(dt)),
    info: dt => { const n = calDayNumber(startD(), dt); return n >= 1 && n <= N ? `Day ${n} of ${N}` : ''; },
  }, dt => { const n = calDayNumber(startD(), dt); if (n >= 1 && n <= N) { $('f-day').value = n; touched = false; } else touched = true; });
  $('f-day').oninput = () => { const n = parseInt($('f-day').value, 10); if (!touched && n >= 1 && n <= N) dp.set(iso(defDate(n))); };
  $('cancel').onclick = shut;
  if (orig) $('del').onclick = () => { if (confirm(`Delete day ${orig}?`)) { delete S.entries[orig]; save(); shut(); render(true); } };
  $('save').onclick = () => {
    const n = parseInt($('f-day').value, 10);
    if (!(n >= 1 && n <= N)) return alert(`Day must be between 1 and ${N}.`);
    const e = {}, note = $('f-note').value.trim();
    KEYS.forEach(k => { if (w[k]) e[k] = w[k]; });
    if (note) e.note = note.slice(0, 500);
    if (!Object.keys(e).length) return alert('Add at least one photo or a note.');
    const dv = dp.get();
    if (ISO.test(dv) && dv !== iso(defDate(n))) e.date = dv;
    if (n !== orig && S.entries[n] && !confirm(`Day ${n} already has an entry. Replace it?`)) return;
    if (orig && n !== orig) delete S.entries[orig];
    S.entries[n] = e; save();
    month = Math.floor((n - 1) / PER);
    shut(); render(true);
  };
}

const shrink = f => new Promise((res, rej) => {
  const u = URL.createObjectURL(f), im = new Image();
  im.onload = () => {
    const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.82));
  };
  im.onerror = () => { URL.revokeObjectURL(u); rej(); };
  im.src = u;
});

function settings(first) {
  const s = S.settings;
  show(`<h2>${first ? 'Set up your timeline' : 'Settings'}</h2>${first ? '<p class="hint">Everything is saved in this browser only. Nothing is uploaded anywhere.</p>' : ''}`
    + `<label class="field"><span>Title</span><input id="s-t" maxlength="80" value="${esc(s.title)}"></label>`
    + `<div class="two">${dateBtn('s-s', 'Start date (Day 1)')}`
    + `<label class="field"><span>Number of days</span><input id="s-n" type="number" min="1" max="366" value="${s.days}"></label></div>`
    + `<p class="hint">Names for the three photo slots on every day:</p>`
    + `<div class="two"><label class="field"><span>Drawing 1</span><input id="s-l0" maxlength="30" value="${esc(s.labels[0])}"></label>`
    + `<label class="field"><span>Drawing 2</span><input id="s-l1" maxlength="30" value="${esc(s.labels[1])}"></label></div>`
    + `<label class="field"><span>Shared photo</span><input id="s-l2" maxlength="30" value="${esc(s.labels[2])}"></label>`
    + `<div class="acts"><button class="btn pri" id="s-ok">Save</button><button class="btn" id="s-no">Cancel</button></div>`);
  const sd = mountDate('s-s', s.start, {}, null);
  $('s-no').onclick = shut;
  $('s-ok').onclick = () => {
    const st = sd.get(), n = parseInt($('s-n').value, 10);
    if (!ISO.test(st)) return alert('Pick a start date.');
    if (!(n >= 1 && n <= 366)) return alert('Number of days must be between 1 and 366.');
    const maxE = Math.max(0, ...Object.keys(S.entries).map(Number));
    if (n < maxE) return alert(`You already have an entry on day ${maxE}, so the timeline can't be shorter than that.`);
    S.settings = { title: $('s-t').value.trim().slice(0, 80) || 'My timeline', start: st, days: n, labels: [0, 1, 2].map(i => $('s-l' + i).value.trim().slice(0, 30) || s.labels[i]) };
    save(); shut(); render(true);
  };
}

function backup() {
  show(`<h2>Backup</h2><p class="hint">Your timeline lives in this browser. Download a backup to keep it safe or move it to another device.</p>`
    + `<div class="acts"><button class="btn pri" id="bk-dl">Download backup</button><button class="btn" id="bk-up">Restore from file</button></div>`
    + `<div class="acts"><button class="btn danger" id="bk-wipe">Erase everything</button></div>`);
  $('bk-dl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = `timeline-${iso(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('bk-up').onclick = () => $('imp').click();
  $('bk-wipe').onclick = () => { if (confirm('Erase all entries and settings from this browser?')) { S = defaults(); save(); render(true); settings(true); } };
}

$('imp').onchange = async () => {
  const f = $('imp').files[0];
  $('imp').value = '';
  if (!f) return;
  try {
    const next = clean(JSON.parse(await f.text()));
    if (!confirm('Replace what is in this browser with the backup?')) return;
    S = next; save(); month = 0; shut(); render(true);
  } catch (e) { alert("That file isn't a valid backup."); }
};

$('rows').addEventListener('click', ev => { const c = ev.target.closest('.card'); if (c) view(+c.dataset.d); });
$('modal').addEventListener('click', ev => { if (ev.target.id === 'modal') shut(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('modal').classList.contains('on')) shut(); });
$('prev').onclick = () => { month--; render(true); };
$('next').onclick = () => { month++; render(true); };
$('settings').onclick = () => settings(false);
$('backup').onclick = backup;
let resizeRaf;
const resizeObs = new ResizeObserver(() => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(render);
});
resizeObs.observe($('rows'));

(async () => {
  let raw;
  try { raw = await kv('readonly', s => s.get('state')); } catch (e) { /* storage unavailable */ }
  S = clean(raw);
  const t = todayN();
  if (t > PER && t <= S.settings.days) month = Math.floor((t - 1) / PER);
  render();
  if (!raw) settings(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
