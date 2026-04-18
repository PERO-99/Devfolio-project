# Devfolio-project

> AI-powered scam detection workspace for web/text/image/video inputs, with a React dashboard, FastAPI backend, and Chrome extension integration.

Devfolio-project (internally branded in code as **VERITAS X**) helps detect suspicious or dangerous scam content using rule-based analysis plus optional local LLM explanations (Ollama). It supports live detection feeds, risk scoring, and explainable verdicts.

## Current Status

**Work in progress.** Core frontend/backend flows are functional, but parts of the repository are still in active development.

## Key Features

- **Multimodal scan studio** for URL, text, image, and video checks
- **FastAPI analysis API** with endpoints for text/web, image, and video analysis
- **Realtime updates** via WebSocket stream (`/ws`)
- **Dashboard + analytics UI** (live feed, trends, charts, filters)
- **Optional MongoDB persistence** with in-memory fallback
- **Optional Ollama integration** for richer AI-generated explanations
- **Chrome extension** for page/selection/capture-based scans

## Tech Stack

### Frontend
- React 19
- Vite 8
- Tailwind CSS
- Recharts, Framer Motion, React Router

### Backend
- Python 3.10+
- FastAPI + Uvicorn
- Pydantic
- PyMongo (optional persistence)

### Services / Integrations
- MongoDB (optional)
- Ollama (optional, local LLM)
- Chrome Extension (Manifest V3)

## Repository Structure

```text
Devfolio-project/
├── README.md
└── RUNGTA MLH/
    ├── frontend/            # React + Vite dashboard/web app
    ├── backend/             # FastAPI API + analysis engines
    └── extension/           # Chrome extension (MV3)
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- (Optional) **MongoDB** running locally
- (Optional) **Ollama** running locally
- (Optional) **Google Chrome** for extension testing

## Local Development Setup

### 1) Backend setup

```bash
cd "RUNGTA MLH/backend"
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8010
```

Backend URLs:
- API base: `http://127.0.0.1:8010`
- Health check: `http://127.0.0.1:8010/health`
- WebSocket: `ws://127.0.0.1:8010/ws`

### 2) Frontend setup

```bash
cd "RUNGTA MLH/frontend"
npm ci
npm run dev
```

Default dev URL: `http://localhost:5173`

### 3) (Optional) Chrome extension setup

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:
   - `<repo-root>/RUNGTA MLH/extension`

> The extension is configured to call backend at `http://127.0.0.1:8010`.

## Configuration

The project can run with defaults, but you can customize behavior via environment variables.

### Backend environment variables

`RUNGTA MLH/backend/.env.example`

```env
# Database
MONGO_URI=mongodb://localhost:27017
MONGO_DB=veritas_x
DEDUPE_WINDOW_SECONDS=30

# Demo data/live demo alerts
DEMO_MODE=1

# Optional Ollama integration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=6
```

### Frontend environment variables

`RUNGTA MLH/frontend/.env.example`

```env
VITE_API_BASE_URL=http://127.0.0.1:8010
VITE_WS_BASE_URL=ws://127.0.0.1:8010
```

## Usage

1. Start backend (`:8010`)
2. Start frontend (`:5173`)
3. Open frontend and log in (demo-style auth flow)
4. Go to **Scan** and submit URL/text/image/video input
5. Review verdict, risk score, confidence, and explanation
6. Monitor live detections and stats in **Dashboard / Trends / Analytics**

## Build / Deploy

### Frontend production build

```bash
cd "RUNGTA MLH/frontend"
npm run build
npm run preview
```

### Backend (production-style run)

```bash
cd "RUNGTA MLH/backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8010
```

## Development Notes

- Existing frontend lint configuration currently reports pre-existing issues in the codebase.
- No dedicated automated test suite is currently configured in this repository.

## Contributing

1. Fork the repository
2. Create a branch from latest default branch, e.g.:
   - `feature/<short-description>`
   - `fix/<short-description>`
   - `docs/<short-description>`
3. Make focused, minimal changes
4. Run available checks (`npm run build`, and `npm run lint` where applicable)
5. Open a Pull Request with:
   - Clear summary
   - Screenshots/GIFs for UI changes
   - Testing notes

## License

**No license specified** (no root license file is currently present).

## Credits / Acknowledgements

- Built under the **Devfolio-project** repository
- Includes **MLH-themed project structure** (`RUNGTA MLH`)
- Uses excellent open-source tooling from the React, Vite, FastAPI, and broader OSS ecosystem
