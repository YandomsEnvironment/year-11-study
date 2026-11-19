# Recall

A local adaptive study desk for Year 11 in 2027 and HSC in 2028.

## Open the app

Double-click **Start Recall.cmd** in the parent study folder. Requires Node.js 24 or later. The launcher opens http://127.0.0.1:4317 and keeps the local backend running without a terminal window. Reopening the launcher reuses a running instance.

Prepared foundation exercises work immediately. In **Settings**, add an OpenAI API key and choose Connect tutor to enable generated syllabus questions, contextual marking and photographs. API billing applies. The default model is `gpt-5.4-mini`, and the model and daily request limit are configurable. No key is bundled. Live AI is unverified until tested with your connection.

The daily interface shows only the next useful task. **Help me** starts with a hint and changes to **Explain this**. Incorrect answers automatically receive a hint; **I haven’t learned this** opens teaching. Technical options, curriculum details and backup controls are collapsed. Tutor setup now saves and tests the key with one **Connect tutor** button.

Sessions pause automatically when you leave the study view or switch away from the app. Drafts remain in place. Progress is shown per subject first; detailed skills are available when requested. Automatic local backups retain the seven most recent backup days under `data/backups/`, without API credentials.

## Study routine

Choose Start studying. Sessions start around 30 minutes and can be paused, finished or extended. Reviews are capped so missed days do not create compulsory catch-up. Incorrect or partial answers lead to hints, explanations and a fresh retry. Independent correct answers lead to a fresh application check. Retention requires independent evidence across different days and questions; hints and explanations do not award it.

Open **Session options** to change the duration or start a session focused on one enabled subject. The offline question bank includes foundation exercises and a Year 11 starter set for each of the six syllabus subjects. **Progress** shows review dates, recent independent results and session recaps. If tutor marking is unavailable, choose **Mark later** and retry from **Progress → Awaiting marking**.

Choose **System**, **Light** or **Dark** under **Settings → Appearance**. The browser remembers your selection.

Typing and JPG/PNG/WebP working photos are supported. Read and correct the photo transcription before marking. If marking is uncertain, mastery is unchanged. “This marking doesn’t seem right” excludes that answer from progress. An English paragraph is never automatically graded from keywords in prepared mode.

### Dictating while working on paper

Click **Dictate** below the answer box and allow your browser to use the microphone. Talk through your paper working. The app appends recognised speech to your existing answer and shows unfinished words separately. **Enter** stops capture, waits for the final words and checks the answer. **Esc** or **Stop dictation** stops capture so you can edit first. After dictating, Enter checks your edited answer too, and Shift + Enter adds a new line. A restored dictated draft keeps its dictation status for marking.

The microphone stops when you leave the study view, pause, submit, change questions or switch away from the app. It never starts automatically. Your browser supplies speech recognition (including Australian English); browser support varies, and some browsers send audio to an online speech service. Google Chrome is a suitable fallback if the in-app browser cannot provide recognition. Recall saves the text, not microphone recordings. No OpenAI key is needed for browser dictation; live contextual marking still uses the configured tutor connection.

For numerical questions, explicit endings such as “my final answer is six” or “speed equals eight metres per second” are recognised by prepared marking. The original spoken working is retained. More complex spoken algebra and reasoning use contextual AI marking when connected; ambiguous work does not earn mastery automatically.

The app balances up to two subjects per session, using reviews, prerequisite gaps, weak skills, recent coverage and optional assessment deadlines. Turn off Extension 1 in Settings if you drop it. TAFE remains pending until the exact qualification and units are verified. Software Engineering is confirmed through Sydney Distance Education High School. Information and Digital Technology is the intended TAFE course; the place is not yet confirmed. English starts with transferable skills and original passages until your chosen texts are known.

## Data and source material

- `data/recall.sqlite`: sessions, questions, submissions, drafts, progress evidence, photos and usage. The app binds only to loopback and rejects cross-origin requests.
- `data/secrets.json`: API key used only by the backend, ignored by Git and excluded from backup exports. It is a local file, not an encrypted credential vault; protect your Windows account. The environment variable `OPENAI_API_KEY` is also supported.
- Settings → export/import backs up learning data, including submitted photos. Import merges records by ID; export a backup before importing an older one.
- `content/curriculum.json`: unabridged source paragraph imports from the six relevant NESA syllabuses, preserving versions and outcome codes. Mathematics Advanced is compiled from official digital pages because the NESA Word generator failed. Official source links remain the authority for updates.
- Prepared tasks, generated questions and prerequisite mappings are labelled separately from official curriculum. The syllabus is an outline of requirements, not a textbook; teaching uses authored material and the AI’s general educational knowledge with the syllabus context supplied.

Old 2017 Biology/Physics documents are excluded. Reimport sources with `npm run import:curriculum` after replacing source files, then restart the app. Source documents stay in the parent subject folders.

## Development and checks

`npm install`, `npm run build`, `npm test`, then `npm start`. If no built frontend exists, the server uses Vite middleware for development. `PORT` can select another port for development (the Windows launcher uses 4317). Test databases use temporary directories and do not affect your study history.

The scheduler is deterministic; AI cannot directly change mastery or choose arbitrary database updates. AI requests use the Responses API with schema validation, and failed marking retains the submission for retry. Code answers are assessed as text and are never executed.

## Limits

No app can guarantee a complete measure of understanding or official HSC marks. Scheduling intervals (1, 3, 7, 14, 30 days) are practical defaults. Student confidence is not treated as evidence. No school portal integrations, automatic background reminders, hosted sync or code execution are included.
