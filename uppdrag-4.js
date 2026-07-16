const step = Mystery.getStep("uppdrag-4");
const puzzle = step.puzzle;
const root = document.querySelector("[data-sudoku-root]");
const givenMap = new Map(puzzle.givens.map((given) => [given.cell, given]));

let hintWasUnlocked = Mystery.isHintUnlocked(step);

const state = normalizeState(
  JSON.parse(localStorage.getItem(mysteryStorageKeys.sudoku) || "null")
);

Mystery.renderGate("uppdrag-4", {
  onOpen() {
    if (state.completed) {
      Mystery.markComplete(step.id);
    }
    renderSudoku();
    renderTestTools();
  },
});

function normalizeState(savedState) {
  return {
    entries: savedState?.entries || {},
    completed: Boolean(savedState?.completed),
    message: savedState?.message || "",
    messageTone: savedState?.messageTone || "neutral",
    checkedCells: savedState?.checkedCells || {},
    justCompleted: Boolean(savedState?.justCompleted),
  };
}

function saveState() {
  localStorage.setItem(
    mysteryStorageKeys.sudoku,
    JSON.stringify({
      entries: state.entries,
      completed: state.completed,
      message: state.message,
      messageTone: state.messageTone,
      checkedCells: state.checkedCells,
      justCompleted: state.justCompleted,
    })
  );
}

function renderSudoku() {
  if (!root) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sudoku";

  if (!state.completed && Mystery.isHintUnlocked(step)) {
    const hint = document.createElement("p");
    hint.className = "timed-hint";
    hint.textContent = step.hintText;
    wrapper.appendChild(hint);
  }

  wrapper.append(renderBoard());

  if (puzzle.clues.length > 0) {
    wrapper.append(renderClues());
  }

  wrapper.append(renderStatus(), renderActions());

  if (state.completed) {
    const success = document.createElement("div");
    const nextAction = document.createElement("div");

    success.className = "sudoku-success";
    success.innerHTML = `<strong>Rätt.</strong><span>Nästa ledtråd väntar.</span>`;
    Mystery.renderNextAction(step.id, nextAction);
    success.appendChild(nextAction);
    wrapper.appendChild(success);
  }

  root.replaceChildren(wrapper);

  if (state.justCompleted) {
    window.setTimeout(() => {
      scrollResultIntoView();
      state.justCompleted = false;
      saveState();
    }, 500);
  }
}

function renderBoard() {
  const board = document.createElement("div");
  board.className = "sudoku-board";
  board.setAttribute("aria-label", "Sudoku");

  for (let cell = 0; cell < 81; cell += 1) {
    const given = givenMap.get(cell);
    const input = document.createElement("input");
    const value = given?.display || given?.value || state.entries[cell] || "";

    input.className = "sudoku-cell";
    input.inputMode = "numeric";
    input.maxLength = 1;
    input.autocomplete = "off";
    input.disabled = state.completed || Boolean(given);
    input.value = value;
    input.setAttribute("aria-label", `Ruta ${cell + 1}`);

    if (given) {
      input.classList.add("is-given");
    } else {
      input.addEventListener("input", (event) => handleInput(cell, event.target.value));
      input.addEventListener("keydown", (event) => handleCellKeydown(cell, event));
    }

    if (state.checkedCells[cell] === "error") {
      input.classList.add("is-error");
    }

    if (state.checkedCells[cell] === "correct") {
      input.classList.add("is-correct");
    }

    board.appendChild(input);
  }

  return board;
}

function renderClues() {
  const list = document.createElement("dl");
  list.className = "sudoku-clues";

  puzzle.clues.forEach((clue) => {
    const term = document.createElement("dt");
    const desc = document.createElement("dd");

    term.textContent = clue.label;
    desc.textContent = clue.text;
    list.append(term, desc);
  });

  return list;
}

function renderStatus() {
  const status = document.createElement("p");
  status.className = "sudoku-message";
  status.dataset.tone = state.messageTone;
  status.setAttribute("aria-live", "polite");
  status.textContent = state.message;
  return status;
}

