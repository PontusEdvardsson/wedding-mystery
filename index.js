Mystery.updateProgressSummary();

const action = document.querySelector("[data-primary-action]");
const chapterList = document.querySelector("[data-chapter-list]");
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
  chapterList.replaceChildren(
    ...playableSteps.map((step, index) => {
      const item = document.createElement("li");
      const isComplete = Mystery.isComplete(step.id);
      const isAvailable = Mystery.canOpenStep(step).canOpen;

      item.className = "chapter-item";
      item.innerHTML = `
        <span>${index + 1}</span>
        <strong>${step.title}</strong>
        <em>${isComplete ? "Klar" : isAvailable ? "Tillgänglig" : "Låst"}</em>
      `;

      return item;
    })
  );
}
