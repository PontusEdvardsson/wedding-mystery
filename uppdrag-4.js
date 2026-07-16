const step = Mystery.getStep("uppdrag-4");
const puzzle = step.puzzle;
const root = document.querySelector("[data-sudoku-root]");
const givenMap = new Map(puzzle.givens.map((given) => [given.cell, given]));

let hintWasUnlocked = Mystery.isHintUnlocked(step);
let selectedNumber = null;
let focusedCell = null;
let activeClueCell = null;
let pointerDrag = null;
let suppressNextNumberClick = false;

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
    givensRevealed: Boolean(savedState?.givensRevealed),
    givenEntries: savedState?.givenEntries || {},
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
      givensRevealed: state.givensRevealed,
      givenEntries: state.givenEntries,
    })
  );
}

function renderSudoku() {
  if (!root) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sudoku";

  wrapper.append(
    renderLocalResetAction(),
    renderIntro(),
    renderHintRevealAction(),
    renderBoard(),
    renderActiveClue(),
    renderNumberBank(),
    renderNumberHelp()
  );

  if (puzzle.clues.length > 0) {
    wrapper.append(renderClues());
  }

  wrapper.append(renderStatus(), renderActions());

  if (state.completed) {
    const success = document.createElement("div");
    const nextAction = document.createElement("div");
    const nextStep = Mystery.getNextStep(step.id);

    success.className = "sudoku-success";
    success.innerHTML = nextStep
      ? `<strong>Korrekt.</strong><span>Nästa ledtråd väntar.</span>`
      : `<strong>Korrekt.</strong>`;
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
    const button = document.createElement("button");
    const value = given
      ? state.givensRevealed
        ? given.value
        : state.givenEntries[cell] || "?"
      : state.entries[cell] || "";

    button.type = "button";
    button.className = "sudoku-cell";
    button.disabled = state.completed || (Boolean(given) && state.givensRevealed);
    button.textContent = value;
    button.setAttribute(
      "aria-label",
      given
        ? state.givensRevealed
          ? `Ruta ${cell + 1}, ${given.value}`
          : state.givenEntries[cell]
            ? `Ruta ${cell + 1}, ${state.givenEntries[cell]}, dold ledtråd`
            : `Ruta ${cell + 1}, dold ledtråd`
        : value
          ? `Ruta ${cell + 1}, ${value}`
          : `Ruta ${cell + 1}, tom`
    );

    if (given) {
      button.classList.add("is-given");

      if (!state.givensRevealed) {
        button.classList.add("is-clue");
        button.setAttribute("aria-expanded", activeClueCell === cell ? "true" : "false");
        button.addEventListener("click", () => toggleGivenClue(cell));
        button.addEventListener("keydown", (event) => handleGivenKeydown(cell, event));
        button.addEventListener("dragover", (event) => {
          if (!state.completed) {
            event.preventDefault();
          }
        });
        button.addEventListener("drop", (event) => handleCellDrop(cell, event));
      } else {
        button.classList.add("is-revealed-given");
      }
    } else {
      button.addEventListener("focus", () => {
        focusedCell = cell;
      });
      button.addEventListener("keydown", (event) => handleCellKeydown(cell, event));
      button.addEventListener("dragover", (event) => {
        if (!state.completed) {
          event.preventDefault();
        }
      });
      button.addEventListener("drop", (event) => handleCellDrop(cell, event));
    }

    if (value && value !== "?") {
      button.classList.add("has-value");
    }

    if (selectedNumber && value === selectedNumber) {
      button.classList.add("is-same-number");
    }

    board.appendChild(button);
  }

  return board;
}

function renderLocalResetAction() {
  const action = document.createElement("div");
  const button = document.createElement("button");

  action.className = "sudoku-local-reset";
  button.type = "button";
  button.className = "secondary-action button-action";
  button.textContent = "Nollställ sudoku";
  button.disabled =
    !state.completed &&
    !state.givensRevealed &&
    Object.keys(state.entries).length === 0 &&
    Object.keys(state.givenEntries).length === 0;
  button.addEventListener("click", resetSudoku);

  action.appendChild(button);
  return action;
}

function renderIntro() {
  const intro = document.createElement("p");
  intro.className = "sudoku-instruction";
  intro.textContent = state.givensRevealed
    ? "Startsiffrorna är framme."
    : "Klicka på ? för att se vad som gömmer sig där.";
  return intro;
}

