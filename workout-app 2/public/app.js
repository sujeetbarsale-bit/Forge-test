const API = "/api";

// ---------- Auth screen wiring ----------
const tabBtns = document.querySelectorAll(".tab-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.tab === "login") {
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    } else {
      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    }
  });
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Login failed.";
      return;
    }
    saveSession(data.token, data.username);
    showApp();
  } catch (err) {
    errorEl.textContent = "Could not reach the server.";
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;
  const errorEl = document.getElementById("register-error");
  errorEl.textContent = "";

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Registration failed.";
      return;
    }
    saveSession(data.token, data.username);
    showApp();
  } catch (err) {
    errorEl.textContent = "Could not reach the server.";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("forge_token");
  localStorage.removeItem("forge_username");
  location.reload();
});

function saveSession(token, username) {
  localStorage.setItem("forge_token", token);
  localStorage.setItem("forge_username", username);
}

function getToken() {
  return localStorage.getItem("forge_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// ---------- Screen switching ----------
function showApp() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("username-display").textContent =
    localStorage.getItem("forge_username") || "";
  loadToday();
  loadStats();
}

// ---------- Today's workout ----------
const completeBtn = document.getElementById("complete-btn");
let todayIsRest = false;

async function loadToday() {
  const res = await fetch(`${API}/workout/today`, { headers: authHeaders() });
  if (res.status === 401) return handleAuthExpired();
  const data = await res.json();

  document.getElementById("today-day").textContent = data.day;
  document.getElementById("today-title").textContent = data.title;
  todayIsRest = data.isRestDay;

  const restMsg = document.getElementById("rest-day-message");
  const list = document.getElementById("exercise-list");
  list.innerHTML = "";

  if (data.isRestDay) {
    restMsg.classList.remove("hidden");
    completeBtn.classList.add("hidden");
  } else {
    restMsg.classList.add("hidden");
    completeBtn.classList.remove("hidden");
    data.exercises.forEach((ex) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="ex-name">${ex.name}${ex.notes ? `<span class="ex-notes">${ex.notes}</span>` : ""}</span>
        <span class="ex-scheme">${ex.sets}×${ex.reps} · ${ex.restSeconds}s rest</span>
      `;
      list.appendChild(li);
    });
  }

  const pill = document.getElementById("status-pill");
  if (data.completed) {
    pill.textContent = "Done";
    pill.classList.add("done");
    completeBtn.textContent = "Undo completion";
  } else {
    pill.textContent = data.isRestDay ? "Rest" : "Not done yet";
    pill.classList.remove("done");
    completeBtn.textContent = "Mark today complete";
  }
  completeBtn.dataset.completed = data.completed ? "true" : "false";
}

completeBtn.addEventListener("click", async () => {
  const isCompleted = completeBtn.dataset.completed === "true";
  const endpoint = isCompleted ? "uncomplete" : "complete";
  await fetch(`${API}/workout/${endpoint}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  await loadToday();
  await loadStats();
});

// ---------- Streak + calendar ----------
async function loadStats() {
  const res = await fetch(`${API}/workout/stats`, { headers: authHeaders() });
  if (res.status === 401) return handleAuthExpired();
  const data = await res.json();

  document.getElementById("streak-count").textContent = data.streak;
  document.getElementById("badge-count").textContent = data.totalBadges;

  // Streak track: show the last 7 days from the calendar data
  const track = document.getElementById("streak-track");
  track.innerHTML = "";
  const last7 = data.calendar.slice(-7);
  last7.forEach((day) => {
    const node = document.createElement("div");
    node.className = "streak-node";
    if (day.isRestDay) node.classList.add("rest");
    else if (day.completed) node.classList.add("lit");
    const d = new Date(day.date);
    node.textContent = d.toLocaleDateString(undefined, { weekday: "narrow" });
    track.appendChild(node);
  });

  // Calendar grid
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
  data.calendar.forEach((day) => {
    const cell = document.createElement("div");
    cell.className = "cal-day";
    if (day.isFuture) cell.classList.add("future");
    else if (day.isRestDay) cell.classList.add("rest");
    else if (day.completed) cell.classList.add("done");
    else cell.classList.add("missed");
    cell.title = day.date;
    grid.appendChild(cell);
  });
}

function handleAuthExpired() {
  localStorage.removeItem("forge_token");
  localStorage.removeItem("forge_username");
  location.reload();
}

// ---------- Main tab switching (Today / Groups) ----------
document.querySelectorAll(".main-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".main-tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("today-view").classList.add("hidden");
    document.getElementById("groups-view").classList.add("hidden");
    document.getElementById(btn.dataset.view).classList.remove("hidden");
    if (btn.dataset.view === "groups-view") loadGroups();
  });
});

