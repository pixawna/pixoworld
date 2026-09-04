/**
 * Pixo Companion Template
 *
 * This is the one file most template users should edit. Keep the same field
 * names, change the values, replace assets/pixo_2d.png, and deploy.
 */
window.PIXO_TEMPLATE = Object.freeze({
  id: "pixo-companion",
  companion: {
    name: "Pixo",
    browserTitle: "Pixo — your tiny work companion",
    heroTitle: "Let’s make today\nfeel a little lighter.",
    heroMessage: "I’ve got the small things. You bring the big ideas.",
    firstWords: "You’ve got this!",
    greetings: [
      "Hi! I saved you a little calm.",
      "I’m right here. ♡",
      "Tiny steps still count! ✦",
      "Let’s build something kind.",
    ],
  },
  appearance: {
    accent: "#ffcc58",
    accentSoft: "#fff1bf",
    companionGlow: "rgba(122, 91, 224, 0.24)",
  },
  focus: {
    defaultMinutes: 25,
    options: [15, 25, 45, 60],
  },
  care: {
    waterTimes: ["10:30", "13:00", "15:30"],
    mealTime: "17:00",
    waterGoal: 8,
  },
  starterTasks: [
    "Choose today’s main thing",
    "Drink a glass of water",
    "Take a quiet stretch break",
  ],
});
