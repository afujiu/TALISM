const openOptionsButton = document.querySelector("#open-options");
const startButton = document.querySelector("#start-crawl");
const stopButton = document.querySelector("#stop-crawl");
const statusElement = document.querySelector("#status");
const progressElement = document.querySelector("#progress");

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

startButton.addEventListener("click", async () => {
  statusElement.textContent = "巡回を開始しています...";
  const response = await chrome.runtime.sendMessage({ type: "start-crawl" });
  if (!response?.ok) {
    statusElement.textContent = response?.error || "巡回を開始できませんでした。";
  }
});

stopButton.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "stop-crawl" });
});

async function refreshState() {
  const { crawlState } = await chrome.storage.session.get("crawlState");
  const running = crawlState?.running === true;
  startButton.hidden = running;
  stopButton.hidden = !running;
  statusElement.textContent = running ? "巡回中です。" : "巡回を開始できます。";

  if (running) {
    progressElement.textContent =
      `巡回済み: ${crawlState.visitedCount} / 待機中: ${crawlState.queue.length}`;
  } else {
    progressElement.textContent = crawlState?.visitedCount
      ? `巡回済み: ${crawlState.visitedCount}`
      : "";
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes.crawlState) {
    refreshState();
  }
});

refreshState();