// ---------- Customize today's workout ----------
let libraryData = null;
let selectedGroups = new Set();
let uncheckedExercises = new Set(); // exercises explicitly deselected within a selected group

document.getElementById("open-customize-btn").addEventListener("click", async () => {
  document.getElementById("customize-overlay").classList.remove("hidden");
  document.getElementById("customize-error").textContent = "";
  if (!libraryData) {
    const res = await fetch(`${API}/workout/library`, { headers: authHeaders() });
    libraryData = await res.json();
  }
  selectedGroups = new Set();
  uncheckedExercises = new Set();
  renderGroupChips();
  renderExercisePicker();
});

document.getElementById("close-customize-btn").addEventListener("click", () => {
  document.getElementById("customize-overlay").classList.add("hidden");
});

function renderGroupChips() {
  const wrap = document.getElementById("group-chips");
  wrap.innerHTML = "";
  libraryData.groups.forEach((g) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "group-chip" + (selectedGroups.has(g.key) ? " selected" : "");
    chip.textContent = g.label;
    chip.addEventListener("click", () => {
      if (selectedGroups.has(g.key)) selectedGroups.delete(g.key);
      else selectedGroups.add(g.key);
      renderGroupChips();
      renderExercisePicker();
    });
    wrap.appendChild(chip);
  });
}

function renderExercisePicker() {
  const wrap = document.getElementById("custom-exercise-picker");
  wrap.innerHTML = "";
  libraryData.groups
    .filter((g) => selectedGroups.has(g.key))
    .forEach((g) => {
      const block = document.createElement("div");
      block.className = "custom-group-block";
      const heading = document.createElement("h4");
      heading.textContent = g.label;
      block.appendChild(heading);
      g.exercises.forEach((ex) => {
        const row = document.createElement("label");
        row.className = "custom-ex-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !uncheckedExercises.has(ex.name);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) uncheckedExercises.delete(ex.name);
          else uncheckedExercises.add(ex.name);
        });
        row.appendChild(checkbox);
        row.appendChild(document.createTextNode(`${ex.name} (${ex.sets}×${ex.reps})`));
        block.appendChild(row);
      });
      wrap.appendChild(block);
    });
}

