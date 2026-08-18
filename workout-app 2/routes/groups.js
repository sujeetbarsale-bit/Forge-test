const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { readDB, writeDB } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { computeStats } = require("./workouts");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext) || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

// Middleware: verify the requesting user is a member of :groupId
function requireMembership(req, res, next) {
  const db = readDB();
  const group = db.groups.find((g) => g.id === req.params.groupId);
  if (!group) return res.status(404).json({ error: "Group not found." });
  if (!group.memberIds.includes(req.userId)) {
    return res.status(403).json({ error: "You're not a member of this group." });
  }
  req.group = group;
  req.db = db;
  next();
}

// POST create a new group. Body: { name }
router.post("/create", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required." });
  }
  const db = readDB();
  const group = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: name.trim(),
    inviteCode: generateInviteCode(),
    createdBy: req.userId,
    createdAt: new Date().toISOString(),
    memberIds: [req.userId],
  };
  db.groups.push(group);
  writeDB(db);
  res.json({ group });
});

// POST join a group via invite code. Body: { inviteCode }
router.post("/join", requireAuth, (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: "Invite code is required." });

  const db = readDB();
  const group = db.groups.find(
    (g) => g.inviteCode.toLowerCase() === inviteCode.trim().toLowerCase()
  );
  if (!group) return res.status(404).json({ error: "No group found with that invite code." });

  if (!group.memberIds.includes(req.userId)) {
    group.memberIds.push(req.userId);
    writeDB(db);
  }
  res.json({ group });
});

// GET the groups the current user belongs to
router.get("/mine", requireAuth, (req, res) => {
  const db = readDB();
  const users = db.users;
  const groups = db.groups
    .filter((g) => g.memberIds.includes(req.userId))
    .map((g) => ({
      id: g.id,
      name: g.name,
      inviteCode: g.inviteCode,
      memberCount: g.memberIds.length,
    }));
  res.json({ groups });
});

// GET messages for a group (member-only)
router.get("/:groupId/messages", requireAuth, requireMembership, (req, res) => {
  const messages = req.db.messages
    .filter((m) => m.groupId === req.params.groupId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ messages });
});

// POST a text message or a selfie image to the group chat (member-only)
router.post(
  "/:groupId/messages",
  requireAuth,
  requireMembership,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  (req, res) => {
    const db = req.db;
    const usernameRec = db.users.find((u) => u.id === req.userId);
    const text = (req.body.text || "").trim();

    if (!text && !req.file) {
      return res.status(400).json({ error: "Message needs text or an image." });
    }

    const message = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      groupId: req.params.groupId,
      userId: req.userId,
      username: usernameRec ? usernameRec.username : "Unknown",
      text: text || null,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
    };
    db.messages.push(message);
    writeDB(db);
    res.json({ message });
  }
);

// GET shared productivity leaderboard for the group (member-only)
router.get("/:groupId/leaderboard", requireAuth, requireMembership, (req, res) => {
  const db = req.db;
  const members = req.group.memberIds.map((uid) => {
    const user = db.users.find((u) => u.id === uid);
    const stats = computeStats(db, uid);
    return {
      username: user ? user.username : "Unknown",
      streak: stats.streak,
      badges: stats.totalBadges,
      completedToday: stats.todayCompleted,
    };
  });
  members.sort((a, b) => b.streak - a.streak);
  res.json({ members });
});

module.exports = router;
