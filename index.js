const action = document.querySelector("[data-primary-action]");
const chapterList = document.querySelector("[data-chapter-list]");
const homeCountdown = document.querySelector("[data-home-countdown]");
const homeCountdownLabel = document.querySelector("[data-home-countdown-label]");
const playableSteps = mysterySteps.filter((step) => !step.ending);
const started = Boolean(Mystery.readProgress().startedAt);
const allDone = playableSteps.every((step) => Mystery.isComplete(step.id));

if (action) {
  action.href = Mystery.linkTo(Mystery.getBestResumePage());
  action.textContent = allDone
    ? "Öppna brevet"
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
      const canNavigate = isComplete || isAvailable;
      const status = isComplete ? "Klar" : isAvailable ? "Tillgänglig" : "Låst";
      const content = `
        <span>${stepNumber}</span>
        <em>${status}</em>
        ${canNavigate ? '<strong aria-hidden="true">›</strong>' : ""}
      `;

      item.className = "chapter-item";

      if (canNavigate) {
        const link = document.createElement("a");
        link.className = "chapter-link";
        link.href = Mystery.linkTo(step.page);
        link.setAttribute("aria-label", `${status}: uppdrag ${stepNumber}`);
        link.innerHTML = content;
        item.appendChild(link);
      } else {
        item.classList.add("is-static");
        item.innerHTML = content;
      }

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
    if (homeCountdownLabel) {
      homeCountdownLabel.hidden = true;
    }
    homeCountdown.innerHTML = `
      <span class="countdown-ready">
        <small>Alla ledtrådar är funna</small>
        <strong>Ett sista meddelande väntar</strong>
      </span>
    `;
    return;
  }

  if (homeCountdownLabel) {
    homeCountdownLabel.hidden = false;
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
    ["dag", "dagar", days],
    ["timme", "timmar", hours],
    ["minut", "minuter", minutes],
    ["sekund", "sekunder", seconds],
  ];

  homeCountdown.replaceChildren(
    ...units.map(([singular, plural, value]) => {
      const item = document.createElement("span");
      item.className = "countdown-unit";
      item.innerHTML = `
        <strong>${String(value).padStart(2, "0")}</strong>
        <em>${value === 1 ? singular : plural}</em>
      `;
      return item;
    })
  );
}

updateHomeCountdown();
setInterval(updateHomeCountdown, 1000);
