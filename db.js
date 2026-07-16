const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, 'beehive.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS hives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    feeding INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS box_additions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hive_id INTEGER NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
    box_type TEXT NOT NULL CHECK (box_type IN ('deep', 'medium')),
    frame_count INTEGER NOT NULL,
    date_added TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hive_id INTEGER NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
    inspection_date TEXT NOT NULL,
    queen_spotted INTEGER NOT NULL DEFAULT 0,
    eggs INTEGER NOT NULL DEFAULT 0,
    brood INTEGER NOT NULL DEFAULT 0,
    capped_brood INTEGER NOT NULL DEFAULT 0,
    drone_cells INTEGER NOT NULL DEFAULT 0,
    honey_storage INTEGER NOT NULL DEFAULT 0,
    pest_disease_notes TEXT,
    action_taken TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
