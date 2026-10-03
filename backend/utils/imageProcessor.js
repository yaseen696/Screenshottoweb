// Strips the "data:image/png;base64," prefix so we can pass raw base64
// data to the Gemini API, and detects the mime type.

function parseBase64Image(dataUrl) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data format");
  }
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

module.exports = { parseBase64Image };
