const maxPagesInput = document.querySelector("#max-pages");
const delayMsInput = document.querySelector("#delay-ms");
const savedStatus = document.querySelector("#saved");

chrome.storage.local.get(
  { maxPages: 20, delayMs: 800 },
  ({ maxPages, delayMs }) => {
    maxPagesInput.value = maxPages;
    delayMsInput.value = delayMs;
  },
);

async function saveOptions() {
  await chrome.storage.local.set({
    maxPages: Math.min(500, Math.max(1, Number(maxPagesInput.value) || 20)),
    delayMs: Math.min(60000, Math.max(0, Number(delayMsInput.value) || 0)),
  });
  savedStatus.textContent = "保存しました";
}

maxPagesInput.addEventListener("change", saveOptions);
delayMsInput.addEventListener("change", saveOptions);
