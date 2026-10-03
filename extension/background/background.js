// Background service worker (Manifest V3)
// Handles two kinds of capture requests from the popup:
// - "capture": a single screenshot of the visible viewport
// - "captureFullPage": scrolls through the whole page, takes a screenshot
//   at each scroll position, and stitches them into one tall image

const MAX_SLICES = 15; // safety cap so very long pages don't take forever
const CAPTURE_DELAY_MS = 500; // stay under Chrome's captureVisibleTab rate limit

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(dataUrl);
    });
  });
}

async function getPageMetrics(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      dpr: window.devicePixelRatio || 1
    })
  });
  return result;
}

async function scrollPageTo(tabId, y) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (scrollY) => window.scrollTo(0, scrollY),
    args: [y]
  });
}

function base64FromArrayBuffer(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function captureFullPage(tab) {
  const { scrollHeight, viewportHeight, viewportWidth, dpr } =
    await getPageMetrics(tab.id);

  const totalSlices = Math.min(
    Math.ceil(scrollHeight / viewportHeight),
    MAX_SLICES
  );

  const slices = [];

  for (let i = 0; i < totalSlices; i++) {
    // Clamp the last slice so we don't scroll past the bottom of the page
    const targetY = Math.min(i * viewportHeight, scrollHeight - viewportHeight);

    await scrollPageTo(tab.id, targetY);
    await delay(CAPTURE_DELAY_MS);

    const dataUrl = await captureVisibleTab(tab.windowId);
    slices.push({ dataUrl, y: targetY });
  }

  // Scroll back to the top so the page is left as the user found it
  await scrollPageTo(tab.id, 0);

  // Stitch all slices into one tall canvas
  const canvas = new OffscreenCanvas(
    viewportWidth * dpr,
    scrollHeight * dpr
  );
  const ctx = canvas.getContext("2d");

  for (const slice of slices) {
    const blob = await (await fetch(slice.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, slice.y * dpr);
  }

  const finalBlob = await canvas.convertToBlob({ type: "image/png" });
  const buffer = await finalBlob.arrayBuffer();
  const base64 = base64FromArrayBuffer(buffer);

  return `data:image/png;base64,${base64}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "capture") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        sendResponse({ error: "No active tab found" });
        return;
      }

      chrome.tabs.captureVisibleTab(
        activeTab.windowId,
        { format: "png" },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }
          sendResponse({ dataUrl });
        }
      );
    });

    return true;
  }

  if (request.action === "captureFullPage") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        sendResponse({ error: "No active tab found" });
        return;
      }

      captureFullPage(activeTab)
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((err) => {
          console.error(err);
          sendResponse({ error: err.message });
        });
    });

    return true;
  }
});
