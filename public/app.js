// --- Small helpers ---------------------------------------------------------

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function formatDate(value) {
  if (!value) return 'never';
  return new Date(value).toLocaleDateString();
}

// --- Tabs --------------------------------------------------------------

document.querySelectorAll('.tab-button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'overdue') loadOverdue();
  });
});

// --- Add hive form -------------------------------------------------------

document.getElementById('add-hive-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const location = form.location.value.trim();
  if (!name) return;

  try {
    await api('/api/hives', { method: 'POST', body: JSON.stringify({ name, location }) });
    form.reset();
    loadHives();
  } catch (err) {
    alert(err.message);
  }
});

// --- Hive list -------------------------------------------------------------

let selectedHiveId = null;

async function loadHives() {
  const hives = await api('/api/hives');
  const list = document.getElementById('hive-list');
  list.innerHTML = '';

  if (hives.length === 0) {
    list.innerHTML = '<p>No hives yet. Add your first one above.</p>';
    return;
  }

  hives.forEach((hive) => {
    const card = document.createElement('div');
    card.className = 'hive-card';
    card.innerHTML = `
      <div>
        <div class="hive-name">${escapeHtml(hive.name)}</div>
        <div class="hive-meta">${escapeHtml(hive.location || 'No location set')} &middot;
          Deep frames: ${hive.boxTotals.deep} &middot; Medium frames: ${hive.boxTotals.medium} &middot;
          Last inspected: ${formatDate(hive.lastInspectionDate)}</div>
      </div>
      <div>
        ${hive.feeding ? '<span class="badge feeding">Feeding</span>' : ''}
      </div>
    `;
    card.addEventListener('click', () => openHiveDetail(hive.id));
    list.appendChild(card);
  });
}