document.getElementById("save-custom-btn").addEventListener("click", async () => {
  const errorEl = document.getElementById("customize-error");
  errorEl.textContent = "";
  if (selectedGroups.size === 0) {
    errorEl.textContent = "Pick at least one muscle group.";
    return;
  }
  const exerciseNames = [];
  libraryData.groups
    .filter((g) => selectedGroups.has(g.key))
    .forEach((g) => {
      g.exercises.forEach((ex) => {
        if (!uncheckedExercises.has(ex.name)) exerciseNames.push(ex.name);
      });
    });

  const res = await fetch(`${API}/workout/customize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ muscleGroups: Array.from(selectedGroups), exerciseNames }),
  });
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || "Could not save your workout.";
    return;
  }
  document.getElementById("customize-overlay").classList.add("hidden");
  await loadToday();
  await loadStats();
});

document.getElementById("reset-custom-btn").addEventListener("click", async () => {
  await fetch(`${API}/workout/customize`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  document.getElementById("customize-overlay").classList.add("hidden");
  await loadToday();
  await loadStats();
});

// ---------- Groups: list, create, join ----------
let currentGroupId = null;
let chatPollTimer = null;

document.getElementById("create-group-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("new-group-name").value.trim();
  if (!name) return;
  const res = await fetch(`${API}/groups/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (res.ok) {
    document.getElementById("new-group-name").value = "";
    loadGroups();
  }
});

document.getElementById("join-group-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const inviteCode = document.getElementById("join-group-code").value.trim();
  if (!inviteCode) return;
  const res = await fetch(`${API}/groups/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ inviteCode }),
  });
  const data = await res.json();
  if (res.ok) {
    document.getElementById("join-group-code").value = "";
    loadGroups();
  } else {
    alert(data.error || "Could not join that group.");
  }
});

async function loadGroups() {
  const res = await fetch(`${API}/groups/mine`, { headers: authHeaders() });
  if (res.status === 401) return handleAuthExpired();
  const data = await res.json();
  const list = document.getElementById("groups-list");
  list.innerHTML = "";
  if (data.groups.length === 0) {
    list.innerHTML = `<p class="hint">No groups yet — create one or join a friend's with their invite code.</p>`;
  }
  data.groups.forEach((g) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div>
        <div class="g-name">${g.name}</div>
        <div class="g-meta">${g.memberCount} member${g.memberCount === 1 ? "" : "s"} · code: ${g.inviteCode}</div>
      </div>
      <span>›</span>
    `;
    card.addEventListener("click", () => openGroup(g.id, g.name, g.inviteCode));
    list.appendChild(card);
  });
}

function openGroup(id, name, inviteCode) {
  currentGroupId = id;
  document.getElementById("groups-list-panel").classList.add("hidden");
  document.getElementById("group-detail-panel").classList.remove("hidden");
  document.getElementById("group-detail-name").textContent = name;
  document.getElementById("group-invite-display").textContent = `Invite code: ${inviteCode}`;
  switchGroupTab("chat");
  loadChat();
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(() => {
    if (currentGroupId && !document.getElementById("group-chat-tab").classList.contains("hidden")) {
      loadChat();
    }
  }, 4000);
}

document.getElementById("back-to-groups-btn").addEventListener("click", () => {
  currentGroupId = null;
  if (chatPollTimer) clearInterval(chatPollTimer);
  document.getElementById("group-detail-panel").classList.add("hidden");
  document.getElementById("groups-list-panel").classList.remove("hidden");
  loadGroups();
});

document.querySelectorAll(".group-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchGroupTab(btn.dataset.gtab));
});

function switchGroupTab(tab) {
  document.querySelectorAll(".group-tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.group-tab-btn[data-gtab="${tab}"]`).classList.add("active");
  document.getElementById("group-chat-tab").classList.toggle("hidden", tab !== "chat");
  document.getElementById("group-leaderboard-tab").classList.toggle("hidden", tab !== "leaderboard");
  if (tab === "leaderboard") loadLeaderboard();
  if (tab === "chat") loadChat();
}

async function loadChat() {
  if (!currentGroupId) return;
  const res = await fetch(`${API}/groups/${currentGroupId}/messages`, { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  const me = localStorage.getItem("forge_username");
  const wrap = document.getElementById("chat-messages");
  const wasAtBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 20;
  wrap.innerHTML = "";
  data.messages.forEach((m) => {
    const div = document.createElement("div");
    div.className = "chat-msg" + (m.username === me ? " mine" : "");
    const time = new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    div.innerHTML = `
      <div class="chat-meta">${m.username} · ${time}</div>
      <div class="chat-bubble">
        ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ""}
        ${m.imageUrl ? `<img src="${m.imageUrl}" alt="Progress selfie" />` : ""}
      </div>
    `;
    wrap.appendChild(div);
  });
  if (wasAtBottom) wrap.scrollTop = wrap.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("chat-image").addEventListener("change", () => {
  const file = document.getElementById("chat-image").files[0];
  document.getElementById("chat-image-name").textContent = file ? `Attached: ${file.name}` : "";
});

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentGroupId) return;
  const textInput = document.getElementById("chat-text");
  const imageInput = document.getElementById("chat-image");
  const text = textInput.value.trim();
  const file = imageInput.files[0];
  if (!text && !file) return;

  const formData = new FormData();
  if (text) formData.append("text", text);
  if (file) formData.append("image", file);

  const res = await fetch(`${API}/groups/${currentGroupId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type: let the browser set the multipart boundary
    body: formData,
  });
  if (res.ok) {
    textInput.value = "";
    imageInput.value = "";
    document.getElementById("chat-image-name").textContent = "";
    loadChat();
  }
});

async function loadLeaderboard() {
  if (!currentGroupId) return;
  const res = await fetch(`${API}/groups/${currentGroupId}/leaderboard`, { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  const wrap = document.getElementById("leaderboard-list");
  wrap.innerHTML = "";
  data.members.forEach((m) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <span class="lb-name">${m.username}</span>
      <span class="lb-stats">
        <span class="lb-today-pip ${m.completedToday ? "done" : ""}" title="${m.completedToday ? "Done today" : "Not done today"}"></span>
        ${m.badges} badge${m.badges === 1 ? "" : "s"}
        <span class="lb-streak">${m.streak}🔥</span>
      </span>
    `;
    wrap.appendChild(row);
  });
}

// ---------- Boot ----------
if (getToken()) {
  showApp();
}
