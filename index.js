const action = document.querySelector("[data-primary-action]");
const chapterList = document.querySelector("[data-chapter-list]");
const homeCountdown = document.querySelector("[data-home-countdown]");
const playableSteps = mysterySteps.filter((step) => step.id !== "final");
const started = Boolean(Mystery.readProgress().startedAt);
const allDone = playableSteps.every((step) => Mystery.isComplete(step.id));

if (action) {
  action.href = Mystery.linkTo(Mystery.getBestResumePage());
  action.textContent = allDone
    ? "Återvänd till finalen"
    : started
      ? "Fortsätt mysteriet"
      : "Börja mysteriet";
}

if (chapterList) {
  const firstIncompleteIndex = playableSteps.findIndex((step) => !Mystery.isComplete(step.id));
  const visibleSteps = playableSteps.filter((step, index) => {
    return Mystery.isComplete(step.id) || index === firstIncompleteIndex;
  });

  chapterList.replaceChildren(
    ...visibleSteps.map((step) => {
      const item = document.createElement("li");
      const stepNumber = playableSteps.findIndex((candidate) => candidate.id === step.id) + 1;
      const isComplete = Mystery.isComplete(step.id);
      const isAvailable = Mystery.canOpenStep(step).canOpen;

      item.className = "chapter-item";
      item.innerHTML = `
        <span>${stepNumber}</span>
        <em>${isComplete ? "Klar" : isAvailable ? "Tillgänglig" : "Låst"}</em>
      `;

      return item;
    })
  );
}

function updateHomeCountdown() {
  if (!homeCountdown) return;

  const nextHintStep = playableSteps.find(
    (step) => step.hintUnlockAt && !Mystery.isHintUnlocked(step)
  );

  if (!nextHintStep) {
    homeCountdown.innerHTML = `<span class="countdown-ready">Alla ledtrådar väntar</span>`;
    return;
  }

  const hintDate = new Date(nextHintStep.hintUnlockAt);
  const diff = Math.max(0, hintDate.getTime() - Date.now());

  if (diff <= 0) {
    homeCountdown.innerHTML = `<span class="countdown-ready">Ledtråden väntar</span>`;
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const units = [
    ["dagar", days],
    ["timmar", hours],
    ["minuter", minutes],
    ["sekunder", seconds],
  ];

  homeCountdown.replaceChildren(
    ...units.map(([label, value]) => {
      const item = document.createElement("span");
      item.className = "countdown-unit";
      item.innerHTML = `
        <strong>${String(value).padStart(2, "0")}</strong>
        <em>${label}</em>
      `;
      return item;
    })
  );
}

updateHomeCountdown();
setInterval(updateHomeCountdown, 1000);
