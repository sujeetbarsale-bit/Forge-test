// Exercise library organized by muscle group. Every exercise is bodyweight-first
// and home-friendly (a chair, a towel, water bottles, or a resistance band cover
// the optional bits). Nothing here is gendered — the same list works for anyone.

const library = {
  chest: [
    { name: "Push-ups", sets: 4, reps: "10-15", restSeconds: 60, notes: "Knee push-ups if needed" },
    { name: "Incline push-ups (hands on chair/couch)", sets: 3, reps: "10-15", restSeconds: 60 },
    { name: "Wide push-ups", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Decline push-ups (feet on chair)", sets: 3, reps: "8-12", restSeconds: 60 },
  ],
  back: [
    { name: "Superman hold", sets: 4, reps: "20-30 sec hold", restSeconds: 45 },
    { name: "Reverse snow angels", sets: 3, reps: "12-15", restSeconds: 45 },
    { name: "Towel rows (under a table edge)", sets: 3, reps: "12-15", restSeconds: 60, notes: "Or resistance band rows" },
    { name: "Prone Y-raises", sets: 3, reps: "12", restSeconds: 45 },
    { name: "Bird-dog", sets: 3, reps: "10 per side", restSeconds: 45 },
  ],
  shoulders: [
    { name: "Pike push-ups", sets: 4, reps: "8-12", restSeconds: 60 },
    { name: "Lateral raises (water bottles/dumbbells)", sets: 4, reps: "12-15", restSeconds: 45 },
    { name: "Front raises", sets: 3, reps: "12-15", restSeconds: 45 },
    { name: "Arm circles", sets: 2, reps: "30 sec each direction", restSeconds: 30 },
    { name: "Wall/table handstand hold (assisted)", sets: 3, reps: "15-20 sec", restSeconds: 60, notes: "Optional, skip if unsure" },
  ],
  biceps: [
    { name: "Band/backpack bicep curls", sets: 4, reps: "12-15", restSeconds: 45 },
    { name: "Hammer curls (water bottles/dumbbells)", sets: 3, reps: "12-15", restSeconds: 45 },
    { name: "Concentration curls", sets: 3, reps: "10-12 per side", restSeconds: 45 },
  ],
  triceps: [
    { name: "Diamond push-ups", sets: 3, reps: "8-12", restSeconds: 60 },
    { name: "Chair dips", sets: 3, reps: "10-15", restSeconds: 45 },
    { name: "Triceps kickbacks (band/light weight)", sets: 3, reps: "12-15", restSeconds: 45 },
    { name: "Overhead triceps extension (light weight)", sets: 3, reps: "12-15", restSeconds: 45 },
  ],
  forearms: [
    { name: "Wrist curls (light weight/book)", sets: 3, reps: "15-20", restSeconds: 30 },
    { name: "Reverse wrist curls", sets: 3, reps: "15-20", restSeconds: 30 },
    { name: "Farmer's carry (heavy bags, around the room)", sets: 3, reps: "30-40 sec", restSeconds: 45 },
    { name: "Towel wring twist", sets: 3, reps: "15 per direction", restSeconds: 30 },
  ],
  legs: [
    { name: "Bodyweight squats", sets: 4, reps: "15-20", restSeconds: 60 },
    { name: "Reverse lunges", sets: 3, reps: "10 per leg", restSeconds: 60 },
    { name: "Glute bridges", sets: 3, reps: "15-20", restSeconds: 45 },
    { name: "Wall sit", sets: 3, reps: "30-45 sec hold", restSeconds: 45 },
    { name: "Calf raises", sets: 3, reps: "20", restSeconds: 30 },
    { name: "Bulgarian split squat (rear foot on chair)", sets: 3, reps: "10 per leg", restSeconds: 60 },
  ],
  core: [
    { name: "Plank", sets: 4, reps: "30-60 sec hold", restSeconds: 45 },
    { name: "Bicycle crunches", sets: 4, reps: "20 total", restSeconds: 45 },
    { name: "Leg raises", sets: 3, reps: "12-15", restSeconds: 45 },
    { name: "Russian twists", sets: 3, reps: "20 total", restSeconds: 45 },
    { name: "Side plank", sets: 3, reps: "20-30 sec per side", restSeconds: 45 },
    { name: "Mountain climbers", sets: 3, reps: "20 total", restSeconds: 45 },
    { name: "Plank shoulder taps", sets: 3, reps: "20 total taps", restSeconds: 45 },
  ],
};

const MUSCLE_GROUPS = Object.keys(library);

const MUSCLE_GROUP_LABELS = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  legs: "Legs",
  core: "Core",
};

// The default day -> muscle group combo. Users can override any day's groups
// (and even pick specific exercises within them) from the Customize panel.
const defaultDayGroups = {
  sunday: { groups: [], isRestDay: true },
  monday: { groups: ["chest", "triceps"] },
  tuesday: { groups: ["back", "biceps"] },
  wednesday: { groups: ["legs", "core"] },
  thursday: { groups: ["chest", "shoulders"] },
  friday: { groups: ["biceps", "triceps", "forearms"] },
  saturday: { groups: ["core"] },
};

function titleForGroups(groups) {
  if (!groups || groups.length === 0) return "Rest Day";
  return groups.map((g) => MUSCLE_GROUP_LABELS[g] || g).join(" & ");
}

// Build the full exercise list for a set of muscle groups. Optionally filter
// down to a specific subset of exercise names (used for custom plans where
// the user picked individual moves, not just whole groups).
function buildWorkout(groups, exerciseNameFilter) {
  const exercises = [];
  groups.forEach((group) => {
    const groupExercises = library[group] || [];
    groupExercises.forEach((ex) => {
      if (!exerciseNameFilter || exerciseNameFilter.includes(ex.name)) {
        exercises.push({ ...ex, group });
      }
    });
  });
  return exercises;
}

module.exports = {
  library,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  defaultDayGroups,
  titleForGroups,
  buildWorkout,
};
