/* ================================================
   MONTE BELO — Dashboard Script
   ================================================ */

// ── CONFIG ──────────────────────────────────────
const STATUS_CONFIG = {
  fundacao:  { label: 'Fundação',  icon: '🏗️', color: '#6b7280' },
  alvenaria: { label: 'Alvenaria', icon: '🧱', color: '#eab308' },
  reboco:    { label: 'Reboco',    icon: '🪣', color: '#3b82f6' },
  pintura:   { label: 'Pintura',   icon: '🎨', color: '#22c55e' },
  finalizada:{ label: 'Finalizada',icon: '✅', color: '#a855f7' },
  pendente:  { label: 'Pendente',  icon: '⏳', color: '#ef4444' },
};

const ORDEM_ETAPAS = ['fundacao','alvenaria','reboco','pintura','finalizada'];

// ── STATE ────────────────────────────────────────
let allData       = [];
let filteredData  = [];
let activeStatus  = 'todos';
let activeQuadra  = 'todas';
let searchQuery   = '';
let currentView   = 'grid';
let editingCasa   = null;
let pendingEdits  = {};

// ── DOM REFS ─────────────────────────────────────
const $ = id => document.getElementById(id);

// ── INIT ─────────────────────────────────────────
async function init() {
  // Try loading from localStorage (saves edits), then fall back to data.json
  const saved = localStorage.getItem('monteBelo_data');
  if (saved) {
    try { allData = JSON.parse(saved); } catch(e) { allData = null; }
  }
  if (!allData || !allData.length) {
    try {
      const res  = await fetch('data.json');
      allData = await res.json();
    } catch(e) {
      showToast('Erro ao carregar data.json', 'info');
      allData = [];
    }
  }
  buildUI();
}

// ── BUILD UI ─────────────────────────────────────
function buildUI() {
  buildQuadraChips();
  buildFilterList();
  applyFilters();
  buildMapGrid();
  updateStats();
  bindEvents();
}

// Quadra chips (sidebar)
function buildQuadraChips() {
  const quadras = [...new Set(allData.map(d => d.quadra))].sort();
  const wrap = $('quadra-chips');
  wrap.innerHTML = `<div class="quadra-chip active" data-q="todas">Todas</div>` +
    quadras.map(q =>
      `<div class="quadra-chip" data-q="${q}">${q.replace('Q-','Q')}</div>`
    ).join('');
  wrap.querySelectorAll('.quadra-chip').forEach(c => {
    c.addEventListener('click', () => {
      wrap.querySelectorAll('.quadra-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      activeQuadra = c.dataset.q;
      applyFilters();
      renderView();
      updateStats();
    });
  });
}

// Filter list (sidebar)
function buildFilterList() {
  const wrap = $('filter-list');
  const todos = `<div class="filter-item active" data-s="todos">
    <div class="filter-label"><div class="filter-dot" style="background:#4b5563;margin-right:8px"></div>Todos os status</div>
    <span class="filter-count" id="cnt-todos">0</span>
  </div>`;
  const items = Object.entries(STATUS_CONFIG).map(([k,v]) =>
    `<div class="filter-item" data-s="${k}">
      <div class="filter-label">
        <div class="filter-dot" style="background:${v.color};margin-right:8px"></div>
        ${v.icon} ${v.label}
      </div>
      <span class="filter-count" id="cnt-${k}">0</span>
    </div>`
  ).join('');
  wrap.innerHTML = todos + items;

  wrap.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
      activeStatus = item.dataset.s;
      applyFilters();
      renderView();
      updateStats();
    });
  });
}

// Apply filters
function applyFilters() {
  filteredData = allData.filter(d => {
    const matchStatus = activeStatus === 'todos' || d.status === activeStatus;
    const matchQuadra = activeQuadra === 'todas' || d.quadra === activeQuadra;
    const matchSearch = !searchQuery ||
      d.casa.toLowerCase().includes(searchQuery) ||
      d.quadra.toLowerCase().includes(searchQuery);
    return matchStatus && matchQuadra && matchSearch;
  });
}