async function openHiveDetail(hiveId) {
  selectedHiveId = hiveId;
  const detail = document.getElementById('hive-detail');
  detail.classList.remove('hidden');
  detail.innerHTML = '<p>Loading…</p>';

  const [hive, boxes, inspections] = await Promise.all([
    api(`/api/hives/${hiveId}`),
    api(`/api/hives/${hiveId}/boxes`),
    api(`/api/hives/${hiveId}/inspections`),
  ]);

  detail.innerHTML = `
    <button class="secondary close-detail" id="close-detail">Close</button>
    <h2>${escapeHtml(hive.name)}</h2>
    <p class="hive-meta">${escapeHtml(hive.location || 'No location set')}</p>

    <label class="inline-row">
      <input type="checkbox" id="feeding-toggle" ${hive.feeding ? 'checked' : ''} />
      Currently feeding this hive
    </label>

    <h3>Box configuration</h3>
    <div class="box-total-row">
      <span>Deep frames: <strong>${hive.boxTotals.deep}</strong></span>
      <span>Medium frames: <strong>${hive.boxTotals.medium}</strong></span>
    </div>
    <form id="add-box-form" class="inline-row">
      <label>
        Box type
        <select name="boxType">
          <option value="deep">Deep</option>
          <option value="medium">Medium</option>
        </select>
      </label>
      <label>
        Frames added
        <input type="number" name="frameCount" min="1" value="1" required />
      </label>
      <label>
        Date added
        <input type="date" name="dateAdded" required value="${new Date().toISOString().slice(0, 10)}" />
      </label>
      <button type="submit">Add</button>
    </form>
    <ul id="box-history">
      ${boxes
        .map(
          (b) =>
            `<li>${formatDate(b.date_added)}: +${b.frame_count} ${escapeHtml(b.box_type)} frames</li>`
        )
        .join('') || '<li>No box additions logged yet.</li>'}
    </ul>

    <h3>Log an inspection</h3>
    <form id="add-inspection-form">
      <label>
        Inspection date
        <input type="date" name="inspectionDate" required value="${new Date().toISOString().slice(0, 10)}" />
      </label>
      <label class="inline-row queen-spotted-row">
        <input type="checkbox" name="queenSpotted" /> Queen spotted
      </label>
      <div class="checkbox-grid">
        <label><input type="checkbox" name="eggs" /> Eggs</label>
        <label><input type="checkbox" name="brood" /> Brood</label>
        <label><input type="checkbox" name="cappedBrood" /> Capped brood</label>
        <label><input type="checkbox" name="droneCells" /> Drone cells</label>
        <label><input type="checkbox" name="honeyStorage" /> Honey storage</label>
      </div>
      <label>
        Pest / disease observations
        <textarea name="pestDiseaseNotes" placeholder="e.g. saw a few varroa mites on sticky board"></textarea>
      </label>
      <label>
        Action taken
        <textarea name="actionTaken" placeholder="e.g. added mite treatment strips"></textarea>
      </label>
      <button type="submit">Save Inspection</button>
    </form>

    <h3>Inspection history</h3>
    <div id="inspection-history">
      ${
        inspections
          .map((i) => {
            const tags = [];
            if (i.queen_spotted) tags.push('Queen spotted');
            if (i.eggs) tags.push('Eggs');
            if (i.brood) tags.push('Brood');
            if (i.capped_brood) tags.push('Capped brood');
            if (i.drone_cells) tags.push('Drone cells');
            if (i.honey_storage) tags.push('Honey storage');
            return `
              <div class="inspection-entry">
                <strong>${formatDate(i.inspection_date)}</strong>
                <div class="observations">${tags
                  .map((t) => `<span class="observation-tag">${escapeHtml(t)}</span>`)
                  .join('')}</div>
                ${i.pest_disease_notes ? `<div><em>Pests/disease:</em> ${escapeHtml(i.pest_disease_notes)}</div>` : ''}
                ${i.action_taken ? `<div><em>Action taken:</em> ${escapeHtml(i.action_taken)}</div>` : ''}
              </div>
            `;
          })
          .join('') || '<p>No inspections logged yet.</p>'
      }
    </div>
  `;

  document.getElementById('close-detail').addEventListener('click', () => {
    detail.classList.add('hidden');
    selectedHiveId = null;
  });

  document.getElementById('feeding-toggle').addEventListener('change', async (e) => {
    await api(`/api/hives/${hiveId}/feeding`, {
      method: 'PATCH',
      body: JSON.stringify({ feeding: e.target.checked }),
    });
    loadHives();
  });

  document.getElementById('add-box-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await api(`/api/hives/${hiveId}/boxes`, {
        method: 'POST',
        body: JSON.stringify({
          boxType: form.boxType.value,
          frameCount: Number(form.frameCount.value),
          dateAdded: form.dateAdded.value,
        }),
      });
      openHiveDetail(hiveId);
      loadHives();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('add-inspection-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await api(`/api/hives/${hiveId}/inspections`, {
        method: 'POST',
        body: JSON.stringify({
          inspectionDate: form.inspectionDate.value,
          queenSpotted: form.queenSpotted.checked,
          eggs: form.eggs.checked,
          brood: form.brood.checked,
          cappedBrood: form.cappedBrood.checked,
          droneCells: form.droneCells.checked,
          honeyStorage: form.honeyStorage.checked,
          pestDiseaseNotes: form.pestDiseaseNotes.value,
          actionTaken: form.actionTaken.value,
        }),
      });
      openHiveDetail(hiveId);
      loadHives();
    } catch (err) {
      alert(err.message);
    }
  });
}

// --- Overdue view ------------------------------------------------------

document.getElementById('overdue-days').addEventListener('change', loadOverdue);

async function loadOverdue() {
  const days = Number(document.getElementById('overdue-days').value) || 7;
  const { overdue } = await api(`/api/hives/overdue?days=${encodeURIComponent(days)}`);
  const list = document.getElementById('overdue-list');
  list.innerHTML = '';

  if (overdue.length === 0) {
    list.innerHTML = '<p>No overdue hives — nice work!</p>';
    return;
  }

  overdue.forEach((hive) => {
    const card = document.createElement('div');
    card.className = 'hive-card';
    card.innerHTML = `
      <div>
        <div class="hive-name">${escapeHtml(hive.name)}</div>
        <div class="hive-meta">Last inspected: ${formatDate(hive.lastInspectionDate)}</div>
      </div>
      <span class="badge overdue">${
        hive.daysSinceLastInspection === null ? 'Never inspected' : `${hive.daysSinceLastInspection} days ago`
      }</span>
    `;
    list.appendChild(card);
  });
}

// --- Initial load --------------------------------------------------------

loadHives();
