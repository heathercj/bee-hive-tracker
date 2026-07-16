const express = require('express');
const db = require('../db');

const router = express.Router({ mergeParams: true });

function toBool(value) {
  return value ? 1 : 0;
}

// List inspection history for a hive (most recent first)
router.get('/', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.hiveId);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });

  const inspections = db
    .prepare('SELECT * FROM inspections WHERE hive_id = ? ORDER BY inspection_date DESC, id DESC')
    .all(req.params.hiveId);

  res.json(inspections);
});

// Log a new inspection
router.post('/', (req, res) => {
  const hive = db.prepare('SELECT * FROM hives WHERE id = ?').get(req.params.hiveId);
  if (!hive) return res.status(404).json({ error: 'Hive not found' });

  const {
    inspectionDate,
    queenSpotted,
    eggs,
    brood,
    cappedBrood,
    droneCells,
    honeyStorage,
    pestDiseaseNotes,
    actionTaken,
  } = req.body;

  if (!inspectionDate || Number.isNaN(Date.parse(inspectionDate))) {
    return res.status(400).json({ error: 'inspectionDate must be a valid date' });
  }

  const info = db
    .prepare(
      `INSERT INTO inspections
        (hive_id, inspection_date, queen_spotted, eggs, brood, capped_brood, drone_cells, honey_storage, pest_disease_notes, action_taken)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.hiveId,
      inspectionDate,
      toBool(queenSpotted),
      toBool(eggs),
      toBool(brood),
      toBool(cappedBrood),
      toBool(droneCells),
      toBool(honeyStorage),
      typeof pestDiseaseNotes === 'string' ? pestDiseaseNotes.trim() : null,
      typeof actionTaken === 'string' ? actionTaken.trim() : null
    );

  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(inspection);
});

module.exports = router;
