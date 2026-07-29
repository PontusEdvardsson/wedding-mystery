const Mystery = (() => {
  const params = new URLSearchParams(window.location.search);
  const previewMode = params.get("preview") === "1";

  if (previewMode) {
    Object.keys(mysteryStorageKeys).forEach((name) => {
      mysteryStorageKeys[name] = `${mysteryStorageKeys[name]}.preview`;
    });
  }

  if (params.get("reset") === "1") {
    Object.values(mysteryStorageKeys).forEach(removeStoredValue);
    params.delete("reset");
    const nextSearch = params.toString();
    window.location.replace(
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
  }

  function isPreview() {
    return previewMode;
  }

  function readStoredJson(key, fallback = null) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue === null ? fallback : JSON.parse(rawValue);
    } catch {
      removeStoredValue(key);
      return fallback;
    }
  }

  function writeStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function removeStoredValue(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // The app remains usable in memory when storage is unavailable.
    }
  }

  function linkTo(page) {
    const nextParams = new URLSearchParams();

    if (isPreview()) {
      nextParams.set("preview", "1");
    }

    const query = nextParams.toString();
    return `${page}${query ? `?${query}` : ""}`;
  }

  function resetLink() {
    const params = new URLSearchParams();

    params.set("reset", "1");

    if (isPreview()) {
      params.set("preview", "1");
    }

    return `${window.location.pathname}?${params.toString()}`;
  }

  function readProgress() {
    const progress = readStoredJson(mysteryStorageKeys.progress, {});
    return progress && typeof progress === "object" && !Array.isArray(progress)
      ? progress
      : {};
  }

  function writeProgress(progress) {
    writeStoredJson(mysteryStorageKeys.progress, progress);
  }

  function getCompleted() {
    return readProgress().completed || {};
  }

  function isComplete(stepId) {
    return isPreview() || Boolean(getCompleted()[stepId]);
  }

  function markStarted(stepId) {
    const progress = readProgress();
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.lastPage = getStep(stepId)?.page || progress.lastPage;
    writeProgress(progress);
  }

  function markComplete(stepId) {
    const progress = readProgress();
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.lastPage = getNextStep(stepId)?.page || getStep(stepId)?.page;
    progress.completed = {
      ...(progress.completed || {}),
      [stepId]: new Date().toISOString(),
    };
    writeProgress(progress);
  }

  function getStep(stepId) {
    return mysterySteps.find((step) => step.id === stepId);
  }

  function getStepIndex(stepId) {
    return mysterySteps.findIndex((step) => step.id === stepId);
  }

  function getNextStep(stepId) {
    const index = getStepIndex(stepId);
    return index >= 0 ? mysterySteps[index + 1] : null;
  }

  function getPreviousStep(stepId) {
    const index = getStepIndex(stepId);
    return index > 0 ? mysterySteps[index - 1] : null;
  }

  function isTimeUnlocked(step, now = new Date()) {
    return isPreview() || !step.unlockAt || now >= new Date(step.unlockAt);
  }

  function isHintUnlocked(step, now = new Date()) {
    return isPreview() || !step.hintUnlockAt || now >= new Date(step.hintUnlockAt);
  }

  function canOpenStep(step, now = new Date()) {
    const previousStep = getPreviousStep(step.id);
    const requirementId = step.ending ? previousStep?.id : step.requires;
    const requirementMet = !requirementId || isComplete(requirementId);
    return {
      requirementMet,
      timeUnlocked: isTimeUnlocked(step, now),
      canOpen: requirementMet && isTimeUnlocked(step, now),
    };
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatUnlock(date) {
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
  }

  function formatUnlockLine(date) {
    const day = formatUnlock(date);
    const time = new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(date)
      .replace(":", ".");

    return `Öppnar ${day} klockan ${time}`;
  }

  function formatCountdown(target, now = new Date()) {
    const diff = Math.max(0, target - now);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];

    if (days > 0) {
      parts.push(formatUnit(days, "dag", "dagar"));
    }

    if (hours > 0) {
      parts.push(formatUnit(hours, "timme", "timmar"));
    }

    if (minutes > 0 || hours > 0 || days > 0) {
      parts.push(formatUnit(minutes, "minut", "minuter"));
    }

    if (days === 0 && hours < 24) {
      parts.push(formatUnit(seconds, "sekund", "sekunder"));
    }

    return joinSwedishList(parts.filter(Boolean));
  }

  function formatUnit(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  function joinSwedishList(parts) {
    if (parts.length <= 1) return parts[0] || "0 sekunder";
    if (parts.length === 2) return `${parts[0]} och ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")} och ${parts[parts.length - 1]}`;
  }

  function updateClock() {
    document.querySelectorAll("[data-current-time]").forEach((node) => {
      node.textContent = formatClock(new Date());
    });
  }

  function renderGate(stepId, options = {}) {
    const step = getStep(stepId);
    const gate = document.querySelector("[data-gate]");
    const content = document.querySelector("[data-mission-content]");

    if (!step || !gate || !content) return false;

    markStarted(stepId);
    const status = canOpenStep(step);

    if (!status.requirementMet) {
      const previous = step.ending
        ? getPreviousStep(stepId)
        : getStep(step.requires) || getPreviousStep(stepId);
      gate.innerHTML = sealedMarkup(step, previous);
      content.hidden = true;
      return false;
    }

    if (!status.timeUnlocked) {
      renderTimeLock(step, gate, content, options);
      return false;
    }

    gate.replaceChildren();
    content.hidden = false;

    if (options.onOpen) options.onOpen(step);
    return true;
  }

  function sealedMarkup(step, previous) {
    return `
      <div class="locked-panel">
        <p class="eyebrow">${getStepLabel(step)}</p>
        <p class="lock-status">Låst</p>
        <h2>Det här kapitlet är fortfarande förseglat</h2>
        <p>Öppna föregående lås för att komma vidare.</p>
        <a class="secondary-action" href="${linkTo(previous?.page || "index.html")}">Gå tillbaka</a>
        <a class="text-link" href="${linkTo("index.html")}">Till mysteriets startsida</a>
      </div>
    `;
  }

  function renderTimeLock(step, gate, content, options = {}) {
    const unlockDate = new Date(step.unlockAt);
    let opened = false;

    function draw() {
      const now = new Date();

      if (isTimeUnlocked(step, now)) {
        gate.replaceChildren();
        content.hidden = false;
        if (!opened && options.onOpen) {
          opened = true;
          options.onOpen(step);
        }
        return;
      }

      gate.innerHTML = `
        <div class="locked-panel">
          <p class="eyebrow">${getStepLabel(step)}</p>
          <p class="lock-status">Låst</p>
          <h2>Det här kapitlet är fortfarande förseglat</h2>
          <p>${formatUnlockLine(unlockDate)}.</p>
          <strong class="countdown">${formatCountdown(unlockDate, now)}</strong>
          <a class="secondary-action" href="${linkTo(getPreviousStep(step.id)?.page || "index.html")}">Gå tillbaka</a>
          <a class="text-link" href="${linkTo("index.html")}">Till mysteriets startsida</a>
        </div>
      `;
      content.hidden = true;
    }

    draw();
    const timer = setInterval(() => {
      draw();
      if (isTimeUnlocked(step)) clearInterval(timer);
    }, 1000);
  }

  function renderNextAction(stepId, target) {
    const container = target || document.querySelector("[data-next-action]");
    const nextStep = getNextStep(stepId);

    if (!container || !nextStep) return;

    const label = "Gå vidare till nästa lås";
    container.innerHTML = `
      <a class="primary-action next-action" href="${linkTo(nextStep.page)}">
        ${label}
      </a>
    `;
  }

  function getStepLabel(step) {
    if (step.ending) return "Förseglat brev";

    const index = mysterySteps.filter((candidate) => !candidate.ending).findIndex(
      (candidate) => candidate.id === step.id
    );
    return `Uppdrag ${index + 1}`;
  }

  function decorateLinks(root = document) {
    if (!isPreview()) return;

    root.querySelectorAll('a[href$=".html"], a[href="index.html"]').forEach((link) => {
      link.href = linkTo(link.getAttribute("href"));
    });
  }

  function renderResetAction() {
    const board = document.querySelector(".mystery-board");

    if (
      window.location.pathname.split("/").pop() !== "index.html" &&
      window.location.pathname.split("/").pop() !== ""
    ) {
      return;
    }

    if (!board || document.querySelector("[data-reset-action]")) return;

    const reset = document.createElement("a");
    reset.className = "reset-action";
    reset.href = resetLink();
    reset.dataset.resetAction = "";
    reset.textContent = "Nollställ";
    reset.setAttribute("role", "button");
    board.appendChild(reset);
  }

  function getBestResumePage() {
    const progress = readProgress();
    const allPlayable = mysterySteps.filter((step) => !step.ending);
    const ending = mysterySteps.find((step) => step.ending);

    if (allPlayable.every((step) => isComplete(step.id))) {
      return ending?.page || allPlayable.at(-1)?.page || "uppdrag-1.html";
    }

    const firstIncomplete = allPlayable.find((step) => !isComplete(step.id));
    const resumeStep = mysterySteps.find((step) => step.page === progress.lastPage);
    const canResume = resumeStep && !resumeStep.ending && canOpenStep(resumeStep).canOpen;

    return canResume ? resumeStep.page : firstIncomplete?.page || "uppdrag-1.html";
  }

  function resetProgressFrom(stepId) {
    const startIndex = getStepIndex(stepId);

    if (startIndex < 0) return;

    const storageByStep = {
      "uppdrag-1": mysteryStorageKeys.wordle,
      "uppdrag-2": mysteryStorageKeys.connections,
      "uppdrag-3": mysteryStorageKeys.cipher,
      "uppdrag-4": mysteryStorageKeys.sudoku,
      avslutning: mysteryStorageKeys.ending,
    };
    const progress = readProgress();

    mysterySteps.slice(startIndex).forEach((candidate) => {
      if (storageByStep[candidate.id]) {
        removeStoredValue(storageByStep[candidate.id]);
      }
      if (progress.completed) {
        delete progress.completed[candidate.id];
      }
    });

    progress.lastPage = getStep(stepId)?.page || "uppdrag-1.html";
    writeProgress(progress);
  }

  updateClock();
  setInterval(updateClock, 15000);
  decorateLinks();
  renderResetAction();

  return {
    canOpenStep,
    formatCountdown,
    formatUnlockLine,
    formatUnlock,
    getBestResumePage,
    getCompleted,
    getNextStep,
    getPreviousStep,
    getStep,
    isComplete,
    isPreview,
    isHintUnlocked,
    isTimeUnlocked,
    linkTo,
    resetLink,
    markComplete,
    markStarted,
    readStoredJson,
    readProgress,
    removeStoredValue,
    decorateLinks,
    renderGate,
    renderNextAction,
    resetProgressFrom,
    writeStoredJson,
  };
})();
