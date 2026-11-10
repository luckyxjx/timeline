const CAL_CONFIG = {
  locale: 'en-GB',   //'en-US', 'hi-IN', 'fr-FR'
  weekStart: 0,      // 0 = Sunday, 1 = Monday
  // Special dates get a small diamond and a tooltip.
  // 'MM-DD' repeats every year, 'YYYY-MM-DD' is one-off.
  occasions: {
    // '02-14': "Valentine's Day",
    // '12-25': 'Christmas',
    // '02-29': 'Leap day',
  },
  isBlocked: date => false,
};

const calPad = n => String(n).padStart(2, '0');
const calEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const calIsLeap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const calDaysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const calLead = (y, m, weekStart) => (new Date(y, m, 1).getDay() - weekStart + 7) % 7;
const calSame = (a, b) => !!(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
const calAddDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const calDayNumber = (start, d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(start.getFullYear(), start.getMonth(), start.getDate())) / 864e5) + 1;
const calOccasion = d => {
  const mm = calPad(d.getMonth() + 1), dd = calPad(d.getDate());
  return CAL_CONFIG.occasions[`${d.getFullYear()}-${mm}-${dd}`] || CAL_CONFIG.occasions[`${mm}-${dd}`] || '';
};

function createCalendar(host, o) {
  o = o || {};
  const C = CAL_CONFIG, L = C.locale;
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = day0(o.today || new Date());
  const min = o.min ? day0(o.min) : null, max = o.max ? day0(o.max) : null;
  let val = o.value ? day0(o.value) : null, foc = val || today, want = false;
  let view = new Date(foc.getFullYear(), foc.getMonth(), 1);
  const blocked = d => !!((min && d < min) || (max && d > max) || C.isBlocked(d));
  const names = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + (i + C.weekStart) % 7).toLocaleDateString(L, { weekday: 'narrow' }));

  host.innerHTML = '<div class="cal" role="group" aria-label="Choose a date"><div class="cal-hd">'
    + '<button type="button" class="cal-nav" data-nav="-1" aria-label="Previous month">&#8249;</button>'
    + '<span class="cal-title" aria-live="polite"></span>'
    + '<button type="button" class="cal-nav" data-nav="1" aria-label="Next month">&#8250;</button></div>'
    + '<div class="cal-g">' + names.map(n => `<span class="cal-w" aria-hidden="true">${calEsc(n)}</span>`).join('') + '</div>'
    + '<div class="cal-g cal-days"></div>'
    + '<div class="cal-ft"><button type="button" class="cal-today">Today</button><span class="cal-info"></span></div></div>';
  const q = s => host.querySelector(s);

  function fixFoc() {
    const y = view.getFullYear(), m = view.getMonth(), same = d => d && d.getFullYear() === y && d.getMonth() === m && !blocked(d);
    if (same(val)) { foc = val; return; }
    if (same(foc)) return;
    foc = null;
    for (let d = 1; d <= calDaysIn(y, m); d++) { const x = new Date(y, m, d); if (!blocked(x)) { foc = x; break; } }
  }

  function draw() {
    const y = view.getFullYear(), m = view.getMonth(), lead = calLead(y, m, C.weekStart), len = calDaysIn(y, m);
    let h = '<span></span>'.repeat(lead);
    for (let d = 1; d <= len; d++) {
      const dt = new Date(y, m, d), off = blocked(dt), occ = calOccasion(dt), sel = calSame(dt, val);
      const cls = 'cal-d' + (sel ? ' sel' : '') + (calSame(dt, today) ? ' td' : '') + (off ? ' off' : '') + (occ ? ' occ' : '');
      const lab = dt.toLocaleDateString(L, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (occ ? ', ' + occ : '');
      h += `<button type="button" class="${cls}" data-d="${d}" tabindex="${calSame(dt, foc) ? 0 : -1}"${off ? ' disabled' : ''}${sel ? ' aria-pressed="true"' : ''} aria-label="${calEsc(lab)}"${occ ? ` title="${calEsc(occ)}"` : ''}>${d}${o.marked && o.marked(dt) ? '<i class="cal-dot"></i>' : ''}</button>`;
    }
    q('.cal-days').innerHTML = h;
    q('.cal-title').textContent = view.toLocaleDateString(L, { month: 'long', year: 'numeric' });
    q('[data-nav="-1"]').disabled = !!(min && new Date(y, m, 0) < min);
    q('[data-nav="1"]').disabled = !!(max && new Date(y, m + 1, 1) > max);
    q('.cal-today').disabled = blocked(today);
    q('.cal-info').textContent = o.info && val ? o.info(val) : '';
    if (want) { const el = q('.cal-d[tabindex="0"]'); if (el) el.focus(); want = false; }
  }

  function pick(dt) {
    if (blocked(dt)) return;
    val = dt; foc = dt; draw();
    if (o.onPick) o.onPick(new Date(dt));
  }

  host.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]'), day = e.target.closest('.cal-d');
    if (nav) { view = new Date(view.getFullYear(), view.getMonth() + +nav.dataset.nav, 1); fixFoc(); draw(); }
    else if (day && !day.disabled) pick(new Date(view.getFullYear(), view.getMonth(), +day.dataset.d));
    else if (e.target.closest('.cal-today') && !blocked(today)) pick(today);
  });

  host.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); if (o.onEscape) o.onEscape(); return; }
    if (!foc || !e.target.closest('.cal-d')) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let next;
    if (step) next = new Date(foc.getFullYear(), foc.getMonth(), foc.getDate() + step);
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const y = foc.getFullYear(), m = foc.getMonth() + (e.key === 'PageUp' ? -1 : 1);
      next = new Date(y, m, Math.min(foc.getDate(), calDaysIn(y, m)));
    } else return;
    e.preventDefault();
    if (blocked(next)) return;
    foc = next; view = new Date(next.getFullYear(), next.getMonth(), 1); want = true; draw();
  });

  fixFoc(); draw();
  return {
    setValue(d) {
      val = d ? day0(d) : null;
      if (val) { foc = val; view = new Date(val.getFullYear(), val.getMonth(), 1); }
      fixFoc(); draw();
    },
    refresh: draw,
    focus() { want = true; draw(); },
  };
}

if (typeof module !== 'undefined') module.exports = { CAL_CONFIG, calIsLeap, calDaysIn, calLead, calSame, calAddDays, calDayNumber, createCalendar };
