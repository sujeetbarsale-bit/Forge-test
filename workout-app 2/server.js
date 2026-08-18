require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const { router: workoutRoutes } = require("./routes/workouts");
const groupRoutes = require("./routes/groups");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/workout", workoutRoutes);
app.use("/api/groups", groupRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Home Workout App running at http://localhost:${PORT}`);
});
