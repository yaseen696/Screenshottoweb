// Backend server URL - change this when you deploy
const BACKEND_URL = "http://localhost:5000/generate";

const captureBtn = document.getElementById("captureBtn");
const captureFullBtn = document.getElementById("captureFullBtn");
const generateBtn = document.getElementById("generateBtn");
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const resultBox = document.getElementById("resultBox");
const codeOutput = document.getElementById("codeOutput");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

let capturedImageData = null; // base64 screenshot
let generatedCode = "";

// Step 1: Capture screenshot of the active tab
captureBtn.addEventListener("click", () => {
  status.textContent = "Capturing...";
  chrome.runtime.sendMessage({ action: "capture" }, (response) => {
    if (response && response.dataUrl) {
      capturedImageData = response.dataUrl;
      preview.src = capturedImageData;
      preview.style.display = "block";
      generateBtn.disabled = false;
      status.textContent = "Screenshot captured. Ready to generate.";
    } else {
      status.textContent = "Capture failed. Try again.";
    }
  });
});

// Step 1b: Capture the FULL scrollable page (scrolls automatically,
// stitches multiple screenshots into one tall image)
captureFullBtn.addEventListener("click", () => {
  status.textContent = "Capturing full page... please don't scroll or click";
  captureFullBtn.disabled = true;
  captureBtn.disabled = true;

  chrome.runtime.sendMessage({ action: "captureFullPage" }, (response) => {
    captureFullBtn.disabled = false;
    captureBtn.disabled = false;

    if (response && response.dataUrl) {
      capturedImageData = response.dataUrl;
      preview.src = capturedImageData;
      preview.style.display = "block";
      generateBtn.disabled = false;
      status.textContent = "Full page captured. Ready to generate.";
    } else {
      status.textContent =
        "Full page capture failed: " + (response?.error || "unknown error");
    }
  });
});

// Step 2: Send screenshot to backend for AI code generation
generateBtn.addEventListener("click", async () => {
  if (!capturedImageData) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  status.textContent = "Generating code with AI... please wait";
  generateBtn.disabled = true;

  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: capturedImageData,
        mode: mode
      })
    });

    if (!res.ok) throw new Error("Backend error: " + res.status);

    const data = await res.json();
    generatedCode = data.code || "// No code returned";

    codeOutput.value = generatedCode;
    resultBox.style.display = "block";
    status.textContent = "Code generated successfully!";
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + err.message;
  } finally {
    generateBtn.disabled = false;
  }
});

// Copy code to clipboard
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(generatedCode).then(() => {
    status.textContent = "Copied to clipboard!";
  });
});

// Download code as a file
downloadBtn.addEventListener("click", () => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const ext = mode === "react" ? "jsx" : "html";
  const blob = new Blob([generatedCode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: `generated-code.${ext}`
  });
});
