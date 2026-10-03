# Screenshot to Website - AI-Powered Chrome Extension

Captures a webpage screenshot and uses Gemini Vision to generate HTML/CSS or React code.

## Setup

### 1. Backend
```
cd backend
npm install
cp .env.example .env
# Paste your Gemini API key into .env (get one free at https://aistudio.google.com/apikey)
npm run dev
```
Server runs at http://localhost:5000

### 2. Chrome Extension
1. Open Chrome -> go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Pin the extension from the toolbar puzzle icon

### 3. Usage
1. Open any webpage
2. Click the extension icon
3. Click "Capture Screenshot"
4. Choose HTML/CSS or React mode
5. Click "Generate Code"
6. Copy or download the result

## Notes
- Backend must be running (`npm run dev`) before using the extension.
- Never commit `.env` - it contains your API key.
- Free tier Gemini API has rate limits - fine for FYP demo/testing.
