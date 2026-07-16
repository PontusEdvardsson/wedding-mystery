const step = Mystery.getStep("uppdrag-3");
const puzzle = step.puzzle;
const root = document.querySelector("[data-cipher-root]");

let isChecking = false;
let animationTimer = null;
let hintWasUnlocked = Mystery.isHintUnlocked(step);

const state = normalizeState(
  JSON.parse(localStorage.getItem(mysteryStorageKeys.cipher) || "null")
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
  return {
    solved: Boolean(savedState?.solved),
    decodedText: savedState?.decodedText || "",
    message: savedState?.message || "",
    hasError: false,
    currentDisplay: savedState?.solved ? savedState.decodedText || puzzle.decodedText : puzzle.encodedText,
  };
}

function saveState() {
  localStorage.setItem(
    mysteryStorageKeys.cipher,
    JSON.stringify({
      solved: state.solved,
      decodedText: state.decodedText,
      message: state.message,
    })
  );
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
  cipherText.textContent = state.solved ? puzzle.decodedText : state.currentDisplay;
  cipherText.setAttribute("aria-live", "polite");
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
  input.value = input.dataset.value || "";

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

  Mystery.renderNextAction(step.id, nextAction);
  success.appendChild(nextAction);
  return success;
}

function handleSubmit(event) {
  event.preventDefault();

  if (isChecking || state.solved) return;

  const input = event.currentTarget.querySelector(".cipher-input");
  const answer = input.value.trim().toUpperCase();

  if (puzzle.acceptedAnswers.includes(answer)) {
    solveCipher();
    return;
  }

  state.message = "Fel. Testa igen.";
  state.hasError = true;
  renderCipher();
  const nextInput = document.querySelector(".cipher-input");
  if (nextInput) {
    nextInput.value = input.value;
    nextInput.focus({ preventScroll: true });
  }
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
  return words.map((word) => word.join("")).join("   ");
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
    <button class="secondary-action button-action" type="button" data-test-solve>Markera uppdraget som löst</button>
    <button class="secondary-action button-action" type="button" data-test-reset>Återställ endast uppdrag 3</button>
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
    localStorage.removeItem(mysteryStorageKeys.cipher);
    const progress = JSON.parse(localStorage.getItem(mysteryStorageKeys.progress) || "{}");
    if (progress.completed) {
      delete progress.completed["uppdrag-3"];
      localStorage.setItem(mysteryStorageKeys.progress, JSON.stringify(progress));
    }
    window.location.href = Mystery.linkTo("uppdrag-3.html");
  });
}

setInterval(() => {
  if (!state.solved && !hintWasUnlocked && Mystery.isHintUnlocked(step)) {
    hintWasUnlocked = true;
    renderCipher();
  }
}, 30000);
