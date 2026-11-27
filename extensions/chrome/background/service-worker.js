chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get(["maxPages", "delayMs"]);
  if (settings.maxPages === undefined) {
    await chrome.storage.local.set({ maxPages: 20 });
  }
  if (settings.delayMs === undefined) {
    await chrome.storage.local.set({ delayMs: 800 });
  }
});

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

async function getState() {
  const { crawlState } = await chrome.storage.session.get("crawlState");
  return crawlState || null;
}

async function setState(crawlState) {
  await chrome.storage.session.set({ crawlState });
}

function collectSameOriginLinks(origin) {
  const originUrl = new URL(origin);
  return [...document.querySelectorAll("a[href]")]
    .map((anchor) => {
      try {
        const link = new URL(anchor.href);
        link.hash = "";
        return link.origin === originUrl.origin &&
          ["http:", "https:"].includes(link.protocol)
          ? link.href
          : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function scanActivePage() {
  const state = await getState();
  if (!state?.running || state.tabId === undefined) {
    return;
  }

  const [{ result: links = [] } = {}] = await chrome.scripting.executeScript({
    target: { tabId: state.tabId },
    func: collectSameOriginLinks,
    args: [state.origin],
  });

  const tab = await chrome.tabs.get(state.tabId);
  const currentUrl = normalizeUrl(tab.url);
  if (!currentUrl) {
    await stopCrawl();
    return;
  }

  const visited = new Set(state.visited);
  visited.add(currentUrl);

  const queued = new Set(state.queue);
  for (const link of links) {
    const normalized = normalizeUrl(link);
    if (normalized && !visited.has(normalized) && !queued.has(normalized)) {
      state.queue.push(normalized);
    }
  }

  const updated = {
    ...state,
    visited: [...visited],
    visitedCount: visited.size,
  };

  if (updated.visitedCount >= state.maxPages || updated.queue.length === 0) {
    updated.running = false;
    await setState(updated);
    return;
  }

  const nextUrl = updated.queue.shift();
  await setState(updated);

  const settings = await chrome.storage.local.get("delayMs");
  await new Promise((resolve) => setTimeout(resolve, settings.delayMs || 800));
  const latestState = await getState();
  if (latestState?.running && latestState.tabId === updated.tabId) {
    await chrome.tabs.update(updated.tabId, { url: nextUrl });
  }
}

async function stopCrawl() {
  const state = await getState();
  if (state) {
    await setState({ ...state, running: false });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "stop-crawl") {
    stopCrawl().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "start-crawl") {
    startCrawl().then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: error.message }),
    );
    return true;
  }
});

async function startCrawl() {
  await stopCrawl();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("巡回対象のタブが見つかりません。");
  }

  let origin;
  try {
    origin = new URL(tab.url).origin;
  } catch {
    throw new Error("このページは巡回できません。");
  }
  if (!["http:", "https:"].includes(new URL(tab.url).protocol)) {
    throw new Error("HTTPまたはHTTPSのページを開いてください。");
  }

  const settings = await chrome.storage.local.get(["maxPages", "delayMs"]);
  await setState({
    running: true,
    tabId: tab.id,
    origin,
    maxPages: settings.maxPages || 20,
    visited: [],
    visitedCount: 0,
    queue: [],
  });

  await scanActivePage();
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  getState().then((state) => {
    if (state?.running && state.tabId === tabId) {
      scanActivePage();
    }
  });
});
