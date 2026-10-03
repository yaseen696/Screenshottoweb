const { parseBase64Image } = require("../utils/imageProcessor");

// Mistral's vision-capable model. Free tier ("Experiment" plan) has a very
// generous per-minute token budget compared to other free-tier vision APIs,
// so this uses a single combined call instead of a multi-pass pipeline.
const MODEL_NAME = "pixtral-12b-2409";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

function stripFences(text) {
  return text.replace(/```(html|jsx|javascript|css)?/gi, "").trim();
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function cleanOutput(text) {
  return stripFences(stripThinking(text || ""));
}

function buildHtmlPrompt() {
  return `You are an expert frontend developer. Analyze the attached webpage
screenshot carefully. Identify the layout structure, UI components (navbar,
hero section, cards, buttons, forms, footer, etc.), colors, spacing, fonts,
and alignment. Reconstruct a visually similar, clean, semantic frontend
implementation. Do not copy any real backend logic or private data - only
recreate the visual UI.

Pay close attention to icon groups (e.g. navbar action icons): match the
EXACT NUMBER and ORDER of icons visible in the screenshot, even if you are
unsure what each icon represents - do not add extra icons or omit any. For
checkboxes, toggles, or radio buttons, match their visual state exactly as
shown (checked/filled vs unchecked/empty) using the appropriate HTML
attribute.

For any icons (GitHub, social, menu, theme toggle, search, etc.), use a
Unicode symbol character instead of <svg> or <img> placeholders, since those
render as nothing without real asset files. Each icon should appear in the
HTML/CSS exactly ONCE - do not add the same icon both as a CSS
::before/::after AND as a separate HTML element, as this causes duplicate
icons. Style checkboxes to match the screenshot's color (use the
accent-color CSS property) rather than leaving them as unstyled default
browser checkboxes.

Return ONLY complete HTML with an embedded <style> tag containing the CSS.
Do not include explanations, markdown fences, or extra text - return raw
HTML only.`;
}

function buildReactPrompt() {
  return `You are an expert frontend developer. Analyze the attached webpage
screenshot carefully. Identify the layout structure, UI components (navbar,
hero section, cards, buttons, forms, footer, etc.), colors, spacing, fonts,
and alignment. Reconstruct a visually similar, clean, semantic frontend
implementation. Do not copy any real backend logic or private data - only
recreate the visual UI. For any icons, use a Unicode symbol character instead
of <svg> or <img> placeholders.

Return ONLY a single React functional component (JSX) using inline Tailwind
CSS classes for styling. Do not include explanations, markdown fences, or
extra text - return raw JSX code only.`;
}

async function generateCodeFromImage(imageDataUrl, mode) {
  const { mimeType, base64Data } = parseBase64Image(imageDataUrl);
  const promptText = mode === "react" ? buildReactPrompt() : buildHtmlPrompt();

  const response = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: `data:${mimeType};base64,${base64Data}`
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 6000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rawCode = data.choices?.[0]?.message?.content || "";

  return cleanOutput(rawCode);
}

module.exports = { generateCodeFromImage };