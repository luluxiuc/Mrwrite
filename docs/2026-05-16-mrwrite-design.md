# MrWrite Design Spec

## Context

MrWrite is a local-first, skill-driven AI writing agent. Users launch it via terminal (`mrwrite`) and interact through a web browser. The core philosophy: **skills run locally, the browser is just a visual interaction layer** — similar to how Claude Code / OpenClaw separate engine from UI.

## Architecture

### System Layers

```
CLI Launcher (mrwrite)
  → Next.js Server (API Routes + Static Frontend)
    → Skill Engine (loads/executes skills)
      → LLM Proxy (OpenAI-compatible API)
        → User's own LLM (OpenAI / Claude / DeepSeek / Ollama / ...)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Editor | TipTap (ProseMirror-based) |
| UI | Tailwind CSS + shadcn/ui |
| LLM | OpenAI-compatible API (provider-agnostic) |
| Storage | Local filesystem (Markdown) + SQLite (better-sqlite3) |
| Export | Pandoc (DOCX/PDF/EPUB) + client-side (HTML/TXT) |
| CLI | Node.js script + concurrently |

## UI Layout

Three-panel layout:
- **Left icon bar** (50px): Skill quick-launch icons, collapsible
- **Center**: TipTap editor, focus mode toggles full-width
- **Right panel**: AI chat/assistant panel, resizable
- All panels collapsible, drag-to-resize

## Skill System

### Skill Structure

Each skill is a folder under `.mrwrite/skills/<name>/`:

```
skill-name/
  SKILL.md      # Metadata + system prompt (required)
  patterns.json  # Detection rules (optional)
  script.ts      # Code execution (optional)
  config.json    # User-adjustable parameters (optional)
```

### Built-in Skills (from GitHub high-star projects)

| Skill | Reference | Method |
|-------|-----------|--------|
| humanizer | de-ai-ify (47 patterns) + Humanizer (7.2k★) | Code + rules |
| outline-generator | Writer's Loop + StoryCraftr | Code |
| chapter-manager | PlotPilot (611★) + Novel-OS | Code |
| style-transfer | TinyStyler (EMNLP) + EchoForge | Code |
| continuity-checker | SAGA + Novel-OS Guardian | Code + Prompt |
| quality-gate | Novel-OS (5 gates) + novel-creator-skill | Code + Prompt |

### Execution Flow

1. User selects text → picks a skill
2. Engine loads SKILL.md + rule files → builds System Prompt
3. Streams result from LLM → renders in editor
4. Quality gate scores output → auto-retry if below threshold
5. User accepts/edits/rejects → learning persists to `.mrwrite/prefs/`

## Data Model

- **Documents**: Stored as Markdown files in `~/mrwrite/workspace/`
- **Metadata**: SQLite database tracks document list, skill usage, preferences
- **API Keys**: `.env` file (never committed)
- **Exports**: Generated to `~/mrwrite/exports/`

## Export

- Markdown → DOCX/PDF/EPUB via Pandoc (backend)
- Markdown → HTML/TXT via client-side conversion
- Export presets configurable per document type

## Behavior Summary

1. User runs `mrwrite` in terminal
2. Server starts, browser opens to editor at localhost:3000
3. User configures LLM API key (stored in .env)
4. User writes or opens existing document
5. To use AI: select text, click skill icon or talk in AI panel
6. Skills execute on local machine, results stream into editor
7. Documents auto-save to local filesystem
8. Export via menu → Pandoc generates file in chosen format