function renderHintRevealAction() {
  const panel = document.createElement("div");

  panel.className = "sudoku-hint-action";

  if (state.completed || state.givensRevealed || !Mystery.isHintUnlocked(step)) {
    panel.hidden = true;
    return panel;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-action button-action";
  button.textContent = "Ledtråd";
  button.addEventListener("click", revealGivens);

  panel.appendChild(button);
  return panel;
}

function renderActiveClue() {
  const panel = document.createElement("div");
  const given = givenMap.get(activeClueCell);

  panel.className = "sudoku-clue-panel";
  panel.setAttribute("aria-live", "polite");

  if (!given) {
    panel.hidden = true;
    return panel;
  }

  panel.textContent = given.clue || "Här ska en ledtråd som leder till siffran ligga.";
  return panel;
}

function renderNumberHelp() {
  const help = document.createElement("p");
  help.className = "sudoku-instruction sudoku-drag-help";
  help.textContent = "Dra och släpp siffror på rätt ställen.";
  return help;
}

function revealGivens() {
  state.givensRevealed = true;
  state.givenEntries = {};
  activeClueCell = null;
  saveState();
  renderSudoku();
}

function renderNumberBank() {
  const bank = document.createElement("div");

  bank.className = "sudoku-number-bank";
  bank.setAttribute("aria-label", "Siffror");

  for (let number = 1; number <= 9; number += 1) {
    const button = document.createElement("button");
    const value = String(number);

    button.type = "button";
    button.className = "sudoku-number";
    button.classList.toggle("is-selected", selectedNumber === value);
    button.textContent = value;
    button.draggable = !state.completed;
    button.disabled = state.completed;
    button.setAttribute("aria-pressed", selectedNumber === value ? "true" : "false");
    button.addEventListener("click", () => {
      if (suppressNextNumberClick) {
        suppressNextNumberClick = false;
        return;
      }
      selectNumber(value);
    });
    button.addEventListener("pointerdown", (event) => startNumberPointerDrag(value, event));
    button.addEventListener("dragstart", (event) => {
      selectedNumber = value;
      event.dataTransfer.setData("text/plain", value);
      event.dataTransfer.effectAllowed = "copy";
    });

    bank.appendChild(button);
  }

  const erase = document.createElement("button");
  erase.type = "button";
  erase.className = "sudoku-number sudoku-erase";
  erase.textContent = "Radera";
  erase.disabled = state.completed;
  erase.addEventListener("click", () => {
    selectedNumber = null;
    if (focusedCell !== null) {
      setCellValue(focusedCell, "");
      return;
    }
    renderSudoku();
    focusCell(focusedCell);
  });
  bank.appendChild(erase);

  return bank;
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

function toggleGivenClue(cell) {
  activeClueCell = activeClueCell === cell ? null : cell;
  renderSudoku();
  focusCell(cell);
}

function handleGivenKeydown(cell, event) {
  const direction = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -9,
    ArrowDown: 9,
  }[event.key];

  if (direction) {
    event.preventDefault();
    focusCell(cell + direction, { includeGiven: true });
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    selectedNumber = event.key;
    setCellValue(cell, event.key);
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    setCellValue(cell, "");
  }
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

  actions.className = "sudoku-actions";

  check.type = "button";
  check.className = "primary-action button-action";
  check.textContent = "Kontrollera";
  check.disabled = state.completed;
  check.addEventListener("click", checkSudoku);

  actions.append(check);
  return actions;
}

function selectNumber(value) {
  selectedNumber = selectedNumber === value ? null : value;
  renderSudoku();
  focusCell(focusedCell);
}

function handleCellDrop(cell, event) {
  event.preventDefault();

  if (state.completed) return;

  const value = event.dataTransfer.getData("text/plain");

  if (/^[1-9]$/.test(value)) {
    selectedNumber = value;
    setCellValue(cell, value);
  }
}

function startNumberPointerDrag(value, event) {
  if (state.completed || event.pointerType === "mouse") return;

  pointerDrag = {
    value,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    ghost: null,
  };

  selectedNumber = value;
  document.addEventListener("pointermove", handleNumberPointerMove, { passive: false });
  document.addEventListener("pointerup", handleNumberPointerUp, { passive: false, once: true });
  document.addEventListener("pointercancel", cancelNumberPointerDrag, { once: true });
}

function handleNumberPointerMove(event) {
  if (!pointerDrag) return;

  const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);

  if (distance > 8) {
    pointerDrag.moved = true;
  }

  if (!pointerDrag.moved) return;

  event.preventDefault();

  if (!pointerDrag.ghost) {
    pointerDrag.ghost = document.createElement("div");
    pointerDrag.ghost.className = "sudoku-drag-ghost";
    pointerDrag.ghost.textContent = pointerDrag.value;
    document.body.appendChild(pointerDrag.ghost);
  }

  pointerDrag.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
}

