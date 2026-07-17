const step = Mystery.getStep("uppdrag-1");
const puzzle = step.puzzle;

const savedWordle = Mystery.readStoredJson(mysteryStorageKeys.wordle, null);

const wordleState = normalizeWordleState(savedWordle);
const wordleRoot = document.querySelector("[data-wordle-root]");
let hintWasUnlocked = Mystery.isHintUnlocked(step);

Mystery.renderGate("uppdrag-1", {
  onOpen() {
    renderWordle();
  },
});

function normalizeWordleState(savedState) {
  if (savedState?.answer && savedState.answer !== puzzle.answer) {
    savedState = null;
  }

  const guesses = Array.isArray(savedState?.guesses)
    ? savedState.guesses
        .filter((guess) => typeof guess === "string")
        .map(sanitizeGuess)
        .filter((guess) => guess.length === puzzle.answer.length)
    : [];
  const solved = Boolean(savedState?.solved) && guesses.includes(puzzle.answer);

  return {
    guesses,
    currentGuess: sanitizeGuess(savedState?.currentGuess || ""),
    solved,
    message: savedState?.message || "",
    shouldShake: false,
    justSolved: Boolean(savedState?.justSolved),
    keyStatuses:
      savedState?.keyStatuses && typeof savedState.keyStatuses === "object"
        ? savedState.keyStatuses
        : {},
  };
}

function saveWordle() {
  Mystery.writeStoredJson(mysteryStorageKeys.wordle, {
    answer: puzzle.answer,
    guesses: wordleState.guesses,
    currentGuess: wordleState.currentGuess,
    solved: wordleState.solved,
    message: wordleState.message,
    justSolved: wordleState.justSolved,
    keyStatuses: wordleState.keyStatuses,
  });
}

function renderWordle() {
  if (!wordleRoot) return;

  const wrapper = document.createElement("div");
  const board = document.createElement("div");
  const message = document.createElement("div");
  const keyboard = renderKeyboard();

  wrapper.className = "wordle";

  if (!wordleState.solved && Mystery.isHintUnlocked(step)) {
    const prompt = document.createElement("p");
    prompt.className = "wordle-prompt";
    prompt.textContent = step.hintText;
    wrapper.appendChild(prompt);
  }

  board.className = "wordle-board";
  board.setAttribute("aria-label", "Ordlås");

  const rowCount = wordleState.solved
    ? wordleState.guesses.length
    : Math.max(puzzle.visibleRows, wordleState.guesses.length + 1);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    board.appendChild(renderWordleRow(rowIndex));
  }

  message.className = "wordle-message";
  message.setAttribute("aria-live", "polite");

  if (wordleState.solved) {
    const nextAction = document.createElement("div");

    message.appendChild(renderSolvedMessage());
    Mystery.renderNextAction(step.id, nextAction);
    wrapper.append(board, message, nextAction);
  } else {
    message.textContent =
      wordleState.message || "Skriv fem bokstäver och tryck Enter.";
    wrapper.append(board, message, keyboard);
  }

  wordleRoot.replaceChildren(wrapper);

  scrollWordleToActiveRow();

  if (wordleState.justSolved) {
    window.setTimeout(() => {
      scrollResultIntoView();
      wordleState.justSolved = false;
      saveWordle();
    }, 900);
  }
}

function renderWordleRow(rowIndex) {
  const row = document.createElement("div");
  const guess = wordleState.guesses[rowIndex] || "";
  const isCurrentRow =
    rowIndex === wordleState.guesses.length && !isWordleFinished();
  const isWinningRow =
    wordleState.solved && rowIndex === wordleState.guesses.length - 1;
  const letters = isCurrentRow ? wordleState.currentGuess : guess;

  row.className = "wordle-row";
  row.classList.toggle("is-active", isCurrentRow);
  row.classList.toggle("shake", isCurrentRow && wordleState.shouldShake);
  row.classList.toggle("solved-flip", isWinningRow && wordleState.justSolved);

  for (let colIndex = 0; colIndex < puzzle.answer.length; colIndex += 1) {
    const tile = document.createElement("span");
    tile.className = "wordle-tile";
    tile.textContent = letters[colIndex] || "";

    if (guess) {
      tile.dataset.result = getGuessResults(guess)[colIndex];
      tile.style.setProperty("--tile-index", colIndex);
    }

    row.appendChild(tile);
  }

  return row;
}

function renderSolvedMessage() {
  const container = document.createElement("div");
  const firstLine = document.createElement("strong");
  const secondLine = document.createElement("span");
  const nextStep = Mystery.getNextStep(step.id);

  container.className = "solved-message";
  firstLine.textContent = "Första låset är öppnat.";
  secondLine.textContent = nextStep && Mystery.isTimeUnlocked(nextStep)
    ? "Nästa ledtråd väntar."
    : "Jakten fortsätter när nästa ledtråd anländer.";

  container.append(firstLine, secondLine);
  return container;
}

