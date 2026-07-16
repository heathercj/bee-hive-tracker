const express = require('express');
const db = require('../db');

const router = express.Router();

function boxTotals(hiveId) {
  const rows = db
    .prepare('SELECT box_type, SUM(frame_count) AS total FROM box_additions WHERE hive_id = ? GROUP BY box_type')
    .all(hiveId);
  const totals = { deep: 0, medium: 0 };
  for (const row of rows) {
    totals[row.box_type] = row.total;
  }
  return totals;
}

function lastInspectionDate(hiveId) {
  const row = db
    .prepare('SELECT MAX(inspection_date) AS last_date FROM inspections WHERE hive_id = ?')
    .get(hiveId);
  return row ? row.last_date : null;
}

function serializeHive(hive) {
  return {
    id: hive.id,
    name: hive.name,
    location: hive.location,
    feeding: !!hive.feeding,
    createdAt: hive.created_at,
    boxTotals: boxTotals(hive.id),
    lastInspectionDate: lastInspectionDate(hive.id),
  };
}

// List all hives
router.get('/', (req, res) => {
  const hives = db.prepare('SELECT * FROM hives ORDER BY name').all();
  res.json(hives.map(serializeHive));
});

// Hives overdue for inspection
router.get('/overdue', (req, res) => {
  const days = Number.parseInt(req.query.days, 10);
  const thresholdDays = Number.isFinite(days) && days >= 0 ? days : 7;

  const hives = db.prepare('SELECT * FROM hives ORDER BY name').all();
  const now = new Date();

  const overdue = hives
    .map(serializeHive)
    .filter((hive) => {
      if (!hive.lastInspectionDate) return true;
      const last = new Date(hive.lastInspectionDate);
      const diffDays = (now - last) / (1000 * 60 * 60 * 24);
      return diffDays >= thresholdDays;
    })
    .map((hive) => ({
      ...hive,
      daysSinceLastInspection: hive.lastInspectionDate
        ? Math.floor((now - new Date(hive.lastInspectionDate)) / (1000 * 60 * 60 * 24))
        : null,
    }));

  res.json({ thresholdDays, overdue });
});

// Get one hive
router.get('/:id', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.id);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });
  res.json(serializeHive(hive));
});

// Create a hive
router.post('/', (req, res) => {
  const { name, location } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Hive name is required' });
  }

  const info = db
    .prepare('INSERT INTO hives (name, location, feeding) VALUES (?, ?, 0)')
    .run(name.trim(), typeof location === 'string' ? location.trim() : null);

  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeHive(hive));
});

// Toggle feeding status
router.patch('/:id/feeding', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.id);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });

  const feeding = req.body.feeding ? 1 : 0;
  db.prepare('UPDATE hives SET feeding = ? WHERE id = ?').run(feeding, req.params.id);

  const updated = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.id);
  res.json(serializeHive(updated));
});

// List box additions for a hive
router.get('/:id/boxes', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.id);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });

  const boxes = db
    .prepare('SELECT * FROM box_additions WHERE hive_id = ? ORDER BY date_added')
    .all(req.params.id);
  res.json(boxes);
});

// Add a box configuration entry (e.g. "added a medium box with 8 frames on this date")
router.post('/:id/boxes', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.id);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });

  const { boxType, frameCount, dateAdded } = req.body;
  if (boxType !== 'deep' && boxType !== 'medium') {
    return res.status(400).json({ error: 'boxType must be "deep" or "medium"' });
  }
  const frames = Number.parseInt(frameCount, 10);
  if (!Number.isFinite(frames) || frames <= 0) {
    return res.status(400).json({ error: 'frameCount must be a positive number' });
  }
  if (!dateAdded || Number.isNaN(Date.parse(dateAdded))) {
    return res.status(400).json({ error: 'dateAdded must be a valid date' });
  }

  const info = db
    .prepare('INSERT INTO box_additions (hive_id, box_type, frame_count, date_added) VALUES (?, ?, ?, ?)')
    .run(req.params.id, boxType, frames, dateAdded);

  const box = db.prepare('SELECT * FROM box_additions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(box);
});

module.exports = router;