// Build map grid (once; show/hide lotes on filter)
function buildMapGrid() {
  const container = $('quadras-container');
  const quadras   = [...new Set(allData.map(d => d.quadra))].sort();

  container.innerHTML = quadras.map(q => {
    const lotes = allData.filter(d => d.quadra === q);
    return `
    <div class="quadra-block" id="block-${q}">
      <div class="quadra-header">
        <div class="quadra-title">
          🏘️ ${q}
          <span class="quadra-badge">${lotes.length} lotes</span>
        </div>
        <span class="quadra-progress-mini" id="prog-${q}"></span>
      </div>
      <div class="lotes-grid" id="grid-${q}">
        ${lotes.map(d => `
          <div class="lote"
               id="lote-${d.casa}"
               data-casa="${d.casa}"
               data-quadra="${d.quadra}"
               data-status="${d.status}"
               title="${d.casa} — ${STATUS_CONFIG[d.status]?.label || d.status}"
               tabindex="0"
               role="button"
               aria-label="Lote ${d.casa}">
            <span class="lote-icon">${STATUS_CONFIG[d.status]?.icon || '?'}</span>
            <div class="lote-num">${d.casa.split('-L')[1] || d.casa}</div>
            <span class="lote-status-label">${STATUS_CONFIG[d.status]?.label?.substring(0,4) || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');

  // Bind lote clicks
  container.querySelectorAll('.lote').forEach(el => {
    el.addEventListener('click', () => openLoteModal(el.dataset.casa));
    el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') openLoteModal(el.dataset.casa); });
  });

  buildTableView();
}

// Build table view
function buildTableView() {
  const wrap = $('table-body');
  wrap.innerHTML = allData.map(d => `
    <tr id="tr-${d.casa}" class="${filteredData.includes(d)?'':'hidden'}">
      <td>${d.quadra}</td>
      <td><strong>${d.casa}</strong></td>
      <td>
        <span class="status-pill" style="background:${STATUS_CONFIG[d.status]?.color}22;color:${STATUS_CONFIG[d.status]?.color};border:1px solid ${STATUS_CONFIG[d.status]?.color}44">
          ${STATUS_CONFIG[d.status]?.icon} ${STATUS_CONFIG[d.status]?.label || d.status}
        </span>
      </td>
      <td>
        <button class="btn" style="padding:3px 8px;font-size:.72rem" onclick="openLoteModal('${d.casa}')">
          ✏️ Editar
        </button>
      </td>
    </tr>
  `).join('');
}

// ── RENDER VIEW (filters) ────────────────────────
function renderView() {
  // Show/hide lotes
  allData.forEach(d => {
    const el = $(`lote-${d.casa}`);
    const tr = $(`tr-${d.casa}`);
    const visible = filteredData.includes(d);
    if (el) el.classList.toggle('hidden', !visible);
    if (tr) tr.classList.toggle('hidden', !visible);
  });

  // Show/hide quadra blocks if all lotes hidden
  const quadras = [...new Set(allData.map(d => d.quadra))];
  quadras.forEach(q => {
    const block  = $(`block-${q}`);
    const hasVis = filteredData.some(d => d.quadra === q);
    if (block) block.style.display = hasVis ? '' : 'none';
  });

  // Toolbar info
  $('toolbar-info').textContent = `${filteredData.length} de ${allData.length} unidades`;
}

// ── STATS ────────────────────────────────────────
function updateStats() {
  const total = allData.length;

  // Counts per status
  Object.keys(STATUS_CONFIG).forEach(s => {
    const cnt = allData.filter(d => d.status === s).length;
    const el  = $(`cnt-${s}`);
    if (el) el.textContent = cnt;
  });
  const todosEl = $('cnt-todos');
  if (todosEl) todosEl.textContent = total;

  // Totals
  $('stat-total').textContent = total;
  $('stat-filtered').textContent = filteredData.length;

  // Finalizadas
  const fin = allData.filter(d => d.status === 'finalizada').length;
  $('stat-fin').textContent = fin;

  // Progress (count finalizada + pintura + reboco + alvenaria + fundacao as partial)
  const pesos = { fundacao:0.1, alvenaria:0.3, reboco:0.55, pintura:0.8, finalizada:1, pendente:0 };
  const totalProg = allData.reduce((sum, d) => sum + (pesos[d.status]||0), 0);
  const pct = total ? Math.round((totalProg / total) * 100) : 0;
  $('progress-pct').textContent = `${pct}%`;
  $('progress-bar-fill').style.width = `${pct}%`;

  // Quadra progress labels
  const quadras = [...new Set(allData.map(d => d.quadra))];
  quadras.forEach(q => {
    const lotes  = allData.filter(d => d.quadra === q);
    const finQ   = lotes.filter(d => d.status === 'finalizada').length;
    const el     = $(`prog-${q}`);
    if (el) el.textContent = `${finQ}/${lotes.length} finalizados`;
  });
}

// ── EVENTS ───────────────────────────────────────
function bindEvents() {
  // Search
  $('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    applyFilters();
    renderView();
    updateStats();
    // Highlight searched lote
    if (searchQuery) {
      const match = filteredData[0];
      if (match) {
        const el = $(`lote-${match.casa}`);
        if (el) {
          el.scrollIntoView({ behavior:'smooth', block:'center' });
          el.classList.add('highlighted');
          setTimeout(() => el.classList.remove('highlighted'), 2000);
        }
      }
    }
  });

  // View toggle
  $('btn-grid').addEventListener('click', () => setView('grid'));
  $('btn-table').addEventListener('click', () => setView('table'));

  // Edit mode button
  $('btn-edit-mode').addEventListener('click', openBulkEdit);

  // Export JSON
  $('btn-export').addEventListener('click', exportJSON);

  // Import JSON
  $('btn-import').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', importJSON);

  // Modal close
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === $('modal-overlay')) closeModal();
  });
  $('btn-modal-close').addEventListener('click', closeModal);
  $('btn-modal-save').addEventListener('click', saveLoteEdit);

  // Bulk edit modal
  $('bulk-overlay').addEventListener('click', e => {
    if (e.target === $('bulk-overlay')) closeBulkEdit();
  });
  $('btn-bulk-close').addEventListener('click', closeBulkEdit);
  $('btn-bulk-apply').addEventListener('click', applyBulkEdit);

  // Keyboard ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBulkEdit(); }
  });
}

