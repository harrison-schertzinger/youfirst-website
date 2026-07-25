/**
 * Offline tryout field sheet — ONE self-contained HTML file Harrison AirDrops
 * to a laptop/iPad and runs with zero connectivity. All CSS/JS inline, system
 * fonts only, roster embedded as a JSON literal, localStorage persistence
 * keyed to the generation timestamp, print stylesheet for the paper fallback.
 *
 * The generator is a pure function so it can be tested without auth or a
 * server. The embedded JS is deliberately framework-free ES2017 kept free of
 * backticks and "</script>" sequences; athlete data is only ever rendered via
 * textContent (never innerHTML), and the JSON literal escapes "<" so a hostile
 * player name cannot break out of the script tag.
 */

export interface FieldSheetAthlete {
  /** tryout_registrations.id — round-trips through export back to the DB row. */
  id: string;
  name: string;
  gradYear: number | null;
  position: string | null;
}

export function buildFieldSheetHtml(
  athletes: FieldSheetAthlete[],
  generatedAtIso: string,
  generatedAtLabel: string,
): string {
  const payload = {
    generatedAt: generatedAtIso,
    generatedAtLabel,
    athletes,
  };
  // </script>-safe + line-separator-safe JSON embedding
  const dataJson = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">',
    '<title>You. First Tryout Field Sheet</title>',
    '<style>' + FIELD_SHEET_CSS + '</style>',
    '</head>',
    '<body>',
    '<div id="app"></div>',
    '<script>window.__SHEET__ = ' + dataJson + ';</script>',
    '<script>' + FIELD_SHEET_JS + '</script>',
    '</body>',
    '</html>',
  ].join('\n');
}

