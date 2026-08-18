const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

const DEFAULT_SHAPE = { users: [], logs: [], customPlans: [], groups: [], messages: [] };

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_SHAPE, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  const data = JSON.parse(raw);
  // Backfill any collections missing from an older db.json
  let changed = false;
  for (const key of Object.keys(DEFAULT_SHAPE)) {
    if (!Array.isArray(data[key])) {
      data[key] = [];
      changed = true;
    }
  }
  if (changed) writeDB(data);
  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
