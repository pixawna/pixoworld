(() => {
  const STORAGE_KEY = "pixo-app-v1";
  const CONFIG = window.PIXO_TEMPLATE || {};
  const COMPANION = CONFIG.companion || {};
  const CARE_DEFAULTS = CONFIG.care || {};
  const FOCUS_DEFAULTS = CONFIG.focus || {};
  const companionName = COMPANION.name || "Pixo";
  const defaultWaterTimes = Array.isArray(CARE_DEFAULTS.waterTimes) && CARE_DEFAULTS.waterTimes.length
    ? CARE_DEFAULTS.waterTimes
    : ["10:30", "13:00", "15:30"];
  const defaultWaterTimesValue = defaultWaterTimes.join(",");
  const defaultMealTime = CARE_DEFAULTS.mealTime || "17:00";
  const defaultWaterGoal = Math.min(16, Math.max(4, Number(CARE_DEFAULTS.waterGoal) || 8));
  const defaultFocusLength = Number(FOCUS_DEFAULTS.defaultMinutes) || 25;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const profileState = $("#profile-state");
  const focusState = $("#focus-state");
  const growthState = $("#growth-state");
  const checkinState = $("#checkin-state");
  let careState = $("#care-state");
  const appPersistentState = $("#app-persistent-state");
  const taskList = $("#task-list");
  const memoryLog = $("#memory-log");
  const timerDisplay = $("#timer-display");
  const timerToggle = $("#timer-toggle");
  const timerRing = $("#timer-ring");
  const syncStatus = $("#sync-status");

  let timer = {
    mode: "focus",
    duration: defaultFocusLength * 60,
    remaining: defaultFocusLength * 60,
    running: false,
    endAt: null,
    interval: null,
  };
  let selectedMood = "";
  let toastTimeout;
  let pixoAnimationTimeout;
  let legacySnapshot = null;
  let migratingLegacy = false;
  let audioContext;
  let ambientNodes = [];

  const readState = (container, field, fallback = "") =>
    container?.querySelector(`[data-field="${field}"]`)?.textContent.trim() || fallback;

  const writeState = (container, field, value) => {
    const target = container?.querySelector(`[data-field="${field}"]`);
    if (target) target.textContent = String(value);
  };

  const ensureStateSchema = () => {
    if (!profileState.querySelector('[data-field="water-goal"]')) {
      const waterGoal = document.createElement("span");
      waterGoal.dataset.field = "water-goal";
      waterGoal.textContent = String(defaultWaterGoal);
      profileState.append(waterGoal);
    }
    if (!careState) {
      careState = document.createElement("div");
      careState.id = "care-state";
      careState.innerHTML = '<span data-field="water-count">0</span><span data-field="water-date"></span>';
      appPersistentState.append(careState);
    }
  };

  const escapeHTML = (value) => {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  };

  const showToast = (message) => {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  };

  const animatePixo = (message = `${companionName} is right here. ♡`) => {
    const pixo = $("#pixo-character");
    $("#speech-bubble").textContent = message;
    pixo.classList.remove("is-celebrating");
    void pixo.offsetWidth;
    pixo.classList.add("is-celebrating");
    window.clearTimeout(pixoAnimationTimeout);
    pixoAnimationTimeout = window.setTimeout(() => pixo.classList.remove("is-celebrating"), 820);
  };

  const setSyncStatus = (label, state = "") => {
    syncStatus.classList.remove("is-live", "is-saving");
    if (state) syncStatus.classList.add(state);
    $("span:last-child", syncStatus).textContent = label;
  };

  const isPageLoveHost = () =>
    location.protocol === "https:" && location.hostname.endsWith(".onpagelove.com");

  const snapshot = () => ({
    profile: {
      name: readState(profileState, "name", "friend"),
      focusLength: readState(profileState, "focus-length", String(defaultFocusLength)),
      waterTimes: readState(profileState, "water-times", defaultWaterTimesValue),
      waterGoal: readState(profileState, "water-goal", String(defaultWaterGoal)),
      mealTime: readState(profileState, "meal-time", defaultMealTime),
    },
    focus: {
      sessions: readState(focusState, "sessions", "0"),
      minutes: readState(focusState, "minutes", "0"),
      streak: readState(focusState, "streak", "1"),
      dailyDate: readState(focusState, "daily-date", ""),
      lastFocusDate: readState(focusState, "last-focus-date", ""),
    },
    growth: {
      xp: readState(growthState, "xp", "35"),
      level: readState(growthState, "level", "1"),
    },
    checkin: {
      mood: readState(checkinState, "mood", ""),
      note: readState(checkinState, "note", ""),
      date: readState(checkinState, "date", ""),
    },
    care: {
      waterCount: readState(careState, "water-count", "0"),
      waterDate: readState(careState, "water-date", ""),
    },
    tasks: taskList.innerHTML,
    memories: memoryLog.innerHTML,
  });

  const saveLocal = () => {
    if (isPageLoveHost()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    } catch (error) {
      console.warn("Pixo could not save a local preview snapshot.", error);
    }
  };

  const hydrateLocal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      if (isPageLoveHost()) legacySnapshot = saved;
      writeState(profileState, "name", saved.profile?.name || "friend");
      writeState(profileState, "focus-length", saved.profile?.focusLength || String(defaultFocusLength));
      writeState(profileState, "water-times", saved.profile?.waterTimes || defaultWaterTimesValue);
      writeState(profileState, "water-goal", saved.profile?.waterGoal || String(defaultWaterGoal));
      writeState(profileState, "meal-time", saved.profile?.mealTime || defaultMealTime);
      writeState(focusState, "sessions", saved.focus?.sessions || "0");
      writeState(focusState, "minutes", saved.focus?.minutes || "0");
      writeState(focusState, "streak", saved.focus?.streak || "1");
      writeState(focusState, "daily-date", saved.focus?.dailyDate || "");
      writeState(focusState, "last-focus-date", saved.focus?.lastFocusDate || "");
      writeState(growthState, "xp", saved.growth?.xp || "35");
      writeState(growthState, "level", saved.growth?.level || "1");
      writeState(checkinState, "mood", saved.checkin?.mood || "");
      writeState(checkinState, "note", saved.checkin?.note || "");
      writeState(checkinState, "date", saved.checkin?.date || "");
      writeState(careState, "water-count", saved.care?.waterCount || "0");
      writeState(careState, "water-date", saved.care?.waterDate || "");
      if (saved.tasks) taskList.innerHTML = saved.tasks;
      if (saved.memories) memoryLog.innerHTML = saved.memories;
    } catch (error) {
      console.warn("Pixo found an unreadable local preview snapshot.", error);
    }
  };

  const waitForPageLoveMethod = (element, method, timeout = 6500) => {
    if (typeof element?.[method] === "function") return Promise.resolve(true);
    if (!isPageLoveHost()) return Promise.resolve(false);

    return new Promise((resolve) => {
      const started = Date.now();
      let timerId;
      const finish = (ready) => {
        window.clearInterval(timerId);
        document.removeEventListener("PLCapability", check);
        resolve(ready);
      };
      const check = () => {
        if (typeof element?.[method] === "function") finish(true);
        else if (Date.now() - started >= timeout) finish(false);
      };
      document.addEventListener("PLCapability", check);
      timerId = window.setInterval(check, 100);
      check();
    });
  };

  const migrateLegacyBrowserState = async () => {
    if (!legacySnapshot || !isPageLoveHost() || migratingLegacy) return;
    migratingLegacy = true;
    const targets = [appPersistentState, taskList, memoryLog];
    if (!(await waitForPageLoveMethod(appPersistentState, "PUT"))) {
      migratingLegacy = false;
      return;
    }

    try {
      setSyncStatus("Moving memories to PageLove…", "is-saving");
      for (const target of targets) {
        const response = await fetch(`${location.origin}${location.pathname}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "text/html",
            Range: `selector=#${target.id}`,
          },
          body: target.outerHTML,
        });
        if (!response?.ok) throw new Error(`PageLove returned ${response?.status || "an error"}`);
      }
      localStorage.removeItem(STORAGE_KEY);
      legacySnapshot = null;
      setSyncStatus("PageLove synced", "is-live");
    } catch (error) {
      console.warn("Pixo could not migrate legacy browser data to PageLove.", error);
      setSyncStatus("PageLove sync needs attention");
    } finally {
      migratingLegacy = false;
    }
  };

  const persist = async (element, successMessage = "Saved with Pixo") => {
    const canWrite = await waitForPageLoveMethod(element, "PUT");
    if (!canWrite) {
      if (!isPageLoveHost()) {
        saveLocal();
        setSyncStatus("Saved locally");
      } else {
        setSyncStatus("PageLove connection unavailable");
        showToast("Pixo could not reach PageLove. Please try again.");
      }
      return false;
    }

    try {
      setSyncStatus("Saving…", "is-saving");
      const response = await element.PUT();
      if (!response?.ok) throw new Error(`PageLove returned ${response?.status || "an error"}`);
      setSyncStatus("PageLove synced", "is-live");
      if (successMessage) showToast(successMessage);
      return true;
    } catch (error) {
      console.warn("PageLove sync failed.", error);
      setSyncStatus("PageLove sync needs attention");
      showToast("Pixo could not sync that change. Please try again.");
      return false;
    }
  };

  const appendWithPageLove = async (parent, html, localNode) => {
    const canWrite = await waitForPageLoveMethod(parent, "POST");
    if (!canWrite) {
      parent.append(localNode);
      if (!isPageLoveHost()) saveLocal();
      setSyncStatus(isPageLoveHost() ? "PageLove connection unavailable" : "Saved locally");
      return;
    }

    try {
      setSyncStatus("Saving…", "is-saving");
      const responseNode = await parent.POST(html);
      setSyncStatus("PageLove synced", "is-live");
      return responseNode;
    } catch (error) {
      console.warn("PageLove POST failed.", error);
      parent.append(localNode);
      if (!isPageLoveHost()) saveLocal();
      setSyncStatus(isPageLoveHost() ? "PageLove sync needs attention" : "Saved locally");
    }
  };

  const removeWithPageLove = async (element) => {
    const canWrite = await waitForPageLoveMethod(element, "DELETE");
    if (!canWrite) {
      element.remove();
      if (!isPageLoveHost()) saveLocal();
      else setSyncStatus("PageLove connection unavailable");
      return;
    }

    try {
      setSyncStatus("Saving…", "is-saving");
      await element.DELETE();
      setSyncStatus("PageLove synced", "is-live");
    } catch (error) {
      console.warn("PageLove DELETE failed.", error);
      setSyncStatus("PageLove sync needs attention");
      showToast("Pixo could not remove that yet. Please try again.");
    }
  };

  const setDateAndGreeting = () => {
    const now = new Date();
    $("#current-date").textContent = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
    const hour = now.getHours();
    $("#day-part").textContent = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  };

  const applyTemplateConfig = () => {
    document.title = COMPANION.browserTitle || `${companionName} — your tiny work companion`;
    $("#brand-name").textContent = companionName.toLowerCase();
    $("#presence-label").textContent = `${companionName} is here`;
    $("#companion-title").replaceChildren();
    String(COMPANION.heroTitle || "Let’s make today\nfeel a little lighter.")
      .split("\n")
      .forEach((line, index) => {
        if (index) $("#companion-title").append(document.createElement("br"));
        $("#companion-title").append(document.createTextNode(line));
      });
    $("#pixo-message").textContent = COMPANION.heroMessage || "I’ve got the small things. You bring the big ideas.";
    $("#speech-bubble").textContent = COMPANION.firstWords || "You’ve got this!";
    $("#pixo-character").alt = `${companionName}, a cheerful digital companion`;
    $("#pixo-character").setAttribute("aria-label", `Say hello to ${companionName}`);
    $(".pixo-scene").setAttribute("aria-label", `${companionName}, your digital companion`);
    $(".reminder-panel__intro .section-kicker").textContent = `${companionName} cares`;
    $(".checkin-copy p").textContent = `No need to fix it. ${companionName} just wants to know.`;
    $(".memory-strip small").textContent = `What ${companionName} remembers`;
    $("#page-love-info").textContent = "Powered by PageLove";

    const appearance = CONFIG.appearance || {};
    if (appearance.accent) document.documentElement.style.setProperty("--yellow", appearance.accent);
    if (appearance.accentSoft) document.documentElement.style.setProperty("--yellow-soft", appearance.accentSoft);
    if (appearance.companionGlow) document.documentElement.style.setProperty("--companion-glow", appearance.companionGlow);

    const focusOptions = Array.isArray(FOCUS_DEFAULTS.options) && FOCUS_DEFAULTS.options.length
      ? FOCUS_DEFAULTS.options
      : [15, 25, 45, 60];
    const currentFocus = Number(readState(profileState, "focus-length", String(defaultFocusLength)));
    const values = [...new Set([...focusOptions, currentFocus])].filter((value) => Number(value) > 0).sort((a, b) => a - b);
    $("#focus-length").innerHTML = values
      .map((value) => `<option value="${Number(value)}">${Number(value)} minutes</option>`)
      .join("");

    const hasPersonalActivity = Boolean(
      readState(checkinState, "note", "")
      || Number(readState(focusState, "sessions", "0"))
      || readState(careState, "water-date", ""),
    );
    const starterTasks = Array.isArray(CONFIG.starterTasks) ? CONFIG.starterTasks.filter(Boolean).slice(0, 8) : [];
    const isDefaultTaskList = $$(".task", taskList).every((task) => ["task-welcome", "task-water", "task-stretch"].includes(task.id));
    if (!hasPersonalActivity && isDefaultTaskList && starterTasks.length) {
      taskList.replaceChildren(...starterTasks.map((label, index) => makeTask(`starter-${index + 1}`, String(label))));
      writeState(profileState, "focus-length", String(defaultFocusLength));
      writeState(profileState, "water-times", defaultWaterTimesValue);
      writeState(profileState, "water-goal", String(defaultWaterGoal));
      writeState(profileState, "meal-time", defaultMealTime);
    }
  };

  const localDateKey = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const rollCareForward = () => {
    const today = localDateKey();
    if (readState(careState, "water-date", "") === today) return;
    writeState(careState, "water-count", "0");
    writeState(careState, "water-date", today);
  };

  const nextCareMoment = () => {
    const now = new Date();
    const moments = [
      ...reminderTimes().water.map((time) => ({ time, label: "Water" })),
      ...reminderTimes().meal.map((time) => ({ time, label: "Meal" })),
    ];
    const candidates = moments.flatMap((moment) => [0, 1].map((dayOffset) => {
      const [hour, minute] = moment.time.split(":").map(Number);
      const at = new Date(now);
      at.setDate(at.getDate() + dayOffset);
      at.setHours(hour, minute, 0, 0);
      return { ...moment, at };
    })).filter((moment) => moment.at >= now).sort((a, b) => a.at - b.at);
    return candidates[0];
  };

  const updateCareUI = () => {
    rollCareForward();
    const count = Math.max(0, Number(readState(careState, "water-count", "0")) || 0);
    const goal = Math.min(16, Math.max(4, Number(readState(profileState, "water-goal", String(defaultWaterGoal))) || defaultWaterGoal));
    const progress = Math.min(100, (count / goal) * 100);
    $("#water-count-summary").textContent = `${count} / ${goal} ${goal === 1 ? "glass" : "glasses"}`;
    $("#hydration-progress").setAttribute("aria-valuenow", String(count));
    $("#hydration-progress").setAttribute("aria-valuemax", String(goal));
    $("#hydration-progress span").style.width = `${progress}%`;
    $("#log-water").textContent = count >= goal ? "Goal met — add another" : "+ Log a glass";

    const next = nextCareMoment();
    if (!next) return;
    const minutes = Math.max(0, Math.ceil((next.at - new Date()) / 60000));
    const timing = minutes === 0
      ? "now"
      : minutes < 60
        ? `in ${minutes}m`
        : minutes < 24 * 60
          ? `in ${Math.floor(minutes / 60)}h ${minutes % 60}m`
          : `tomorrow at ${prettyTime(next.time)}`;
    $("#next-care-summary").textContent = `Next: ${next.label} ${timing}`;
  };

  const logWater = async () => {
    rollCareForward();
    const goal = Math.min(16, Math.max(4, Number(readState(profileState, "water-goal", String(defaultWaterGoal))) || defaultWaterGoal));
    const count = Math.max(0, Number(readState(careState, "water-count", "0")) || 0) + 1;
    writeState(careState, "water-count", String(count));
    writeState(careState, "water-date", localDateKey());
    updateCareUI();
    await persist(careState, count === goal ? "Daily water goal complete!" : "Water logged with PageLove");
    await addXP(5);
    animatePixo(count === goal ? "Hydration goal complete! ✦" : "Nice sip. Your future self says thanks. 💧");
  };

  const updateProfileUI = () => {
    const name = readState(profileState, "name", "friend");
    const focusLength = Number(readState(profileState, "focus-length", String(defaultFocusLength)));
    $("#greeting-name").textContent = name;
    $("#profile-name").value = name;
    $("#focus-length").value = String(focusLength);
    $("#water-times").value = readState(profileState, "water-times", defaultWaterTimesValue).replaceAll(",", ", ");
    $("#water-goal").value = readState(profileState, "water-goal", String(defaultWaterGoal));
    $("#meal-time").value = readState(profileState, "meal-time", defaultMealTime);
    updateReminderSummary();
    updateCareUI();
    $("#profile-button").textContent = name === "friend" ? "P" : name.charAt(0).toUpperCase();
    if (!timer.running) {
      timer.duration = focusLength * 60;
      timer.remaining = focusLength * 60;
      renderTimer();
    }
  };

  const prettyTime = (value) => {
    const [hours, minutes] = value.trim().split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;
    return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
  };

  const reminderTimes = () => ({
    water: readState(profileState, "water-times", defaultWaterTimesValue).split(",").map((time) => time.trim()).filter(Boolean),
    meal: [readState(profileState, "meal-time", defaultMealTime)],
  });

  const updateReminderSummary = () => {
    const times = reminderTimes();
    $("#water-summary").textContent = times.water.map(prettyTime).join(" · ");
    $("#meal-summary").textContent = prettyTime(times.meal[0]);
  };

  const showScreenReminder = (kind = "water") => {
    const reminder = $("#screen-reminder");
    const isMeal = kind === "meal";
    const mealTime = prettyTime(reminderTimes().meal[0]);
    $("#reminder-title").textContent = isMeal ? "It’s time to eat." : "Tiny water break?";
    $("#reminder-message").textContent = isMeal
      ? `${mealTime} check-in: let’s pause for food before the next big idea.`
      : "A few sips now. Your ideas can wait thirty seconds.";
    reminder.dataset.kind = kind;
    reminder.hidden = false;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(isMeal ? "Pixo says: time to eat 🍲" : "Pixo says: water break 💧", {
        body: isMeal ? `${mealTime} check-in: let’s pause for food.` : "A few sips now—you’ve got this.",
        icon: "./assets/pixo_2d.png",
      });
    }
  };

  const hideScreenReminder = () => {
    $("#screen-reminder").hidden = true;
  };

  const startReminderClock = () => {
    const check = () => {
      updateCareUI();
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const day = now.toISOString().slice(0, 10);
      const times = reminderTimes();
      const kind = times.meal.includes(current) ? "meal" : times.water.includes(current) ? "water" : "";
      if (!kind) return;
      const key = `${day}-${current}-${kind}`;
      if (sessionStorage.getItem("pixo-last-reminder") === key) return;
      sessionStorage.setItem("pixo-last-reminder", key);
      showScreenReminder(kind);
    };
    check();
    window.setInterval(check, 20000);
  };

  const updateStatsUI = () => {
    const sessions = Number(readState(focusState, "sessions", "0"));
    const minutes = Number(readState(focusState, "minutes", "0"));
    const streak = Number(readState(focusState, "streak", "1"));
    const xp = Number(readState(growthState, "xp", "35"));
    const level = Number(readState(growthState, "level", "1"));
    $("#sessions-today").textContent = sessions;
    $("#minutes-today").textContent = `${minutes}m`;
    $("#focus-streak").textContent = streak;
    $("#xp-number").textContent = xp;
    $("#level-number").textContent = level;
    const weekdayIndex = (new Date().getDay() + 6) % 7;
    const chartDays = $$(".chart-day");
    chartDays.forEach((day, index) => day.classList.toggle("is-today", index === weekdayIndex));
    $("span", chartDays[weekdayIndex])?.style.setProperty("--height", `${Math.min(100, Math.max(8, minutes * 2))}%`);
  };

  const rollDailyStatsForward = () => {
    const today = new Date().toISOString().slice(0, 10);
    const recordedDate = readState(focusState, "daily-date", "");
    if (recordedDate === today) return;
    writeState(focusState, "sessions", "0");
    writeState(focusState, "minutes", "0");
    writeState(focusState, "daily-date", today);
    saveLocal();
  };

  const updateTaskUI = () => {
    const tasks = $$(".task", taskList);
    const complete = tasks.filter((task) => $("input[type='checkbox']", task)?.checked).length;
    $("#task-count").textContent = `${complete} / ${tasks.length}`;
  };

  const applyMood = (mood) => {
    selectedMood = mood || "";
    $$("button[data-mood]", $("#mood-picker")).forEach((button) => {
      const selected = button.dataset.mood === selectedMood;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $("#pixo-character").dataset.mood = selectedMood === "low" ? "low" : selectedMood === "great" ? "great" : "happy";
  };

  const updateCheckinUI = () => {
    const today = new Date().toISOString().slice(0, 10);
    const mood = readState(checkinState, "mood", "");
    const note = readState(checkinState, "note", "");
    const savedDate = readState(checkinState, "date", "");
    if (savedDate === today) {
      applyMood(mood);
      $("#checkin-note").value = note;
      if (note) $("#latest-memory").textContent = note;
    }
  };

  const addXP = async (amount) => {
    let xp = Number(readState(growthState, "xp", "35")) + amount;
    let level = Number(readState(growthState, "level", "1"));
    if (xp >= 100) {
      xp -= 100;
      level += 1;
      showToast(`Pixo grew to level ${level}!`);
      animatePixo("We’re growing! ✦");
    }
    writeState(growthState, "xp", xp);
    writeState(growthState, "level", level);
    updateStatsUI();
    await persist(growthState, "");
  };

  const renderTimer = () => {
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const elapsed = timer.duration - timer.remaining;
    timerRing.style.setProperty("--progress", `${Math.max(0, (elapsed / timer.duration) * 360)}deg`);
    timerToggle.classList.toggle("is-running", timer.running);
    $("span", timerToggle).textContent = timer.running ? "Pause" : timer.remaining < timer.duration ? "Continue" : "Start focus";
    document.title = timer.running
      ? `${timerDisplay.textContent} · ${companionName} focus`
      : (COMPANION.browserTitle || `${companionName} — your tiny work companion`);
  };

  const tickTimer = () => {
    if (!timer.running || !timer.endAt) return;
    timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    renderTimer();
    if (timer.remaining === 0) completeFocusSession();
  };

  const toggleTimer = () => {
    if (timer.running) {
      timer.running = false;
      timer.endAt = null;
      window.clearInterval(timer.interval);
      $("#speech-bubble").textContent = "A pause is allowed.";
      showToast("Paused. Pixo will hold your place.");
    } else {
      timer.running = true;
      timer.endAt = Date.now() + timer.remaining * 1000;
      timer.interval = window.setInterval(tickTimer, 500);
      $("#speech-bubble").textContent = "I’m staying right here.";
      $("#pixo-message").textContent = "No rush. No noise. Just this one gentle stretch of focus.";
    }
    renderTimer();
  };

  const resetTimer = () => {
    window.clearInterval(timer.interval);
    timer.running = false;
    timer.endAt = null;
    timer.duration = Number(readState(profileState, "focus-length", String(defaultFocusLength))) * 60;
    timer.remaining = timer.duration;
    renderTimer();
    $("#speech-bubble").textContent = "Fresh start? I’m ready.";
  };

  const completeFocusSession = async () => {
    window.clearInterval(timer.interval);
    timer.running = false;
    const focusMinutes = Math.round(timer.duration / 60);
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = readState(focusState, "last-focus-date", "");
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const sessions = Number(readState(focusState, "sessions", "0")) + 1;
    const minutes = Number(readState(focusState, "minutes", "0")) + focusMinutes;
    let streak = Number(readState(focusState, "streak", "1"));
    if (lastDate && lastDate !== today) streak = lastDate === yesterday ? streak + 1 : 1;
    writeState(focusState, "sessions", sessions);
    writeState(focusState, "minutes", minutes);
    writeState(focusState, "streak", streak);
    writeState(focusState, "daily-date", today);
    writeState(focusState, "last-focus-date", today);
    updateStatsUI();
    await persist(focusState, "Focus session saved");
    await addXP(30);
    timer.remaining = timer.duration;
    renderTimer();
    $("#speech-bubble").textContent = "You did it. Breathe. ♡";
    animatePixo("You did it. Breathe. ♡");
    $("#pixo-message").textContent = "That was real progress. Let’s take a tiny pause before the next thing.";
    playChime();
  };

  const makeTask = (id, text) => {
    const node = document.createElement("li");
    node.className = "task";
    node.id = `task-${id}`;
    node.dataset.taskId = id;
    node.innerHTML = `
      <label>
        <input type="checkbox" />
        <span class="custom-check"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg></span>
        <span class="task__text">${escapeHTML(text)}</span>
      </label>
      <button class="task__delete" type="button" aria-label="Delete task">×</button>`;
    return node;
  };

  const addTask = async (text) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const node = makeTask(id, text);
    await appendWithPageLove(taskList, node.outerHTML, node);
    updateTaskUI();
    showToast("Added to your gentle plan");
  };

  const handleTaskChange = async (event) => {
    const checkbox = event.target.closest("input[type='checkbox']");
    if (!checkbox || !taskList.contains(checkbox)) return;
    checkbox.toggleAttribute("checked", checkbox.checked);
    const task = checkbox.closest(".task");
    updateTaskUI();
    await persist(task, "");
    if (checkbox.checked) {
      addXP(15);
      animatePixo("Little win! ✦");
      showToast("Pixo noticed that little win");
    }
  };

  const handleTaskClick = async (event) => {
    const button = event.target.closest(".task__delete");
    if (!button || !taskList.contains(button)) return;
    await removeWithPageLove(button.closest(".task"));
    updateTaskUI();
  };

  const makeMemory = (mood, note) => {
    const id = `memory-${Date.now().toString(36)}`;
    const labels = { low: "a heavy day", okay: "a steady day", good: "a good day", great: "a bright day" };
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date());
    const node = document.createElement("article");
    node.className = "memory";
    node.id = id;
    node.innerHTML = `<time datetime="${new Date().toISOString().slice(0, 10)}">${escapeHTML(date)} · ${escapeHTML(labels[mood] || "a day together")}</time><p>${escapeHTML(note || "Checked in with Pixo.")}</p>`;
    return node;
  };

  const saveCheckin = async (note) => {
    const today = new Date().toISOString().slice(0, 10);
    const wasToday = readState(checkinState, "date", "") === today;
    writeState(checkinState, "mood", selectedMood || "okay");
    writeState(checkinState, "note", note || "Taking today one gentle step at a time.");
    writeState(checkinState, "date", today);
    $("#latest-memory").textContent = note || "Taking today one gentle step at a time.";
    await persist(checkinState, "Check-in saved");

    if (!wasToday) {
      const memory = makeMemory(selectedMood || "okay", note);
      await appendWithPageLove(memoryLog, memory.outerHTML, memory);
      await addXP(10);
    }
    $("#speech-bubble").textContent = selectedMood === "low" ? "I’m here. No fixing needed." : "Thanks for telling me. ♡";
  };

  const playChime = () => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.6);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + 0.65);
    });
  };

  const startAmbientSound = () => {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const master = audioContext.createGain();
    master.gain.value = 0.018;
    master.connect(audioContext.destination);
    [174.61, 261.63].forEach((frequency) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.42;
      oscillator.connect(gain).connect(master);
      oscillator.start();
      ambientNodes.push(oscillator, gain);
    });
    ambientNodes.push(master);
  };

  const stopAmbientSound = () => {
    ambientNodes.forEach((node) => {
      try { node.stop?.(); } catch (_) { /* already stopped */ }
      try { node.disconnect?.(); } catch (_) { /* already disconnected */ }
    });
    ambientNodes = [];
  };

  const bindEvents = () => {
    const greetPixo = () => {
      const greetings = Array.isArray(COMPANION.greetings) && COMPANION.greetings.length
        ? COMPANION.greetings
        : ["Hi! I saved you a little calm.", "I’m right here. ♡", "Tiny steps still count! ✦", "Let’s build something kind."];
      animatePixo(greetings[Math.floor(Math.random() * greetings.length)]);
    };

    $("#pixo-character").addEventListener("click", greetPixo);
    $("#pixo-character").addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      greetPixo();
    });

    $("#begin-focus").addEventListener("click", () => {
      $("#focus").scrollIntoView({ behavior: "smooth", block: "center" });
      if (!timer.running) toggleTimer();
    });
    timerToggle.addEventListener("click", toggleTimer);
    $("#timer-reset").addEventListener("click", resetTimer);

    $("#task-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = $("#new-task");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      await addTask(text);
    });
    taskList.addEventListener("change", handleTaskChange);
    taskList.addEventListener("click", handleTaskClick);

    $("#mood-picker").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-mood]");
      if (!button) return;
      applyMood(button.dataset.mood);
      const messages = {
        low: "We can go softly today.",
        okay: "Steady is plenty.",
        good: "I’m glad to hear it!",
        great: "That glow suits you! ✦",
      };
      $("#speech-bubble").textContent = messages[selectedMood];
    });

    $("#note-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveCheckin($("#checkin-note").value.trim());
    });

    $("#memory-toggle").addEventListener("click", (event) => {
      const isOpen = !memoryLog.hidden;
      memoryLog.hidden = isOpen;
      event.currentTarget.setAttribute("aria-expanded", String(!isOpen));
      event.currentTarget.textContent = isOpen ? "View your memories" : "Hide your memories";
    });

    const dialog = $("#profile-dialog");
    const openProfile = () => dialog.showModal();
    $("#profile-button").addEventListener("click", openProfile);
    $("#settings-button").addEventListener("click", openProfile);
    $("#edit-reminders").addEventListener("click", openProfile);
    $("#dialog-close").addEventListener("click", () => dialog.close());
    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = $("#profile-name").value.trim() || "friend";
      const focusLength = $("#focus-length").value;
      const waterTimes = $("#water-times").value.split(",").map((time) => time.trim()).filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
      const waterGoal = Math.min(16, Math.max(4, Number($("#water-goal").value) || defaultWaterGoal));
      const mealTime = $("#meal-time").value || defaultMealTime;
      writeState(profileState, "name", name);
      writeState(profileState, "focus-length", focusLength);
      writeState(profileState, "water-times", waterTimes.length ? waterTimes.join(",") : defaultWaterTimesValue);
      writeState(profileState, "water-goal", String(waterGoal));
      writeState(profileState, "meal-time", mealTime);
      updateProfileUI();
      resetTimer();
      dialog.close();
      await persist(profileState, "Pixo will remember that");
    });

    $("#test-reminder").addEventListener("click", () => showScreenReminder("water"));
    $("#log-water").addEventListener("click", logWater);
    $("#reminder-close").addEventListener("click", hideScreenReminder);
    $("#reminder-done").addEventListener("click", async () => {
      const kind = $("#screen-reminder").dataset.kind || "water";
      hideScreenReminder();
      if (kind === "water") {
        await logWater();
      } else {
        await addXP(5);
        animatePixo("Nice. I’m proud of you! ✦");
        showToast(`Nice. ${companionName} is proud of you.`);
      }
    });
    $("#reminder-snooze").addEventListener("click", () => {
      hideScreenReminder();
      window.setTimeout(() => showScreenReminder($("#screen-reminder").dataset.kind || "water"), 10 * 60 * 1000);
      showToast("Pixo will pop back in 10 minutes.");
    });

    $("#sound-toggle").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const turnOn = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(turnOn));
      $("span", button).textContent = turnOn ? "Room humming" : "Quiet room";
      if (turnOn) {
        startAmbientSound();
        await audioContext.resume();
      } else {
        stopAmbientSound();
      }
    });

    $("#page-love-info").addEventListener("click", () => {
      showToast(isPageLoveHost() ? "Pixo’s private session is synced by PageLove." : "PageLove hosting turns on after deployment.");
    });

    document.addEventListener("PLCapability", () => {
      setSyncStatus("PageLove ready", "is-live");
      migrateLegacyBrowserState();
    });
    document.addEventListener("PLMethodStarted", () => setSyncStatus("Saving…", "is-saving"));
    document.addEventListener("PLMethodCompleted", (event) => {
      const ok = event.detail?.response?.ok !== false;
      setSyncStatus(ok ? "PageLove synced" : "Sync needs attention", ok ? "is-live" : "");
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && timer.running) tickTimer();
    });
  };

  const init = () => {
    ensureStateSchema();
    hydrateLocal();
    applyTemplateConfig();
    setDateAndGreeting();
    rollDailyStatsForward();
    rollCareForward();
    updateProfileUI();
    updateStatsUI();
    updateTaskUI();
    updateCheckinUI();
    bindEvents();
    startReminderClock();

    if (isPageLoveHost()) {
      setSyncStatus("Checking PageLove…", "is-saving");
      window.setTimeout(async () => {
        const hasCapability = [appPersistentState, taskList, memoryLog].some(
          (element) => typeof element.PUT === "function" || typeof element.POST === "function",
        );
        setSyncStatus(hasCapability ? "PageLove ready" : "Connecting to PageLove…", hasCapability ? "is-live" : "is-saving");
        if (hasCapability) await migrateLegacyBrowserState();
      }, 1800);
    } else {
      setSyncStatus("Local preview");
    }
  };

  init();
})();
