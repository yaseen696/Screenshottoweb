const express = require("express");
const router = express.Router();
const { generateCodeFromImage } = require("../controllers/aiController");

// POST /generate
// Body: { image: "data:image/png;base64,....", mode: "html" | "react" }
router.post("/", async (req, res) => {
  try {
    const { image, mode } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const code = await generateCodeFromImage(image, mode || "html");
    res.json({ code });
  } catch (err) {
    console.error("Generation error:", err.message);
    res.status(500).json({ error: "Failed to generate code" });
  }
});

module.exports = router;