function handleNumberPointerUp(event) {
  if (!pointerDrag) return;

  if (pointerDrag.moved) {
    event.preventDefault();
    suppressNextNumberClick = true;

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".sudoku-cell");
    const cells = [...document.querySelectorAll(".sudoku-cell")];
    const cell = cells.indexOf(target);

    if (cell >= 0) {
      setCellValue(cell, pointerDrag.value);
    }
  }

  cancelNumberPointerDrag();
}

function cancelNumberPointerDrag() {
  if (pointerDrag?.ghost) {
    pointerDrag.ghost.remove();
  }

  pointerDrag = null;
  document.removeEventListener("pointermove", handleNumberPointerMove);
  document.removeEventListener("pointerup", handleNumberPointerUp);
  document.removeEventListener("pointercancel", cancelNumberPointerDrag);
}

function setCellValue(cell, rawValue) {
  const given = givenMap.get(cell);

  if (state.completed || (given && state.givensRevealed)) return;

  focusedCell = cell;
  const value = String(rawValue).replace(/[^1-9]/g, "").slice(0, 1);

  if (given && value) {
    state.givenEntries[cell] = value;
  } else if (given) {
    delete state.givenEntries[cell];
  } else if (value) {
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

  if (direction) {
    event.preventDefault();
    focusCell(cell + direction);
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    selectedNumber = event.key;
    setCellValue(cell, event.key);
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    setCellValue(cell, "");
  }
}

function focusCell(cell, options = {}) {
  const cells = [...document.querySelectorAll(".sudoku-cell")];
  const target = cells[cell];

  if (target && (!target.disabled || options.includeGiven)) {
    target.focus({ preventScroll: true });
  }
}

function checkSudoku() {
  let hasEmpty = false;
  let hasError = false;

  for (let cell = 0; cell < 81; cell += 1) {
    const given = givenMap.get(cell);

    if (given && state.givensRevealed) continue;

    const value = given ? state.givenEntries[cell] || "" : state.entries[cell] || "";

    if (!value) {
      hasEmpty = true;
      continue;
    }

    if (value !== puzzle.solution[cell]) {
      hasError = true;
    }
  }

  state.checkedCells = {};

  if (hasError) {
    state.message = "Ej korrekt.";
    state.messageTone = "error";
  } else if (hasEmpty) {
    state.message = "Fyll i alla rutor först.";
    state.messageTone = "neutral";
  } else {
    state.message = "Korrekt.";
    completeMission();
  }

  saveState();
  renderSudoku();
}

function clearEntries() {
  state.entries = {};
  state.givenEntries = {};
  state.checkedCells = {};
  state.message = "";
  state.messageTone = "neutral";
  saveState();
  renderSudoku();
}

function resetSudoku() {
  state.entries = {};
  state.givenEntries = {};
  state.checkedCells = {};
  state.givensRevealed = false;
  state.completed = false;
  state.justCompleted = false;
  state.message = "";
  state.messageTone = "neutral";
  activeClueCell = null;
  selectedNumber = null;
  focusedCell = null;
  const progress = JSON.parse(localStorage.getItem(mysteryStorageKeys.progress) || "{}");
  if (progress.completed) {
    delete progress.completed[step.id];
    localStorage.setItem(mysteryStorageKeys.progress, JSON.stringify(progress));
  }
  saveState();
  renderSudoku();
}

function completeMission() {
  state.completed = true;
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
    <button class="secondary-action button-action" type="button" data-test-finish>Lös hela sudoku</button>
    <button class="secondary-action button-action" type="button" data-test-complete>Markera uppdraget som löst</button>
    <button class="secondary-action button-action" type="button" data-test-reset>Återställ endast uppdrag 4</button>
  `;

  container.querySelector("[data-test-solve]").addEventListener("click", () => {
    state.givensRevealed = true;
    state.givenEntries = {};
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

  container.querySelector("[data-test-finish]").addEventListener("click", () => {
    fillSudokuSolution();
    completeMission();
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

function fillSudokuSolution() {
  state.givensRevealed = true;
  state.givenEntries = {};

  for (let cell = 0; cell < 81; cell += 1) {
    if (!givenMap.has(cell)) {
      state.entries[cell] = puzzle.solution[cell];
    }
  }

  state.checkedCells = {};
  state.message = "Korrekt.";
  state.messageTone = "success";
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
