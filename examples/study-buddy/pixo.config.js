window.PIXO_TEMPLATE = Object.freeze({
  id: "study-buddy",
  companion: {
    name: "Mochi",
    browserTitle: "Mochi — study buddy",
    heroTitle: "One small chapter\nat a time.",
    heroMessage: "Pick the next lesson. I’ll keep the rhythm gentle.",
    firstWords: "Ready when you are! 📚",
    greetings: ["Tiny review, big payoff.", "I saved your study spot.", "Let’s make one idea click."],
  },
  appearance: {
    accent: "#a9d6b7",
    accentSoft: "#e5f5e9",
    companionGlow: "rgba(73, 131, 95, 0.28)",
  },
  focus: {
    defaultMinutes: 45,
    options: [25, 45, 60, 90],
  },
  care: {
    waterTimes: ["10:00", "13:00", "16:00"],
    mealTime: "19:00",
    waterGoal: 8,
  },
  starterTasks: ["Choose today’s lesson", "Review one difficult idea", "Write a three-line recap"],
});
