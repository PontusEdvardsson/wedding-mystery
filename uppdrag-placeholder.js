const stepId = document.body.dataset.stepId;
const step = Mystery.getStep(stepId);
Mystery.renderGate(stepId, {
  onOpen(openStep) {
    document.querySelector("[data-placeholder-clue]").textContent = openStep.clue;
    document.querySelector("[data-placeholder-answer]").textContent = openStep.answer;
    renderTestTools(openStep);

    if (Mystery.isComplete(openStep.id)) {
      Mystery.renderNextAction(openStep.id);
    }
  },
});

function renderTestTools(openStep) {
  const container = document.querySelector("[data-test-tools]");

  if (!container) return;

  if (!Mystery.isPreview()) {
    container.remove();
    return;
  }

  container.className = "test-tools";
  container.innerHTML = `
    <p>Testverktyg – visas endast i preview-läge</p>
    <button class="primary-action button-action" type="button" data-complete-placeholder>
      Markera uppdraget som löst
    </button>
  `;

  const completeButton = container.querySelector("[data-complete-placeholder]");
  completeButton.addEventListener("click", () => {
    Mystery.markComplete(openStep.id);
    Mystery.renderNextAction(openStep.id);
    completeButton.textContent = "Uppdraget är löst";
    completeButton.disabled = true;
  });

  if (Mystery.isComplete(openStep.id)) {
    completeButton.textContent = "Uppdraget är löst";
    completeButton.disabled = true;
  }
}
