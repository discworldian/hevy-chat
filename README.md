# Hevy Chat

Hevy Chat analyses your Hevy workout logs, suggests progressive overload adjustments, and projects an 8-week training plan. Home vs. Gym context-aware. Double-progression logic backed by strength-training research.

## Installation

Requires [Node.js](https://nodejs.org/) 18+.

**Get your Hevy API key** from https://hevy.com/settings?developer (requires Hevy Pro).

```sh
cd backend
cp .env.example .env
# Edit .env and paste your HEVY_API_KEY
npm install

cd ../frontend
npm install
```

## Running

### Quick start (Windows)

From the hevy-chat folder, run:

```powershell
.\start.ps1
```

This opens two PowerShell windows and starts both services automatically.

### Manual (Two terminals)

**Terminal 1:**
```sh
cd backend && npm run dev
```

**Terminal 2:**
```sh
cd frontend && npm run dev
```

---

Open **http://localhost:5173** in your browser.