// ── VIEW TOGGLE ──────────────────────────────────
function setView(v) {
  currentView = v;
  $('grid-view').style.display  = v === 'grid'  ? '' : 'none';
  $('table-view').style.display = v === 'table' ? '' : 'none';
  $('btn-grid').classList.toggle('active', v === 'grid');
  $('btn-table').classList.toggle('active', v === 'table');
}

// ── LOTE MODAL ───────────────────────────────────
function openLoteModal(casa) {
  const d = allData.find(x => x.casa === casa);
  if (!d) return;
  editingCasa = casa;

  $('modal-casa-title').textContent = `Lote ${casa}`;
  $('detail-quadra').textContent    = d.quadra;
  $('detail-casa').textContent      = d.casa;
  $('detail-area').textContent      = '133,00 m²';
  $('edit-status').value            = d.status;

  $('modal-overlay').classList.add('open');
}

function closeModal() {
  $('modal-overlay').classList.remove('open');
  editingCasa = null;
}

function saveLoteEdit() {
  if (!editingCasa) return;
  const newStatus = $('edit-status').value;
  const d = allData.find(x => x.casa === editingCasa);
  if (!d) return;
  d.status = newStatus;

  // Update DOM
  const loteEl = $(`lote-${editingCasa}`);
  if (loteEl) {
    loteEl.dataset.status  = newStatus;
    loteEl.title           = `${editingCasa} — ${STATUS_CONFIG[newStatus]?.label}`;
    loteEl.querySelector('.lote-icon').textContent        = STATUS_CONFIG[newStatus]?.icon || '';
    loteEl.querySelector('.lote-status-label').textContent= STATUS_CONFIG[newStatus]?.label?.substring(0,4) || '';
  }
  // Update table row
  const tr = $(`tr-${editingCasa}`);
  if (tr) {
    tr.querySelector('.status-pill').innerHTML =
      `${STATUS_CONFIG[newStatus]?.icon} ${STATUS_CONFIG[newStatus]?.label}`;
    tr.querySelector('.status-pill').style.cssText =
      `background:${STATUS_CONFIG[newStatus]?.color}22;color:${STATUS_CONFIG[newStatus]?.color};border:1px solid ${STATUS_CONFIG[newStatus]?.color}44`;
  }

  saveLocal();
  applyFilters();
  renderView();
  updateStats();
  closeModal();
  showToast(`✅ Lote ${editingCasa} → ${STATUS_CONFIG[newStatus]?.label}`, 'success');
}

