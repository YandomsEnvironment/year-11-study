# Year 11 & 12 Study Workspace

A comprehensive NSW Year 11 (2027) and HSC (2028) curriculum repository and local adaptive study desk (**Recall**).

---

## Workspace Structure

### 1. Official Curriculum Folders
Each folder contains current NESA syllabus documents, support materials, and verified course links:
- **`Biology/`** — Current 2025 syllabus and reference copies.
- **`English Standard/`** — Official NESA syllabus and course outline.
- **`Mathematics Advanced/`** — Full official digital syllabus compilation and resolved mathematical content.
- **`Mathematics Extension 1/`** — Advanced extension syllabus and support documentation.
- **`Physics/`** — Current 2025 syllabus and reference copies.
- **`Software - TAFE/`** — Curriculum notes for Information and Digital Technology.
- **`Software Engineering - Distance Education/`** — Sydney Distance Education High School course materials.

### 2. Recall Study Application (`study-app/`)
A personal, adaptive local study desk designed for focused daily learning:
- **Calm, paper-like interface** built with React, Vite, and Node.js.
- **Adaptive scheduling** (spaced repetition at 1, 3, 7, 14, 30-day intervals) balancing up to two subjects per session.
- **Voice-to-text dictation** for speaking through mathematical and scientific reasoning while working on physical paper.
- **Prepared foundation tasks & offline practice** available out-of-the-box.
- **Optional AI Tutor connection** via OpenAI API for contextual marking, question generation, and working photograph transcription.
- **Privacy-first & local-first**: all study progress, database files (`recall.sqlite`), and API secrets remain strictly on your local machine and are excluded from Git tracking.

---

## Quick Start

### Running Recall on Windows
Double-click **`Start Recall.cmd`** in the repository root. This launches the local server (port `4317`) and automatically opens the app in your default browser without keeping a terminal window open.

### Running from Command Line
```powershell
cd study-app
npm install
npm run build
npm start
```
Then visit [http://127.0.0.1:4317](http://127.0.0.1:4317).

### Running Tests
```powershell
cd study-app
npm test
```

---

## Configuration & Data Privacy

- **Database**: Local SQLite database located at `study-app/data/recall.sqlite` (auto-created on first run, gitignored).
- **API Secrets**: If using AI tutoring, add your OpenAI API key in **Settings → Connect tutor** (saved locally to `study-app/data/secrets.json`, gitignored) or set the `OPENAI_API_KEY` environment variable.
- **Backups**: Seven rolling daily backups are automatically saved under `study-app/data/backups/`.

---

## License

Personal educational study and revision workspace. Syllabus materials remain copyright of the NSW Education Standards Authority (NESA).
