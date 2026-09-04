(() => {
  const STORAGE_KEY = "pixo-app-v1";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const profileState = $("#profile-state");
  const focusState = $("#focus-state");
  const growthState = $("#growth-state");
  const checkinState = $("#checkin-state");
  const taskList = $("#task-list");
  const memoryLog = $("#memory-log");
  const timerDisplay = $("#timer-display");
  const timerToggle = $("#timer-toggle");
  const timerRing = $("#timer-ring");
  const syncStatus = $("#sync-status");

  let timer = {
    mode: "focus",
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    endAt: null,
    interval: null,
  };
  let selectedMood = "";
  let toastTimeout;
  let audioContext;
  let ambientNodes = [];

  const readState = (container, field, fallback = "") =>
    container.querySelector(`[data-field="${field}"]`)?.textContent.trim() || fallback;

  const writeState = (container, field, value) => {
    const target = container.querySelector(`[data-field="${field}"]`);
    if (target) target.textContent = String(value);
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

  const setSyncStatus = (label, state = "") => {
    syncStatus.classList.remove("is-live", "is-saving");
    if (state) syncStatus.classList.add(state);
    $("span:last-child", syncStatus).textContent = label;
  };

  const isPageLoveHost = () =>
    location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(location.hostname);

  const snapshot = () => ({
    profile: {
      name: readState(profileState, "name", "friend"),
      focusLength: readState(profileState, "focus-length", "25"),
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
    tasks: taskList.innerHTML,
    memories: memoryLog.innerHTML,
  });

  const saveLocal = () => {
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
      writeState(profileState, "name", saved.profile?.name || "friend");
      writeState(profileState, "focus-length", saved.profile?.focusLength || "25");
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
      if (saved.tasks) taskList.innerHTML = saved.tasks;
      if (saved.memories) memoryLog.innerHTML = saved.memories;
    } catch (error) {
      console.warn("Pixo found an unreadable local preview snapshot.", error);
    }
  };

  const persist = async (element, successMessage = "Saved with Pixo") => {
    saveLocal();
    if (typeof element?.PUT !== "function") {
      setSyncStatus(isPageLoveHost() ? "Private browser memory" : "Saved locally");
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
      console.warn("PageLove sync fell back to this browser.", error);
      setSyncStatus("Saved locally");
      showToast("Saved here. Sign in to enable PageLove sync.");
      return false;
    }
  };

  const appendWithPageLove = async (parent, html, localNode) => {
    saveLocal();
    if (typeof parent?.POST !== "function") {
      parent.append(localNode);
      saveLocal();
      setSyncStatus(isPageLoveHost() ? "Private browser memory" : "Saved locally");
      return;
    }

    try {
      setSyncStatus("Saving…", "is-saving");
      const responseNode = await parent.POST(html);
      setSyncStatus("PageLove synced", "is-live");
      return responseNode;
    } catch (error) {
      console.warn("PageLove POST fell back to this browser.", error);
      parent.append(localNode);
      saveLocal();
      setSyncStatus("Saved locally");
    }
  };

  const removeWithPageLove = async (element) => {
    if (typeof element?.DELETE !== "function") {
      element.remove();
      saveLocal();
      return;
    }

    try {
      setSyncStatus("Saving…", "is-saving");
      await element.DELETE();
      setSyncStatus("PageLove synced", "is-live");
    } catch (error) {
      console.warn("PageLove DELETE fell back to this browser.", error);
      element.remove();
      saveLocal();
      setSyncStatus("Saved locally");
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

  const updateProfileUI = () => {
    const name = readState(profileState, "name", "friend");
    const focusLength = Number(readState(profileState, "focus-length", "25"));
    $("#greeting-name").textContent = name;
    $("#profile-name").value = name;
    $("#focus-length").value = String(focusLength);
    $("#profile-button").textContent = name === "friend" ? "P" : name.charAt(0).toUpperCase();
    if (!timer.running) {
      timer.duration = focusLength * 60;
      timer.remaining = focusLength * 60;
      renderTimer();
    }
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
      $("#speech-bubble").textContent = "We’re growing! ✦";
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
    document.title = timer.running ? `${timerDisplay.textContent} · Pixo focus` : "Pixo — your tiny work companion";
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
    timer.duration = Number(readState(profileState, "focus-length", "25")) * 60;
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
      $("#speech-bubble").textContent = "Little win! ✦";
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
    $("#dialog-close").addEventListener("click", () => dialog.close());
    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = $("#profile-name").value.trim() || "friend";
      const focusLength = $("#focus-length").value;
      writeState(profileState, "name", name);
      writeState(profileState, "focus-length", focusLength);
      updateProfileUI();
      resetTimer();
      dialog.close();
      await persist(profileState, "Pixo will remember that");
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
      showToast(isPageLoveHost() ? "PageLove hosts Pixo; memories stay in this browser." : "PageLove hosting turns on after deployment.");
    });

    document.addEventListener("PLCapability", () => setSyncStatus("PageLove ready", "is-live"));
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
    hydrateLocal();
    setDateAndGreeting();
    rollDailyStatsForward();
    updateProfileUI();
    updateStatsUI();
    updateTaskUI();
    updateCheckinUI();
    bindEvents();

    if (isPageLoveHost()) {
      setSyncStatus("Checking PageLove…", "is-saving");
      window.setTimeout(() => {
        const hasCapability = [profileState, focusState, growthState, taskList].some(
          (element) => typeof element.PUT === "function" || typeof element.POST === "function",
        );
        setSyncStatus(hasCapability ? "PageLove ready" : "Private browser memory", hasCapability ? "is-live" : "");
      }, 1800);
    } else {
      setSyncStatus("Local preview");
    }
  };

  init();
})();