function renderKeyboard() {
  const keyboard = document.createElement("div");
  keyboard.className = "keyboard";
  keyboard.setAttribute("aria-label", "Virtuellt tangentbord");

  ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach((rowLetters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    if (rowIndex === 2) {
      row.appendChild(createKey("ENTER", "Enter"));
    }

    [...rowLetters].forEach((letter) => {
      row.appendChild(createKey(letter, letter));
    });

    if (rowIndex === 2) {
      row.appendChild(createKey("BACK", "Back"));
    }

    keyboard.appendChild(row);
  });

  return keyboard;
}

function createKey(value, label) {
  const key = document.createElement("button");
  key.type = "button";
  key.className = "key";
  key.textContent = label === "Back" ? "<" : label;
  key.setAttribute("aria-label", label === "Back" ? "Radera" : label);
  key.dataset.key = value;

  if (wordleState.keyStatuses[value]) {
    key.dataset.result = wordleState.keyStatuses[value];
  }

  key.disabled = isWordleFinished();
  key.addEventListener("click", () => handleWordleInput(value));
  return key;
}

function handleWordleInput(value) {
  if (isWordleFinished()) return;

  if (value === "BACK") {
    wordleState.currentGuess = wordleState.currentGuess.slice(0, -1);
    wordleState.message = "";
    wordleState.shouldShake = false;
  } else if (value === "ENTER") {
    submitWordleGuess();
  } else if (/^[A-Z]$/.test(value)) {
    wordleState.currentGuess = sanitizeGuess(`${wordleState.currentGuess}${value}`);
    wordleState.message = "";
    wordleState.shouldShake = false;
  }

  saveWordle();
  renderWordle();
}

function submitWordleGuess() {
  const guess = sanitizeGuess(wordleState.currentGuess);

  if (guess.length !== puzzle.answer.length) {
    wordleState.currentGuess = guess;
    wordleState.message = "Ordet måste vara fem bokstäver.";
    wordleState.shouldShake = true;
    return;
  }

  wordleState.guesses.push(guess);
  wordleState.currentGuess = "";
  wordleState.shouldShake = false;
  updateKeyStatuses(guess);

  if (guess === puzzle.answer) {
    wordleState.solved = true;
    wordleState.justSolved = true;
    wordleState.message = "";
    Mystery.markComplete(step.id);
    return;
  }

  if (hasAttemptLimit() && wordleState.guesses.length >= puzzle.maxAttempts) {
    wordleState.message = "Inga försök kvar.";
    return;
  }

  wordleState.message = "Försök igen.";
}

function sanitizeGuess(value) {
  return value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, puzzle.answer.length);
}

function hasAttemptLimit() {
  return Number.isInteger(puzzle.maxAttempts);
}

function isWordleFinished() {
  return (
    wordleState.solved ||
    (hasAttemptLimit() && wordleState.guesses.length >= puzzle.maxAttempts)
  );
}

function updateKeyStatuses(guess) {
  const rank = {
    absent: 0,
    present: 1,
    correct: 2,
  };

  getGuessResults(guess).forEach((result, index) => {
    const letter = guess[index];
    const previous = wordleState.keyStatuses[letter];

    if (!previous || rank[result] > rank[previous]) {
      wordleState.keyStatuses[letter] = result;
    }
  });
}

function getGuessResults(guess) {
  const answer = puzzle.answer;
  const results = Array(guess.length).fill("absent");
  const remaining = {};

  [...answer].forEach((letter, index) => {
    if (guess[index] === letter) {
      results[index] = "correct";
      return;
    }
    remaining[letter] = (remaining[letter] || 0) + 1;
  });

  [...guess].forEach((letter, index) => {
    if (results[index] === "correct") return;

    if (remaining[letter] > 0) {
      results[index] = "present";
      remaining[letter] -= 1;
    }
  });

  return results;
}

function scrollWordleToActiveRow() {
  const board = document.querySelector(".wordle-board");
  const activeRow = document.querySelector(".wordle-row.is-active, .wordle-row.solved-flip");

  if (!board || !activeRow) return;

  requestAnimationFrame(() => {
    activeRow.scrollIntoView({ block: "nearest" });
    board.scrollTop = board.scrollHeight;
  });
}

function scrollResultIntoView() {
  const target = document.querySelector(".solved-message");

  if (!target) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

  const key = event.key.toUpperCase();

  if (key === "BACKSPACE") {
    event.preventDefault();
    handleWordleInput("BACK");
  } else if (key === "ENTER") {
    event.preventDefault();
    handleWordleInput("ENTER");
  } else if (/^[A-Z]$/.test(key)) {
    event.preventDefault();
    handleWordleInput(key);
  }
});

setInterval(() => {
  if (!wordleState.solved && !hintWasUnlocked && Mystery.isHintUnlocked(step)) {
    hintWasUnlocked = true;
    renderWordle();
  }
}, 30000);
