const endingStep = Mystery.getStep("avslutning");
const endingRoot = document.querySelector("[data-ending-root]");
const endingState = normalizeEndingState(
  JSON.parse(localStorage.getItem(mysteryStorageKeys.ending) || "null")
);

Mystery.renderGate(endingStep.id, {
  onOpen() {
    renderEnding();
  },
});

function normalizeEndingState(savedState) {
  return {
    opened: Boolean(savedState?.opened),
  };
}

function saveEndingState() {
  localStorage.setItem(
    mysteryStorageKeys.ending,
    JSON.stringify({ opened: endingState.opened })
  );
}

function renderEnding() {
  if (!endingRoot) return;

  const wrapper = document.createElement("div");
  wrapper.className = "ending-experience";

  if (!endingState.opened) {
    const envelope = document.createElement("button");
    envelope.type = "button";
    envelope.className = "sealed-envelope";
    envelope.setAttribute("aria-expanded", "false");
    envelope.setAttribute("aria-controls", "ending-letter");
    envelope.innerHTML = `
      <span class="envelope-flap" aria-hidden="true"></span>
      <span class="wax-seal" aria-hidden="true">P &amp; S</span>
      <strong>Bryt sigillet</strong>
    `;
    envelope.addEventListener("click", () => openEnvelope(envelope));
    wrapper.appendChild(envelope);
  } else {
    wrapper.appendChild(createLetter());
  }

  endingRoot.replaceChildren(wrapper);
}

function openEnvelope(envelope) {
  if (endingState.opened) return;

  endingState.opened = true;
  saveEndingState();
  envelope.disabled = true;
  envelope.classList.add("is-opening");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(() => {
    renderEnding();
    document.querySelector(".ending-letter")?.focus({ preventScroll: true });
  }, reducedMotion ? 0 : 700);
}

function createLetter() {
  const letter = document.createElement("article");
  letter.id = "ending-letter";
  letter.className = "ending-letter";
  letter.tabIndex = -1;
  letter.innerHTML = `
    <p class="letter-kicker">En sista sak återstår</p>
    <div class="chess-piece-row" aria-label="Kung, drottning, löpare, riddare, torn och bonde">
      <span aria-hidden="true">♚</span>
      <span aria-hidden="true">♛</span>
      <span aria-hidden="true">♝</span>
      <span aria-hidden="true">♞</span>
      <span aria-hidden="true">♜</span>
      <span aria-hidden="true">♟</span>
    </div>
    <p>Se efter om någon av schackpjäserna <strong>kung, drottning, löpare, riddare, torn eller bonde</strong> saknas från brudparets bord.</p>
    <p>Om en pjäs saknas får <strong>högst en person per bord</strong> gå till schackbrädet i andra änden av lokalen och hämta den saknade pjäsen.</p>
    <p>Ställ den diskret på brudparets bord.</p>
    <p class="letter-reward">När pjäsen står på plats väntar ett pris till hela bordet.</p>
  `;
  return letter;
}

Mystery.decorateLinks();
