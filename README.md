# Content Plan (Meri's Content Studio)

A lightweight content calendar and generation workspace built with plain HTML/CSS/JS, an Express API, and SQLite persistence.

## What this project does

- Provides a month-view content calendar for multiple accounts.
- Lets you draft/generate post content for different platforms.
- Supports scheduling, editing, moving, duplicating, and deleting posts.
- Saves data locally in the browser and syncs to a local SQLite-backed API.
- Supports backup export and restore per user ID.

## Tech stack

- Frontend: single `index.html` file (vanilla JS + inline styles)
- Backend: Node.js + Express (`server.js`)
- Database: SQLite via `better-sqlite3`

## Requirements

- Node.js 18+ recommended
- npm

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open in browser:

```text
http://localhost:8787
```

## Available scripts

- `npm run dev` - starts the server locally
- `npm start` - starts the server locally
- `npm test` - placeholder script (no test suite configured)

## Data and storage

- SQLite database path: `data/content-studio.db`
- Tables:
  - `users` (user IDs)
  - `posts` (scheduled content entries)
- Browser also stores:
  - `meri_posts` (local cache of posts)
  - `meri_user_id` (active cloud user ID)

## API overview

All user-scoped endpoints accept `x-user-id` (or `userId`) and normalize it to lowercase `a-z`, `0-9`, `_`, `-`.

- `GET /api/health` - health check and DB info
- `GET /api/posts` - fetch grouped posts for a user
- `PUT /api/posts` - replace all posts for a user
- `GET /api/backup/export` - export user backup JSON
- `POST /api/backup/import` - import backup JSON

## Project structure

- `index.html` - complete UI and client logic
- `server.js` - API server + SQLite schema initialization
- `data/` - runtime database files (created automatically)

## Notes

- The frontend currently calls Anthropic directly for content generation from the browser.
- If generation fails, calendar management and local/cloud scheduling features still work.
