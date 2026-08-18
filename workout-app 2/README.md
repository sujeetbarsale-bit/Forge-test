# Forge — Home Workout Log

A push/pull/legs home workout app with secure per-user login, a daily schedule,
and a streak + badge reward system. Works on both mobile browsers and desktop.

## Weekly schedule

| Day | Focus |
|---|---|
| Monday | Chest & Triceps |
| Tuesday | Back & Biceps |
| Wednesday | Legs & Core |
| Thursday | Chest & Shoulders |
| Friday | Biceps, Triceps & Forearms |
| Saturday | Core |
| Sunday | Rest day |

Every exercise is bodyweight-first and works at home with no gym equipment
(a chair, a towel, water bottles, or a resistance band cover the optional bits).
The exercise list is the same for everyone — nothing gendered about push-ups.

## Customize any day

The default schedule above is just a starting point. Tap **"Customize today's
workout"** to pick any combination of muscle groups (e.g. chest + biceps) and
even uncheck specific exercises you don't want. Your custom pick applies only
to that date — every other day still follows the default schedule unless you
customize it too. "Reset to default schedule" removes the override.

## Groups: train with friends

- Create a group and share its invite code, or join a friend's group with
  their code.
- **Chat**: post text or a progress selfie (photo). Only group members can
  see or post in a group's chat — membership is checked on every request.
- **Leaderboard**: see each member's current streak, badge count, and whether
  they've completed today's workout yet — a shared view of the group's
  productivity, not just your own.

## Security

- Passwords are never stored in plain text — they're hashed with **bcrypt**.
- Each session uses a **JWT token**; every workout/stats/log request checks
  that token and only ever reads or writes that user's own data.
- One person's account cannot see another person's calendar, streak, or logs.

## Reward system

- **Streak**: a running count of consecutive scheduled workout days completed.
  Rest days (Sunday) don't break it either way.
- **Streak freeze**: missing *one* scheduled day per week won't zero your streak —
  it just costs your one freeze for that week. Miss a second day in the same
  week and the streak resets, so it stays forgiving but still meaningful.
- **Weekly badges**: complete all 6 scheduled workout days in a Monday–Saturday
  week and you earn a badge for that week.
- A 5-week calendar heatmap shows completed, missed, and rest days at a glance.

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
cd workout-app
npm install
cp .env.example .env      # optionally edit JWT_SECRET
npm start
```

Then open **http://localhost:3000** in your browser (or your phone's browser,
if your phone is on the same Wi-Fi network as your computer — use your
computer's local IP instead of localhost, e.g. http://192.168.1.5:3000).

Create an account the first time you open it — from then on, log in with that
username and password. Your data (users + workout logs) is stored in
`data/db.json` on the server.

## Project structure

```
workout-app/
├── server.js                  # Express app entry point
├── db.js                      # simple JSON file storage
├── middleware/auth.js         # JWT verification
├── routes/auth.js             # register / login
├── routes/workouts.js         # today's workout, custom plans, streak+badges+calendar
├── routes/groups.js           # groups, chat, selfie uploads, leaderboard
├── data/exerciseLibrary.js    # muscle-group exercise library + default schedule
└── public/                    # frontend (HTML/CSS/JS)
    └── uploads/                # uploaded selfies land here (not committed to git)
```

## Next steps you might want later

- Deploy it (Render, Railway, Fly.io) so you can reach it from your phone
  anywhere, not just on your home Wi-Fi — this also matters for groups, since
  friends need to reach the same server to chat.
- Swap the JSON file storage for a real database (Postgres/MongoDB) if you
  expect more than a handful of users.
- Chat currently refreshes every 4 seconds (polling) rather than true
  real-time; swapping in Socket.IO would make it instant if that matters to you.
- Add exercise videos/GIFs or a "why this exercise" note for each move.
