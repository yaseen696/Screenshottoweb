require("dotenv").config();
const express = require("express");
const cors = require("cors");
const generateRoute = require("./routes/generate");

const app = express();

// Allow requests from the Chrome Extension
app.use(cors());

// Increase limit since we're sending base64 screenshots (can be large)
app.use(express.json({ limit: "15mb" }));

app.get("/", (req, res) => {
  res.send("Screenshot-to-Website backend is running.");
});

app.use("/generate", generateRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