const FIELD_SHEET_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #F8F9FA; color: #0F172A; padding-bottom: 80px;
  }
  button { font-family: inherit; cursor: pointer; }
  input, textarea, select { font-family: inherit; font-size: 16px; color: #0F172A; }

  .topbar {
    position: sticky; top: 0; z-index: 50; background: #FFFFFF;
    border-bottom: 2px solid #E2E8F0; box-shadow: 0 2px 8px rgba(15,23,42,0.06);
    padding: 10px 14px 12px;
  }
  .topbar-line1 { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .sheet-title { font-size: 15px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
  .sheet-stamp { font-size: 12px; font-weight: 600; color: #475569; }
  .totals { display: flex; gap: 8px; margin-top: 8px; }
  .total-box {
    flex: 1; background: #F1F5F9; border-radius: 12px; padding: 6px 4px 7px; text-align: center;
    border: 1px solid #E2E8F0;
  }
  .total-box .num { font-size: 22px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .total-box .lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B; }
  .total-box.checked .num { color: #059669; }
  .total-box.walkups .num { color: #B45309; }
  .actions { display: flex; gap: 8px; margin-top: 8px; }
  .btn {
    flex: 1; min-height: 48px; border-radius: 12px; font-size: 15px; font-weight: 800;
    letter-spacing: 0.02em; border: none;
  }
  .hint-line { margin-top: 6px; font-size: 12px; font-weight: 600; color: #64748B; text-align: center; }
  .btn-primary { background: #4A90D9; color: #FFFFFF; }
  .btn-dark { background: #0F172A; color: #FFFFFF; }

  .content { max-width: 860px; margin: 0 auto; padding: 0 12px; }
  .group { margin-top: 36px; }
  .group:first-of-type { margin-top: 20px; }
  .group-head { display: flex; align-items: center; gap: 10px; padding: 0 4px 10px; }
  .group-title { font-size: 20px; font-weight: 800; letter-spacing: 0.02em; }
  .group-count {
    background: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 800;
    border-radius: 999px; padding: 3px 12px; font-variant-numeric: tabular-nums;
  }
  .card {
    background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
    box-shadow: 0 4px 14px rgba(15,23,42,0.05); overflow: hidden;
  }
  .row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-top: 1px solid #EEF2F6; }
  .row:first-child { border-top: none; }
  .row.is-checked { background: #ECFDF5; }
  .row-who { flex: 1 1 40%; min-width: 0; }
  .row-name { font-size: 17px; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
  .row-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .pos { font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.03em; text-transform: uppercase; }
  .walkup-badge {
    font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: #92400E;
    background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 1px 6px;
  }
  .row-note { flex: 1 1 34%; min-width: 0; }
  .note-input {
    width: 100%; min-height: 44px; padding: 10px 10px; border-radius: 10px;
    border: 1.5px solid #CBD5E1; background: #FFFFFF; resize: none; line-height: 1.3;
  }
  .note-input:focus { outline: 2px solid #4A90D9; border-color: #4A90D9; }
  .check-btn {
    flex: 0 0 128px; min-height: 52px; border-radius: 12px; font-size: 13px; font-weight: 800;
    letter-spacing: 0.03em; text-transform: uppercase;
    background: #FFFFFF; color: #1E293B; border: 2px solid #475569;
  }
  .check-btn.on { background: #34D399; color: #052E1F; border-color: #059669; font-size: 14px; }
  .remove-walkup {
    flex: 0 0 34px; min-height: 44px; border: none; background: none;
    color: #94A3B8; font-size: 20px; font-weight: 700;
  }
  .empty-note { padding: 24px 16px; text-align: center; color: #64748B; font-size: 14px; }

  /* Walk-up overlay */
  .overlay {
    position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.55);
    display: none; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 16px;
  }
  .overlay.open { display: flex; }
  .sheet-modal {
    background: #FFFFFF; border-radius: 20px; width: 100%; max-width: 460px;
    padding: 20px 18px 18px; margin-top: 4vh; box-shadow: 0 12px 40px rgba(15,23,42,0.3);
  }
  .modal-title { font-size: 20px; font-weight: 800; margin-bottom: 14px; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #475569; margin-bottom: 5px; }
  .field input, .field select {
    width: 100%; min-height: 48px; padding: 10px 12px; border-radius: 12px;
    border: 1.5px solid #CBD5E1; background: #FFFFFF; -webkit-appearance: none; appearance: none;
  }
  .field input:focus, .field select:focus { outline: 2px solid #4A90D9; border-color: #4A90D9; }
  .field .hint { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .field-error { color: #EF4444; font-size: 13px; font-weight: 700; margin-bottom: 10px; display: none; }
  .field-error.show { display: block; }
  .pos-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .pos-opt {
    min-height: 46px; border-radius: 12px; border: 1.5px solid #CBD5E1; background: #FFFFFF;
    font-size: 13px; font-weight: 700; color: #475569;
  }
  .pos-opt.sel { background: #4A90D9; border-color: #2F6BAA; color: #FFFFFF; }
  .modal-actions { display: flex; gap: 10px; margin-top: 18px; }
  .modal-actions .btn { min-height: 52px; }
  .btn-ghost { background: #F1F5F9; color: #0F172A; }

  /* Export overlay */
  .export-box { width: 100%; height: 150px; font-size: 11px; border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 8px; margin-top: 10px; }
  .export-msg { font-size: 14px; color: #475569; line-height: 1.45; }
  .export-msg strong { color: #0F172A; }

  @media (max-width: 620px) {
    .row { flex-wrap: wrap; }
    .row-who { flex: 1 1 auto; }
    .check-btn { flex: 0 0 128px; }
    .row-note { flex: 1 1 100%; order: 3; }
  }

  @media print {
    body { background: #FFFFFF; padding: 0; }
    .topbar { position: static; box-shadow: none; border-bottom: 2px solid #000; }
    .actions, .totals, .remove-walkup, .hint-line { display: none !important; }
    .card { box-shadow: none; border: 1px solid #000; border-radius: 0; }
    .group { margin-top: 22px; page-break-inside: auto; }
    .group-head { page-break-after: avoid; }
    .row { page-break-inside: avoid; border-top: 1px solid #999; }
    .row.is-checked { background: #FFFFFF; }
    .check-btn {
      border: 2px solid #000; background: #FFFFFF !important; color: transparent !important;
      flex: 0 0 34px; min-height: 34px; border-radius: 4px;
    }
    .check-btn.on { color: transparent !important; }
    .check-btn.on::after { content: '\\2713'; color: #000; font-size: 20px; }
    .note-input { border: none; border-bottom: 1px solid #000; border-radius: 0; background: #FFFFFF; min-height: 24px; }
    .note-input::placeholder { color: transparent; }
    .group-count { background: #FFFFFF; color: #000; border: 1px solid #000; }
    .walkup-badge { border-color: #000; color: #000; background: #FFFFFF; }
    .overlay { display: none !important; }
  }
`;

const FIELD_SHEET_JS = `
(function () {
  'use strict';
  var SHEET = window.__SHEET__;
  var LS_PREFIX = 'yfFieldSheet:v1:';
  var LS_KEY = LS_PREFIX + SHEET.generatedAt;
  var GRAD_YEAR_MIN = 2027;
  var GRAD_YEAR_MAX = 2038;
  var POSITIONS = ['Attack', 'Midfield', 'Defense', 'Goalie', 'Undecided'];

  // ---- state ----
  var state = { checks: {}, notes: {}, walkUps: [] };

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.checks = parsed.checks || {};
          state.notes = parsed.notes || {};
          state.walkUps = Array.isArray(parsed.walkUps) ? parsed.walkUps : [];
        }
      }
    } catch (e) { /* corrupted state: start clean rather than crash at the field */ }
    // prune stale sheets (other generatedAt keys, >45 days old)
    try {
      var cutoff = Date.now() - 45 * 24 * 3600 * 1000;
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0 && k !== LS_KEY) {
          var other = null;
          try { other = JSON.parse(localStorage.getItem(k)); } catch (e2) {}
          if (!other || !other.savedAt || new Date(other.savedAt).getTime() < cutoff) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        checks: state.checks,
        notes: state.notes,
        walkUps: state.walkUps,
      }));
    } catch (e) {}
  }

  function makeUid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'wu-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function isChecked(id) { return !!(state.checks[id] && state.checks[id].c); }

  // ---- data shaping ----
  function lastNameKey(fullName) {
    var parts = String(fullName || '').trim().replace(/,/g, ' ').split(/\\s+/).filter(Boolean);
    var suffix = /^(jr|sr|ii|iii|iv|v|vi)\\.?$/i;
    while (parts.length > 1 && suffix.test(parts[parts.length - 1])) parts.pop();
    return (parts.length > 1 ? parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ') : parts[0] || '').toLowerCase();
  }

  function allRows() {
    var rows = [];
    var i;
    for (i = 0; i < SHEET.athletes.length; i++) {
      var a = SHEET.athletes[i];
      rows.push({ key: a.id, name: a.name, gradYear: a.gradYear, position: a.position, walkUp: false });
    }
    for (i = 0; i < state.walkUps.length; i++) {
      var w = state.walkUps[i];
      rows.push({ key: w.uid, name: w.name, gradYear: w.gradYear, position: w.position, walkUp: true });
    }
    return rows;
  }

  function buildGroups() {
    var rows = allRows();
    var byYear = {};
    var years = [];
    for (var i = 0; i < rows.length; i++) {
      var y = rows[i].gradYear == null ? 'tbd' : String(rows[i].gradYear);
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(rows[i]);
    }
    years.sort(function (a, b) {
      if (a === 'tbd') return 1;
      if (b === 'tbd') return -1;
      return Number(a) - Number(b); // soonest class (oldest athletes) first = newest class... resolved below
    });
    // Most recent class first = highest grad year is the YOUNGEST class.
    // "Newest class first" = descending year? A 2034 registered most recently as a class.
    years.sort(function (a, b) {
      if (a === 'tbd') return 1;
      if (b === 'tbd') return -1;
      return Number(b) - Number(a);
    });
    var groups = [];
    for (var g = 0; g < years.length; g++) {
      var list = byYear[years[g]];
      list.sort(function (a, b) {
        var ka = lastNameKey(a.name);
        var kb = lastNameKey(b.name);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
      groups.push({ year: years[g], rows: list });
    }
    return groups;
  }

  // ---- dom helpers (textContent only for data; no innerHTML with user data) ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- render ----
  var totalsEls = {};

  function render() {
    var app = document.getElementById('app');
    app.textContent = '';
    app.appendChild(renderTopbar());
    var content = el('div', 'content');
    var groups = buildGroups();
    if (groups.length === 0) {
      content.appendChild(el('div', 'empty-note', 'No registrants on this sheet.'));
    }
    for (var i = 0; i < groups.length; i++) {
      content.appendChild(renderGroup(groups[i]));
    }
    app.appendChild(content);
    app.appendChild(renderWalkUpOverlay());
    app.appendChild(renderExportOverlay());
    updateTotals();
  }

  function renderTopbar() {
    var bar = el('div', 'topbar');
    var line1 = el('div', 'topbar-line1');
    line1.appendChild(el('div', 'sheet-title', 'You. First \\u2014 Tryout Field Sheet'));
    line1.appendChild(el('div', 'sheet-stamp', 'Generated ' + SHEET.generatedAtLabel));
    bar.appendChild(line1);

    var totals = el('div', 'totals');
    var t1 = el('div', 'total-box'); t1.appendChild(el('div', 'num')); t1.appendChild(el('div', 'lbl', 'Registered'));
    var t2 = el('div', 'total-box checked'); t2.appendChild(el('div', 'num')); t2.appendChild(el('div', 'lbl', 'Checked In'));
    var t3 = el('div', 'total-box walkups'); t3.appendChild(el('div', 'num')); t3.appendChild(el('div', 'lbl', 'Walk-Ups'));
    totals.appendChild(t1); totals.appendChild(t2); totals.appendChild(t3);
    totalsEls = { reg: t1.firstChild, chk: t2.firstChild, wu: t3.firstChild };
    bar.appendChild(totals);

    var actions = el('div', 'actions');
    var addBtn = el('button', 'btn btn-primary', '+ Add Walk-Up');
    addBtn.type = 'button';
    addBtn.addEventListener('click', openWalkUp);
    var exportBtn = el('button', 'btn btn-dark', 'Export Results');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', doExport);
    actions.appendChild(addBtn); actions.appendChild(exportBtn);
    bar.appendChild(actions);
    bar.appendChild(el('div', 'hint-line', "Tap a player's status button to check her in \u2014 tap again to undo."));
    return bar;
  }

  function renderGroup(group) {
    var wrap = el('section', 'group');
    var head = el('div', 'group-head');
    head.appendChild(el('div', 'group-title', group.year === 'tbd' ? 'Year TBD' : 'Class of ' + group.year));
    head.appendChild(el('div', 'group-count', String(group.rows.length)));
    wrap.appendChild(head);
    var card = el('div', 'card');
    for (var i = 0; i < group.rows.length; i++) {
      card.appendChild(renderRow(group.rows[i]));
    }
    wrap.appendChild(card);
    return wrap;
  }

  function renderRow(row) {
    var r = el('div', 'row' + (isChecked(row.key) ? ' is-checked' : ''));
    r.id = 'row-' + row.key;

    var who = el('div', 'row-who');
    who.appendChild(el('div', 'row-name', row.name));
    var meta = el('div', 'row-meta');
    meta.appendChild(el('span', 'pos', row.position || 'Position TBD'));
    if (row.walkUp) meta.appendChild(el('span', 'walkup-badge', 'Walk-Up'));
    who.appendChild(meta);
    r.appendChild(who);

    var noteWrap = el('div', 'row-note');
    var note = document.createElement('textarea');
    note.className = 'note-input';
    note.rows = 1;
    note.placeholder = 'Notes';
    note.value = state.notes[row.key] || '';
    note.addEventListener('input', function () {
      if (note.value) state.notes[row.key] = note.value;
      else delete state.notes[row.key];
      saveState();
    });
    noteWrap.appendChild(note);
    r.appendChild(noteWrap);

    var btn = el('button', 'check-btn' + (isChecked(row.key) ? ' on' : ''), isChecked(row.key) ? '\\u2713 Checked In' : 'Not Arrived');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var now = isChecked(row.key);
      if (now) delete state.checks[row.key];
      else state.checks[row.key] = { c: 1, at: new Date().toISOString() };
      saveState();
      var on = !now;
      btn.className = 'check-btn' + (on ? ' on' : '');
      btn.textContent = on ? '\\u2713 Checked In' : 'Not Arrived';
      r.className = 'row' + (on ? ' is-checked' : '');
      updateTotals();
    });
    r.appendChild(btn);

    if (row.walkUp) {
      var rm = el('button', 'remove-walkup', '\\u00d7');
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Remove walk-up');
      rm.addEventListener('click', function () {
        if (!window.confirm('Remove walk-up "' + row.name + '" from this sheet?')) return;
        state.walkUps = state.walkUps.filter(function (w) { return w.uid !== row.key; });
        delete state.checks[row.key];
        delete state.notes[row.key];
        saveState();
        render();
      });
      r.appendChild(rm);
    }
    return r;
  }

  function updateTotals() {
    var checkedCount = 0;
    var rows = allRows();
    for (var i = 0; i < rows.length; i++) if (isChecked(rows[i].key)) checkedCount++;
    totalsEls.reg.textContent = String(SHEET.athletes.length);
    totalsEls.chk.textContent = String(checkedCount);
    totalsEls.wu.textContent = String(state.walkUps.length);
  }

  // ---- walk-up overlay ----
  var wuOverlay, wuName, wuYear, wuPos, wuEmail, wuPhone, wuError;
  var wuSelectedPos = null;

  function renderWalkUpOverlay() {
    wuOverlay = el('div', 'overlay');
    var modal = el('div', 'sheet-modal');
    modal.appendChild(el('div', 'modal-title', 'Add Walk-Up'));

    wuError = el('div', 'field-error', 'Name is required.');
    modal.appendChild(wuError);

    var f1 = el('div', 'field');
    f1.appendChild(el('label', null, 'Athlete Name'));
    wuName = document.createElement('input');
    wuName.type = 'text';
    wuName.autocapitalize = 'words';
    wuName.setAttribute('autocomplete', 'off');
    wuName.placeholder = 'First and last name';
    f1.appendChild(wuName);
    modal.appendChild(f1);

    var f2 = el('div', 'field');
    f2.appendChild(el('label', null, 'Graduation Year'));
    wuYear = document.createElement('select');
    var optNone = document.createElement('option');
    optNone.value = ''; optNone.textContent = 'Not sure';
    wuYear.appendChild(optNone);
    for (var y = GRAD_YEAR_MIN; y <= GRAD_YEAR_MAX; y++) {
      var o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      wuYear.appendChild(o);
    }
    f2.appendChild(wuYear);
    modal.appendChild(f2);

    var f3 = el('div', 'field');
    f3.appendChild(el('label', null, 'Position'));
    var grid = el('div', 'pos-grid');
    wuPos = [];
    POSITIONS.forEach(function (p) {
      var b = el('button', 'pos-opt', p);
      b.type = 'button';
      b.addEventListener('click', function () {
        wuSelectedPos = wuSelectedPos === p ? null : p;
        wuPos.forEach(function (x) { x.className = 'pos-opt' + (x.textContent === wuSelectedPos ? ' sel' : ''); });
      });
      wuPos.push(b);
      grid.appendChild(b);
    });
    f3.appendChild(grid);
    modal.appendChild(f3);

    var f4 = el('div', 'field');
    f4.appendChild(el('label', null, 'Parent Email'));
    wuEmail = document.createElement('input');
    wuEmail.type = 'email';
    wuEmail.setAttribute('autocomplete', 'off');
    wuEmail.placeholder = 'parent@email.com';
    f4.appendChild(wuEmail);
    modal.appendChild(f4);

    var f5 = el('div', 'field');
    f5.appendChild(el('label', null, 'Parent Phone'));
    wuPhone = document.createElement('input');
    wuPhone.type = 'tel';
    wuPhone.setAttribute('autocomplete', 'off');
    wuPhone.placeholder = '(555) 555-5555';
    f5.appendChild(wuPhone);
    modal.appendChild(f5);

    var acts = el('div', 'modal-actions');
    var cancel = el('button', 'btn btn-ghost', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeWalkUp);
    var save = el('button', 'btn btn-primary', 'Add Athlete');
    save.type = 'button';
    save.addEventListener('click', saveWalkUp);
    acts.appendChild(cancel); acts.appendChild(save);
    modal.appendChild(acts);

    wuOverlay.appendChild(modal);
    return wuOverlay;
  }

  function openWalkUp() {
    wuName.value = ''; wuYear.value = ''; wuEmail.value = ''; wuPhone.value = '';
    wuSelectedPos = null;
    wuPos.forEach(function (x) { x.className = 'pos-opt'; });
    wuError.className = 'field-error';
    wuOverlay.className = 'overlay open';
    setTimeout(function () { try { wuName.focus(); } catch (e) {} }, 50);
  }
  function closeWalkUp() { wuOverlay.className = 'overlay'; }

  function saveWalkUp() {
    var name = wuName.value.trim().replace(/\\s+/g, ' ');
    if (!name) {
      wuError.textContent = 'Name is required.';
      wuError.className = 'field-error show';
      return;
    }
    var gradYear = wuYear.value ? Number(wuYear.value) : null;
    state.walkUps.push({
      uid: makeUid(),
      name: name,
      gradYear: gradYear,
      position: wuSelectedPos,
      parentEmail: wuEmail.value.trim() || null,
      parentPhone: wuPhone.value.trim() || null,
      addedAt: new Date().toISOString(),
    });
    saveState();
    closeWalkUp();
    render();
    var added = document.getElementById('row-' + state.walkUps[state.walkUps.length - 1].uid);
    if (added && added.scrollIntoView) added.scrollIntoView({ block: 'center' });
  }

  // ---- export ----
  var exOverlay, exBox, exMsg;

  function renderExportOverlay() {
    exOverlay = el('div', 'overlay');
    var modal = el('div', 'sheet-modal');
    modal.appendChild(el('div', 'modal-title', 'Export Results'));
    exMsg = el('div', 'export-msg');
    modal.appendChild(exMsg);
    exBox = document.createElement('textarea');
    exBox.className = 'export-box';
    exBox.readOnly = true;
    exBox.addEventListener('click', function () { exBox.select(); });
    modal.appendChild(exBox);
    var acts = el('div', 'modal-actions');
    var copyBtn = el('button', 'btn btn-primary', 'Copy Text');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', function () {
      exBox.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      copyBtn.textContent = ok ? 'Copied \\u2713' : 'Select All + Copy manually';
    });
    var closeBtn = el('button', 'btn btn-ghost', 'Done');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () { exOverlay.className = 'overlay'; });
    acts.appendChild(copyBtn); acts.appendChild(closeBtn);
    modal.appendChild(acts);
    exOverlay.appendChild(modal);
    return exOverlay;
  }

  function buildExport() {
    var registrants = [];
    for (var i = 0; i < SHEET.athletes.length; i++) {
      var a = SHEET.athletes[i];
      var chk = state.checks[a.id];
      registrants.push({
        id: a.id,
        name: a.name,
        checkedIn: !!(chk && chk.c),
        checkedInAt: chk && chk.c ? chk.at : null,
        note: state.notes[a.id] || null,
      });
    }
    var walkUps = [];
    for (var j = 0; j < state.walkUps.length; j++) {
      var w = state.walkUps[j];
      var wchk = state.checks[w.uid];
      walkUps.push({
        uid: w.uid,
        name: w.name,
        gradYear: w.gradYear == null ? null : w.gradYear,
        position: w.position || null,
        parentEmail: w.parentEmail || null,
        parentPhone: w.parentPhone || null,
        checkedIn: !!(wchk && wchk.c),
        checkedInAt: wchk && wchk.c ? wchk.at : null,
        note: state.notes[w.uid] || null,
        addedAt: w.addedAt || null,
      });
    }
    return {
      kind: 'yf-tryout-field-results',
      version: 1,
      sheetGeneratedAt: SHEET.generatedAt,
      exportedAt: new Date().toISOString(),
      registrants: registrants,
      walkUps: walkUps,
    };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function doExport() {
    var data = buildExport();
    var json = JSON.stringify(data, null, 2);
    var now = new Date();
    var fname = 'tryout-results-' + now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + '-' + pad2(now.getHours()) + pad2(now.getMinutes()) + '.json';
    var downloaded = false;
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = fname;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      downloaded = true;
    } catch (e) {}
    exMsg.textContent = '';
    var p1 = document.createElement('div');
    if (downloaded) {
      p1.appendChild(document.createTextNode('A file named '));
      var s = document.createElement('strong');
      s.textContent = fname;
      p1.appendChild(s);
      p1.appendChild(document.createTextNode(' was downloaded. On iPad it lands in Files \\u2192 Downloads. Back on wifi, upload it on the Admin \\u2192 Tryouts \\u2192 Import page. If no file appeared, use Copy Text below and paste it into the Import page instead.'));
    } else {
      p1.textContent = 'This browser blocked the file download. Use Copy Text below and paste it into the Admin \\u2192 Tryouts \\u2192 Import page when you are back online.';
    }
    exMsg.appendChild(p1);
    exBox.value = json;
    exOverlay.className = 'overlay open';
  }

  // ---- boot ----
  loadState();
  render();
})();
`;

/**
 * Sort key: last name first, name suffixes (Jr., III, ...) ignored. Mirrors
 * lastNameKey inside FIELD_SHEET_JS — keep the two in sync.
 */
export function lastNameSortKey(fullName: string): string {
  const parts = String(fullName || "").trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
  const suffix = /^(jr|sr|ii|iii|iv|v|vi)\.?$/i;
  while (parts.length > 1 && suffix.test(parts[parts.length - 1])) parts.pop();
  return (
    parts.length > 1
      ? parts[parts.length - 1] + " " + parts.slice(0, -1).join(" ")
      : parts[0] || ""
  ).toLowerCase();
}
