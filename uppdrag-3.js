const step = Mystery.getStep("uppdrag-3");
const puzzle = step.puzzle;
const root = document.querySelector("[data-cipher-root]");

let isChecking = false;
let animationTimer = null;
let hintWasUnlocked = Mystery.isHintUnlocked(step);

const state = normalizeState(
  Mystery.readStoredJson(mysteryStorageKeys.cipher, null)
);

Mystery.renderGate("uppdrag-3", {
  onOpen() {
    if (state.solved) {
      Mystery.markComplete(step.id);
    }
    renderCipher();
    renderTestTools();
  },
});

function normalizeState(savedState) {
  if (savedState?.encodedText && savedState.encodedText !== puzzle.encodedText) {
    savedState = null;
  }

  return {
    solved: Boolean(savedState?.solved),
    decodedText: savedState?.decodedText || "",
    message: savedState?.message || "",
    hasError: false,
    currentAnswer: "",
    currentDisplay: savedState?.solved ? savedState.decodedText || puzzle.decodedText : puzzle.encodedText,
  };
}

function saveState() {
  Mystery.writeStoredJson(mysteryStorageKeys.cipher, {
    encodedText: puzzle.encodedText,
    solved: state.solved,
    decodedText: state.decodedText,
    message: state.message,
  });
}

function renderCipher() {
  if (!root) return;

  root.replaceChildren();

  const wrapper = document.createElement("div");
  const cipherText = document.createElement("div");

  wrapper.className = "cipher";

  if (!state.solved && Mystery.isHintUnlocked(step)) {
    const hint = document.createElement("p");
    hint.className = "timed-hint";
    hint.textContent = step.hintText;
    wrapper.appendChild(hint);
  }

  cipherText.className = "cipher-text";
  renderCipherValue(
    cipherText,
    state.solved ? puzzle.decodedText : state.currentDisplay,
    state.solved
  );
  cipherText.setAttribute("aria-live", state.solved ? "polite" : "off");
  wrapper.appendChild(cipherText);

  if (state.solved) {
    wrapper.appendChild(renderSuccess());
  } else {
    wrapper.appendChild(renderForm());
  }

  root.appendChild(wrapper);
}

function renderForm() {
  const form = document.createElement("form");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const message = document.createElement("p");

  form.className = "cipher-form";
  form.classList.toggle("shake", state.hasError);
  form.addEventListener("submit", handleSubmit);

  input.className = "cipher-input";
  input.type = "text";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Svar");
  input.disabled = isChecking;
  input.value = state.currentAnswer;
  input.addEventListener("input", () => {
    state.currentAnswer = input.value;
  });

  button.className = "primary-action button-action";
  button.type = "submit";
  button.textContent = "Kontrollera";
  button.disabled = isChecking;

  message.className = "cipher-message";
  message.dataset.tone = state.hasError ? "error" : "neutral";
  message.setAttribute("aria-live", "polite");
  message.textContent = state.message;

  form.append(input, button, message);
  return form;
}

function renderSuccess() {
  const success = document.createElement("div");
  const nextAction = document.createElement("div");

  success.className = "cipher-success";
  success.innerHTML = `<strong>${puzzle.successTitle}</strong>`;

  if (puzzle.successText) {
    const text = document.createElement("span");
    text.textContent = puzzle.successText;
    success.appendChild(text);
  }

  const status = document.createElement("span");
  status.textContent = "Nästa lås väntar.";
  success.appendChild(status);

  Mystery.renderNextAction(step.id, nextAction);
  success.appendChild(nextAction);
  return success;
}

function handleSubmit(event) {
  event.preventDefault();

  if (isChecking || state.solved) return;

  const input = event.currentTarget.querySelector(".cipher-input");
  const answer = input.value.trim().toUpperCase();
  state.currentAnswer = input.value;

  if (puzzle.acceptedAnswers.includes(answer)) {
    solveCipher();
    return;
  }

  state.message = "Fel. Testa igen.";
  state.hasError = true;
  renderCipher();
  document.querySelector(".cipher-input")?.focus({ preventScroll: true });
}

function solveCipher() {
  isChecking = true;
  state.hasError = false;
  state.message = "";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    finishSolve();
    return;
  }

  animateDecode();
}

function animateDecode() {
  const encodedWords = puzzle.encodedText
    .trim()
    .split(/\s{2,}/)
    .map((word) => word.split(/\s+/));
  const decodedWords = puzzle.decodedText.split(" ").map((word) => word.split(""));
  let stepIndex = 0;
  const output = encodedWords.map((word) => [...word]);
  const positions = encodedWords.flatMap((word, wordIndex) =>
    word.map((_, letterIndex) => [wordIndex, letterIndex])
  );

  renderDisplay(formatCipherOutput(output));

  animationTimer = window.setInterval(() => {
    const [wordIndex, letterIndex] = positions[stepIndex];
    output[wordIndex][letterIndex] = decodedWords[wordIndex][letterIndex] || "";
    stepIndex += 1;
    renderDisplay(formatCipherOutput(output));

    if (stepIndex >= positions.length) {
      window.clearInterval(animationTimer);
      window.setTimeout(finishSolve, 240);
    }
  }, 120);
}

function formatCipherOutput(words) {
  return words.map((word) => word.join(" ")).join("   ");
}

function renderCipherValue(container, value, isDecoded) {
  container.replaceChildren();
  container.setAttribute("aria-label", value.replace(/\s+/g, " ").trim());

  if (isDecoded) {
    container.textContent = value;
    return;
  }

  value
    .trim()
    .split(/\s{2,}/)
    .forEach((word) => {
      const wordElement = document.createElement("span");
      wordElement.className = "cipher-word";
      wordElement.setAttribute("aria-hidden", "true");

      word.split(/\s+/).forEach((symbol) => {
        const symbolElement = document.createElement("span");
        symbolElement.className = "cipher-symbol";
        symbolElement.textContent = symbol;
        wordElement.appendChild(symbolElement);
      });

      container.appendChild(wordElement);
    });
}

function renderDisplay(value) {
  state.currentDisplay = value;
  renderCipher();
}

function finishSolve() {
  window.clearInterval(animationTimer);
  isChecking = false;
  state.solved = true;
  state.decodedText = puzzle.decodedText;
  state.currentDisplay = puzzle.decodedText;
  state.currentAnswer = "";
  Mystery.markComplete(step.id);
  saveState();
  renderCipher();
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
    <button class="secondary-action button-action" type="button" data-test-fill>Fyll i rätt svar</button>
    <button class="secondary-action button-action" type="button" data-test-solve>Färdigställ lås 3</button>
    <button class="secondary-action button-action" type="button" data-test-reset>Återställ endast lås 3</button>
  `;

  container.querySelector("[data-test-fill]").addEventListener("click", () => {
    const input = document.querySelector(".cipher-input");
    if (input) {
      input.value = puzzle.acceptedAnswers[0];
      input.focus({ preventScroll: true });
    }
  });

  container.querySelector("[data-test-solve]").addEventListener("click", () => {
    finishSolve();
  });

  container.querySelector("[data-test-reset]").addEventListener("click", () => {
    Mystery.resetProgressFrom(step.id);
    window.location.href = Mystery.linkTo("uppdrag-3.html");
  });
}

setInterval(() => {
  if (!state.solved && !hintWasUnlocked && Mystery.isHintUnlocked(step)) {
    hintWasUnlocked = true;
    renderCipher();
  }
}, 30000);