function renderActions() {
  const actions = document.createElement("div");
  const check = document.createElement("button");
  const clear = document.createElement("button");

  actions.className = "sudoku-actions";

  check.type = "button";
  check.className = "primary-action button-action";
  check.textContent = "Kontrollera";
  check.disabled = state.completed;
  check.addEventListener("click", checkSudoku);

  clear.type = "button";
  clear.className = "secondary-action button-action";
  clear.textContent = "Rensa";
  clear.disabled = state.completed || Object.keys(state.entries).length === 0;
  clear.addEventListener("click", clearEntries);

  actions.append(check, clear);
  return actions;
}

function handleInput(cell, rawValue) {
  const value = rawValue.replace(/[^1-9]/g, "").slice(0, 1);

  if (value) {
    state.entries[cell] = value;
  } else {
    delete state.entries[cell];
  }

  delete state.checkedCells[cell];
  state.message = "";
  state.messageTone = "neutral";
  saveState();
  renderSudoku();
  focusCell(cell);
}

function handleCellKeydown(cell, event) {
  const direction = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -9,
    ArrowDown: 9,
  }[event.key];

  if (!direction) return;

  event.preventDefault();
  focusCell(cell + direction);
}

function focusCell(cell) {
  const cells = [...document.querySelectorAll(".sudoku-cell")];
  const target = cells[cell];

  if (target && !target.disabled) {
    target.focus({ preventScroll: true });
  }
}

function checkSudoku() {
  const checkedCells = {};
  let hasEmpty = false;
  let hasError = false;

  for (let cell = 0; cell < 81; cell += 1) {
    if (givenMap.has(cell)) continue;

    const value = state.entries[cell] || "";

    if (!value) {
      hasEmpty = true;
      continue;
    }

    if (value === puzzle.solution[cell]) {
      checkedCells[cell] = "correct";
    } else {
      checkedCells[cell] = "error";
      hasError = true;
    }
  }

  state.checkedCells = checkedCells;

  if (hasError) {
    state.message = "Något stämmer inte än.";
    state.messageTone = "error";
  } else if (hasEmpty) {
    state.message = "Fyll i alla rutor först.";
    state.messageTone = "neutral";
  } else {
    completeMission();
  }

  saveState();
  renderSudoku();
}

function clearEntries() {
  state.entries = {};
  state.checkedCells = {};
  state.message = "";
  state.messageTone = "neutral";
  saveState();
  renderSudoku();
}

function completeMission() {
  state.completed = true;
  state.message = "";
  state.messageTone = "success";
  state.justCompleted = true;
  Mystery.markComplete(step.id);
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
    <button class="secondary-action button-action" type="button" data-test-solve>Fyll i lösning</button>
    <button class="secondary-action button-action" type="button" data-test-complete>Markera uppdraget som löst</button>
    <button class="secondary-action button-action" type="button" data-test-reset>Återställ endast uppdrag 4</button>
  `;

  container.querySelector("[data-test-solve]").addEventListener("click", () => {
    for (let cell = 0; cell < 81; cell += 1) {
      if (!givenMap.has(cell)) {
        state.entries[cell] = puzzle.solution[cell];
      }
    }
    state.checkedCells = {};
    state.message = "Lösningen är ifylld.";
    state.messageTone = "success";
    saveState();
    renderSudoku();
  });

  container.querySelector("[data-test-complete]").addEventListener("click", () => {
    completeMission();
    saveState();
    renderSudoku();
  });

  container.querySelector("[data-test-reset]").addEventListener("click", () => {
    localStorage.removeItem(mysteryStorageKeys.sudoku);
    const progress = JSON.parse(localStorage.getItem(mysteryStorageKeys.progress) || "{}");
    if (progress.completed) {
      delete progress.completed["uppdrag-4"];
      localStorage.setItem(mysteryStorageKeys.progress, JSON.stringify(progress));
    }
    window.location.href = Mystery.linkTo("uppdrag-4.html");
  });
}

function scrollResultIntoView() {
  const target = document.querySelector(".sudoku-success");

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
    renderSudoku();
  }
}, 30000);
