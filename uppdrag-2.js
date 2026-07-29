const step = Mystery.getStep("uppdrag-2");
const puzzle = step.puzzle;
const root = document.querySelector("[data-connections-root]");
const puzzleSignature = JSON.stringify(puzzle.groups);
let cooldownTimer = null;
let hintWasUnlocked = Mystery.isHintUnlocked(step);

const state = normalizeState(
  Mystery.readStoredJson(mysteryStorageKeys.connections, null)
);

Mystery.renderGate("uppdrag-2", {
  onOpen() {
    if (state.completed) {
      Mystery.markComplete(step.id);
    }
    renderConnections();
    renderTestTools();
  },
});

function normalizeState(savedState) {
  if (savedState?.puzzleSignature && savedState.puzzleSignature !== puzzleSignature) {
    savedState = null;
  }

  const allCards = getAllCards();
  const validCardIds = new Set(allCards.map((card) => card.id));
  const validGroupIds = new Set(puzzle.groups.map((group) => group.id));
  const savedOrder = Array.isArray(savedState?.order)
    ? [...new Set(savedState.order.filter((id) => validCardIds.has(id)))]
    : [];
  const order = savedOrder.length === allCards.length
    ? savedOrder
    : shuffle(allCards.map((card) => card.id));
  const solvedGroups = Array.isArray(savedState?.solvedGroups)
    ? [...new Set(savedState.solvedGroups.filter((id) => validGroupIds.has(id)))]
    : [];
  const selected = Array.isArray(savedState?.selected)
    ? [...new Set(savedState.selected.filter((id) => validCardIds.has(id)))]
        .filter((id) => !solvedGroups.includes(getCardsById().get(id)?.groupId))
        .slice(0, 4)
    : [];

  return {
    order,
    selected,
    solvedGroups,
    mistakeCount: Number.isInteger(savedState?.mistakeCount)
      ? Math.max(0, savedState.mistakeCount)
      : 0,
    cooldownUntil: Number.isFinite(savedState?.cooldownUntil)
      ? savedState.cooldownUntil
      : null,
    completed:
      Boolean(savedState?.completed) && solvedGroups.length === puzzle.groups.length,
    message: typeof savedState?.message === "string" ? savedState.message : "",
    messageTone: ["neutral", "success", "error"].includes(savedState?.messageTone)
      ? savedState.messageTone
      : "neutral",
    justCompleted: Boolean(savedState?.justCompleted),
    revealedHints: Array.isArray(savedState?.revealedHints)
      ? [...new Set(savedState.revealedHints.filter((id) => validGroupIds.has(id)))]
      : [],
  };
}

function getAllCards() {
  return puzzle.groups.flatMap((group) =>
    group.words.map((word, index) => ({
      id: `${group.id}-${index}`,
      groupId: group.id,
      word,
    }))
  );
}

function getCardsById() {
  return new Map(getAllCards().map((card) => [card.id, card]));
}

function saveState() {
  Mystery.writeStoredJson(mysteryStorageKeys.connections, {
    puzzleSignature,
    order: state.order,
    selected: state.selected,
    solvedGroups: state.solvedGroups,
    mistakeCount: state.mistakeCount,
    cooldownUntil: state.cooldownUntil,
    completed: state.completed,
    message: state.message,
    messageTone: state.messageTone,
    justCompleted: state.justCompleted,
    revealedHints: state.revealedHints,
  });
}

function renderConnections() {
  if (!root) return;

  clearExpiredCooldown();
  root.replaceChildren();

  const game = document.createElement("div");
  game.className = "connections";
  game.append(renderTimedHint(), renderSolvedGroups(), renderStatusPanel(), renderGrid(), renderActions());

  if (state.completed) {
    const success = document.createElement("div");
    const nextAction = document.createElement("div");

    success.className = "connections-success";
    success.innerHTML = `
      <strong>Alla trådar är funna.</strong>
      <span>Nästa lås väntar.</span>
    `;
    Mystery.renderNextAction(step.id, nextAction);
    game.append(success, nextAction);
  }

  root.appendChild(game);
  startCooldownTicker();

  if (state.justCompleted) {
    window.setTimeout(() => {
      scrollResultIntoView();
      state.justCompleted = false;
      saveState();
    }, 700);
  }
}

