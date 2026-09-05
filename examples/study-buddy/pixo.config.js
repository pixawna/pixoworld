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
  talk: {
    welcome: "I’m {companion}. I saved your study spot. What are we learning today?",
    prompts: ["Hi {companion}", "Let’s study", "I’m tired", "Tell me a joke"],
    readAloud: false,
    showAdvancedAI: false,
    replies: {
      hello: ["Hey, study friend. One small chapter at a time?"],
      focus: ["Pick one idea to understand, not a whole textbook. Open Focus when you want to start."],
      rest: ["Your brain deserves a breather. Look away from the screen for a moment."],
    },
  },
});