// ── BULK EDIT ────────────────────────────────────
function openBulkEdit() {
  $('bulk-overlay').classList.add('open');
  $('bulk-casas').value  = '';
  $('bulk-status').value = 'fundacao';
  $('bulk-result').textContent = '';
}

function closeBulkEdit() {
  $('bulk-overlay').classList.remove('open');
}

function applyBulkEdit() {
  const raw    = $('bulk-casas').value.trim();
  const status = $('bulk-status').value;
  if (!raw) { $('bulk-result').textContent = '⚠️ Informe os lotes.'; return; }

  // Parse entries: "Q01-L01, Q01-L02" or "Q01L01 Q01L02" or just numbers with quadra prefix
  const entries = raw.split(/[\s,;]+/).filter(Boolean).map(s => s.trim().toUpperCase());
  let updated = 0, notFound = [];

  entries.forEach(entry => {
    // Normalize: "Q01L01" → "Q01-L01", "Q1L1" → "Q01-L01"
    const norm = entry
      .replace(/^Q(\d+)-?L(\d+)$/i, (_,q,l) =>
        `Q${q.padStart(2,'0')}-L${l.padStart(2,'0')}`);
    const d = allData.find(x => x.casa === norm || x.casa.toUpperCase() === norm);
    if (d) {
      d.status = status;
      // Update DOM
      const el = $(`lote-${d.casa}`);
      if (el) {
        el.dataset.status = status;
        el.title          = `${d.casa} — ${STATUS_CONFIG[status]?.label}`;
        el.querySelector('.lote-icon').textContent         = STATUS_CONFIG[status]?.icon || '';
        el.querySelector('.lote-status-label').textContent = STATUS_CONFIG[status]?.label?.substring(0,4) || '';
      }
      updated++;
    } else {
      notFound.push(entry);
    }
  });

  saveLocal();
  applyFilters();
  renderView();
  updateStats();

  let msg = `✅ ${updated} lote(s) atualizados para "${STATUS_CONFIG[status]?.label}".`;
  if (notFound.length) msg += `\n⚠️ Não encontrados: ${notFound.join(', ')}`;
  $('bulk-result').textContent = msg;
  showToast(`${updated} lote(s) atualizados`, 'success');
}

// ── EXPORT / IMPORT ──────────────────────────────
function exportJSON() {
  const blob = new Blob([JSON.stringify(allData, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'monte-belo-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exportado', 'success');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error();
      // Merge: update existing statuses
      imported.forEach(imp => {
        const d = allData.find(x => x.casa === imp.casa);
        if (d && imp.status) d.status = imp.status;
      });
      saveLocal();
      // Rebuild
      buildMapGrid();
      applyFilters();
      renderView();
      updateStats();
      showToast(`✅ ${imported.length} registros importados`, 'success');
    } catch {
      showToast('❌ JSON inválido', 'info');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── LOCAL STORAGE ────────────────────────────────
function saveLocal() {
  try { localStorage.setItem('monteBelo_data', JSON.stringify(allData)); } catch(e) {}
}

// ── TOAST ────────────────────────────────────────
function showToast(msg, type='info') {
  const t = $('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── START ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