function renderTimedHint() {
  const hint = document.createElement("section");
  hint.className = "connections-hint-panel";

  if (!Mystery.isHintUnlocked(step) || state.completed) {
    hint.hidden = true;
    return hint;
  }

  const title = document.createElement("strong");
  const list = document.createElement("div");

  title.textContent = step.hintText;
  list.className = "connections-hint-list";

  puzzle.groups.forEach((group) => {
    const button = document.createElement("button");
    const revealed = state.revealedHints.includes(group.id);

    button.type = "button";
    button.className = "connections-spoiler";
    button.classList.toggle("is-revealed", revealed);
    button.setAttribute("aria-expanded", revealed ? "true" : "false");
    button.setAttribute("aria-label", revealed ? group.title : "Visa dold kategori");
    button.textContent = revealed ? group.title : "Dold kategori";
    button.addEventListener("click", () => revealCategoryHint(group.id));
    list.appendChild(button);
  });

  hint.append(title, list);
  return hint;
}

function revealCategoryHint(groupId) {
  if (state.revealedHints.includes(groupId)) return;

  state.revealedHints.push(groupId);
  saveState();
  renderConnections();
}

function renderSolvedGroups() {
  const wrapper = document.createElement("div");
  wrapper.className = "connections-solved";

  state.solvedGroups.forEach((groupId, index) => {
    const group = getGroup(groupId);
    const card = document.createElement("section");

    card.className = "connections-group";
    card.dataset.groupIndex = index;
    card.innerHTML = `
      <strong>${group.title}</strong>
      <span>${group.words.join(" · ")}</span>
    `;
    wrapper.appendChild(card);
  });

  return wrapper;
}

function renderStatusPanel() {
  const panel = document.createElement("div");
  const cooldownRemaining = getCooldownRemaining();

  panel.className = "connections-status";
  panel.dataset.tone = state.messageTone;

  if (cooldownRemaining > 0) {
    panel.classList.add("is-cooldown");
    panel.innerHTML = `
      <strong>Orden behöver vila</strong>
      <span>Ni har gjort tre felaktiga försök. Försök igen när orden har lagt sig.</span>
      <em data-cooldown-count>${formatCooldownClock(cooldownRemaining)}</em>
    `;
    return panel;
  }

  panel.innerHTML = `
    <strong>${state.message || "Välj fyra ord som hör ihop."}</strong>
    <span>${state.completed ? "Uppdraget är löst." : `${puzzle.mistakesBeforeCooldown - state.mistakeCount} fel kvar innan orden behöver vila.`}</span>
  `;

  return panel;
}

function renderGrid() {
  const grid = document.createElement("div");
  const cardsById = getCardsById();
  const disabled = isInteractionDisabled();

  grid.className = "connections-grid";

  state.order
    .map((id) => cardsById.get(id))
    .filter((card) => card && !state.solvedGroups.includes(card.groupId))
    .forEach((card) => {
      const button = document.createElement("button");
      const isSelected = state.selected.includes(card.id);

      button.type = "button";
      button.className = "connection-card";
      button.textContent = card.word;
      button.disabled = disabled;
      button.setAttribute("aria-pressed", String(isSelected));
      button.classList.toggle("is-selected", isSelected);
      button.addEventListener("click", () => toggleSelection(card.id));
      grid.appendChild(button);
    });

  return grid;
}

function renderActions() {
  const actions = document.createElement("div");
  const disabled = isInteractionDisabled();
  const submit = document.createElement("button");
  const clear = document.createElement("button");

  actions.className = "connections-actions";
  submit.type = "button";
  submit.className = "primary-action button-action";
  submit.textContent = "Skicka grupp";
  submit.disabled = disabled || state.selected.length !== 4;
  submit.addEventListener("click", submitGroup);

  clear.type = "button";
  clear.className = "secondary-action button-action";
  clear.textContent = "Rensa val";
  clear.disabled = disabled || state.selected.length === 0;
  clear.addEventListener("click", clearSelection);

  actions.append(submit, clear);
  return actions;
}

function renderTestTools() {
  const container = document.querySelector("[data-test-tools]");

  if (!container) return;

  if (!Mystery.isPreview()) {
    container.remove();
    return;
  }

  container.className = "test-tools";
  container.innerHTML = `
    <p>Testverktyg – visas endast i preview-läge</p>
    <button class="secondary-action button-action" type="button" data-test-cooldown>Aktivera cooldown direkt</button>
    <button class="secondary-action button-action" type="button" data-test-end-cooldown>Avsluta cooldown</button>
    <button class="secondary-action button-action" type="button" data-test-solve>Färdigställ lås 2</button>
    <button class="secondary-action button-action" type="button" data-test-reset>Återställ endast lås 2</button>
  `;

  container.querySelector("[data-test-cooldown]").addEventListener("click", () => {
    state.mistakeCount = puzzle.mistakesBeforeCooldown;
    state.cooldownUntil = Date.now() + puzzle.cooldownMs;
    state.message = "";
    state.messageTone = "neutral";
    saveState();
    renderConnections();
  });

  container.querySelector("[data-test-end-cooldown]").addEventListener("click", () => {
    state.cooldownUntil = null;
    state.mistakeCount = 0;
    state.message = "Orden har lagt sig. Ni kan fortsätta.";
    state.messageTone = "success";
    saveState();
    renderConnections();
  });

  container.querySelector("[data-test-solve]").addEventListener("click", () => {
    state.solvedGroups = puzzle.groups.map((group) => group.id);
    completeMission();
    saveState();
    renderConnections();
  });

  container.querySelector("[data-test-reset]").addEventListener("click", () => {
    Mystery.resetProgressFrom(step.id);
    window.location.href = Mystery.linkTo("uppdrag-2.html");
  });
}

