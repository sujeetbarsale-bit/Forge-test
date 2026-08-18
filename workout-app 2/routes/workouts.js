const express = require("express");
const { readDB, writeDB } = require("../db");
const { requireAuth } = require("../middleware/auth");
const {
  library,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  defaultDayGroups,
  titleForGroups,
  buildWorkout,
} = require("../data/exerciseLibrary");

const router = express.Router();
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = {
  sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday",
};

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}
function dayKeyFor(d) {
  return DAY_KEYS[d.getDay()];
}
function getWeekStartKey(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return toDateKey(monday);
}

// Resolve what a given date's workout actually is: a saved custom plan
// for that user+date if one exists, otherwise the default day combo.
function resolveWorkout(db, userId, dateKey, dayKey) {
  const custom = db.customPlans.find((p) => p.userId === userId && p.date === dateKey);
  if (custom) {
    return {
      isRestDay: false,
      title: custom.title,
      exercises: custom.exercises,
      isCustom: true,
    };
  }
  const def = defaultDayGroups[dayKey];
  if (def.isRestDay) {
    return { isRestDay: true, title: "Rest Day", exercises: [], isCustom: false };
  }
  return {
    isRestDay: false,
    title: titleForGroups(def.groups),
    exercises: buildWorkout(def.groups),
    isCustom: false,
  };
}

// GET the exercise library, so the frontend can render a picker
router.get("/library", requireAuth, (req, res) => {
  res.json({
    groups: MUSCLE_GROUPS.map((key) => ({
      key,
      label: MUSCLE_GROUP_LABELS[key],
      exercises: library[key],
    })),
  });
});

// GET today's (or a given date's) workout
router.get("/today", requireAuth, (req, res) => {
  const now = req.query.date ? new Date(req.query.date) : new Date();
  const dayKey = dayKeyFor(now);
  const dateKey = toDateKey(now);
  const db = readDB();

  const workout = resolveWorkout(db, req.userId, dateKey, dayKey);
  const log = db.logs.find((l) => l.userId === req.userId && l.date === dateKey);

  res.json({
    date: dateKey,
    day: DAY_LABELS[dayKey],
    title: workout.title,
    isRestDay: workout.isRestDay,
    isCustom: workout.isCustom,
    exercises: workout.exercises,
    completed: !!(log && log.completed),
  });
});

// POST save a custom plan for a date (defaults to today). Body: { date?, muscleGroups: [...], exerciseNames?: [...] }
router.post("/customize", requireAuth, (req, res) => {
  const { muscleGroups, exerciseNames } = req.body;
  const dateKey = req.body.date || toDateKey(new Date());

  if (!Array.isArray(muscleGroups) || muscleGroups.length === 0) {
    return res.status(400).json({ error: "Pick at least one muscle group." });
  }
  const invalid = muscleGroups.filter((g) => !MUSCLE_GROUPS.includes(g));
  if (invalid.length) {
    return res.status(400).json({ error: `Unknown muscle group: ${invalid.join(", ")}` });
  }

  const exercises = buildWorkout(muscleGroups, exerciseNames && exerciseNames.length ? exerciseNames : null);
  if (exercises.length === 0) {
    return res.status(400).json({ error: "That selection has no exercises in it." });
  }

  const db = readDB();
  const existingIndex = db.customPlans.findIndex(
    (p) => p.userId === req.userId && p.date === dateKey
  );
  const plan = {
    userId: req.userId,
    date: dateKey,
    muscleGroups,
    title: titleForGroups(muscleGroups) + " (custom)",
    exercises,
  };
  if (existingIndex >= 0) db.customPlans[existingIndex] = plan;
  else db.customPlans.push(plan);
  writeDB(db);

  res.json({ success: true, plan });
});

// DELETE a custom plan for a date, reverting that day back to the default schedule
router.delete("/customize", requireAuth, (req, res) => {
  const dateKey = req.body.date || toDateKey(new Date());
  const db = readDB();
  db.customPlans = db.customPlans.filter(
    (p) => !(p.userId === req.userId && p.date === dateKey)
  );
  writeDB(db);
  res.json({ success: true });
});

// POST mark a date complete (defaults to today)
router.post("/complete", requireAuth, (req, res) => {
  const dateKey = req.body.date || toDateKey(new Date());
  const db = readDB();

  let log = db.logs.find((l) => l.userId === req.userId && l.date === dateKey);
  if (log) log.completed = true;
  else db.logs.push({ userId: req.userId, date: dateKey, completed: true });
  writeDB(db);
  res.json({ success: true, date: dateKey });
});

// POST undo a completion (defaults to today)
router.post("/uncomplete", requireAuth, (req, res) => {
  const dateKey = req.body.date || toDateKey(new Date());
  const db = readDB();
  const log = db.logs.find((l) => l.userId === req.userId && l.date === dateKey);
  if (log) log.completed = false;
  writeDB(db);
  res.json({ success: true, date: dateKey });
});

// Shared helper so groups.js can compute a member's streak/badges too
function computeStats(db, userId) {
  const userLogs = db.logs.filter((l) => l.userId === userId);
  const completedDates = new Set(userLogs.filter((l) => l.completed).map((l) => l.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const freezesUsedByWeek = {};
  const cursor = new Date(today);

  const todayDayKey = dayKeyFor(cursor);
  const todayIsRest = defaultDayGroups[todayDayKey].isRestDay;
  if (!todayIsRest && !completedDates.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dKey = toDateKey(cursor);
    const isRest = defaultDayGroups[dayKeyFor(cursor)].isRestDay;

    if (isRest) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (completedDates.has(dKey)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const weekKey = getWeekStartKey(cursor);
    const used = freezesUsedByWeek[weekKey] || 0;
    if (used < 1) {
      freezesUsedByWeek[weekKey] = used + 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  const badges = [];
  const weekBuckets = {};
  for (const l of userLogs) {
    if (!l.completed) continue;
    const wk = getWeekStartKey(new Date(l.date));
    weekBuckets[wk] = (weekBuckets[wk] || 0) + 1;
  }
  for (const [weekStart, count] of Object.entries(weekBuckets)) {
    if (count >= 6) badges.push(weekStart);
  }
  badges.sort();

  const calendar = [];
  const gridCursor = new Date(today);
  gridCursor.setDate(gridCursor.getDate() - 34);
  for (let i = 0; i < 35; i++) {
    const dKey = toDateKey(gridCursor);
    const isRest = defaultDayGroups[dayKeyFor(gridCursor)].isRestDay;
    calendar.push({
      date: dKey,
      isRestDay: isRest,
      completed: completedDates.has(dKey),
      isFuture: gridCursor > today,
    });
    gridCursor.setDate(gridCursor.getDate() + 1);
  }

  const todayCompleted = completedDates.has(toDateKey(today));

  return { streak, badges, totalBadges: badges.length, calendar, todayCompleted };
}

router.get("/stats", requireAuth, (req, res) => {
  const db = readDB();
  res.json(computeStats(db, req.userId));
});

module.exports = { router, computeStats };
