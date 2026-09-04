window.PIXO_TEMPLATE = Object.freeze({
  id: "wellbeing-companion",
  companion: {
    name: "Bloom",
    browserTitle: "Bloom — a kinder daily rhythm",
    heroTitle: "Make room for\na softer day.",
    heroMessage: "Your energy matters. We can move at a human pace.",
    firstWords: "How are you, really? 🌱",
    greetings: ["A breath counts.", "Rest belongs in the plan.", "I’m here for the small wins."],
  },
  appearance: {
    accent: "#f5ad9d",
    accentSoft: "#fde5df",
    companionGlow: "rgba(236, 126, 110, 0.24)",
  },
  focus: {
    defaultMinutes: 15,
    options: [10, 15, 25, 40],
  },
  care: {
    waterTimes: ["09:30", "12:30", "15:30", "18:30"],
    mealTime: "17:00",
    waterGoal: 6,
  },
  starterTasks: ["Name one thing you need", "Drink a glass of water", "Step away from the screen for five minutes"],
});