function toggleSelection(cardId) {
  if (isInteractionDisabled()) return;

  if (state.selected.includes(cardId)) {
    state.selected = state.selected.filter((id) => id !== cardId);
  } else if (state.selected.length < 4) {
    state.selected = [...state.selected, cardId];
  }

  state.message = state.selected.length === 4 ? "Redo att skicka gruppen." : "Välj fyra ord som hör ihop.";
  state.messageTone = "neutral";
  saveState();
  renderConnections();
}

function clearSelection() {
  if (isInteractionDisabled()) return;

  state.selected = [];
  state.message = "Valet är rensat.";
  state.messageTone = "neutral";
  saveState();
  renderConnections();
}

function submitGroup() {
  if (isInteractionDisabled() || state.selected.length !== 4) return;

  const selectedCards = state.selected.map((id) => getCardsById().get(id));
  const groupIds = new Set(selectedCards.map((card) => card.groupId));

  if (groupIds.size === 1 && !state.solvedGroups.includes(selectedCards[0].groupId)) {
    state.solvedGroups = [...state.solvedGroups, selectedCards[0].groupId];
    state.selected = [];
    state.message = "Rätt samband hittat.";
    state.messageTone = "success";

    if (state.solvedGroups.length === puzzle.groups.length) {
      completeMission();
    }

    saveState();
    renderConnections();
    return;
  }

  registerMistake(selectedCards);
  saveState();
  renderConnections();
}

function registerMistake(selectedCards) {
  state.mistakeCount += 1;
  state.selected = [];

  if (isOneAway(selectedCards)) {
    state.message = "Ett ord ifrån!";
  } else {
    state.message = "De hör inte riktigt ihop. Försök igen.";
  }

  state.messageTone = "error";

  if (state.mistakeCount >= puzzle.mistakesBeforeCooldown) {
    state.cooldownUntil = Date.now() + puzzle.cooldownMs;
    state.message = "";
    state.messageTone = "neutral";
  }
}

function completeMission() {
  state.completed = true;
  state.cooldownUntil = null;
  state.mistakeCount = 0;
  state.selected = [];
  state.message = "";
  state.messageTone = "success";
  state.justCompleted = true;
  Mystery.markComplete(step.id);
}

function isOneAway(selectedCards) {
  const unsolvedGroups = puzzle.groups
    .filter((group) => !state.solvedGroups.includes(group.id))
    .map((group) => group.id);

  return unsolvedGroups.some(
    (groupId) => selectedCards.filter((card) => card.groupId === groupId).length === 3
  );
}

function getGroup(groupId) {
  return puzzle.groups.find((group) => group.id === groupId);
}

function isInteractionDisabled() {
  return state.completed || getCooldownRemaining() > 0;
}

function getCooldownRemaining() {
  if (!state.cooldownUntil) return 0;
  return Math.max(0, state.cooldownUntil - Date.now());
}

function clearExpiredCooldown() {
  if (!state.cooldownUntil || getCooldownRemaining() > 0) return;

  state.cooldownUntil = null;
  state.mistakeCount = 0;
  state.message = "Orden har lagt sig. Ni kan fortsätta.";
  state.messageTone = "success";
  saveState();
}

function startCooldownTicker() {
  window.clearInterval(cooldownTimer);

  if (getCooldownRemaining() <= 0) return;

  cooldownTimer = window.setInterval(() => {
    if (getCooldownRemaining() <= 0) {
      window.clearInterval(cooldownTimer);
      clearExpiredCooldown();
      renderConnections();
      return;
    }

    const count = document.querySelector("[data-cooldown-count]");
    if (count) {
      count.textContent = formatCooldownClock(getCooldownRemaining());
    }
  }, 1000);
}

function formatCooldownClock(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function scrollResultIntoView() {
  const target = document.querySelector(".connections-success");

  if (!target) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

setInterval(() => {
  if (!state.completed && !hintWasUnlocked && Mystery.isHintUnlocked(step)) {
    hintWasUnlocked = true;
    renderConnections();
  }
}, 30000);
