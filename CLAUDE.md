# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run serve         # Dev server at http://localhost:8080 (PROD=0, no cache)
npm run build         # Production build to dist/ (PROD=1, 1d cache)
npm run test          # Build, then run the Playwright test suite against dist/
npm run test:nobuild  # Run the Playwright test suite against the existing dist/ (skips the rebuild)
npm run lint          # Run JS (eslint) + Markdown (markdownlint) linting
npm run format        # Auto-format with Prettier
```

Tests live in `tests/` and run against the built site (`dist/`) via a local `http-server`, not the dev server — see `playwright.config.js` for the webServer/port setup. Coverage includes:

- `tests/smoke.spec.js` — key pages (homepage, a song page, a project page, writing index + a post, events page) render without console errors and show expected content
- `tests/links.spec.js` — every internal `href` in the built HTML resolves to a real file in `dist/`
- `tests/seo.spec.js` — `robots.txt`/`sitemap.xml` are correct and pages set proper meta descriptions

`npm run test` always rebuilds first, so it reflects your latest changes; use `npm run test:nobuild` only when `dist/` is already current (e.g. re-running after a test-only edit). CI (`.github/workflows/build.yml`) lints, builds, caches the Playwright Chromium binary, installs it (with retries for system deps), and runs `npm run test:nobuild` against that build on every push/PR to `main`.

Always run `npm run lint && npm run format:check` before finalizing any changes. If `format:check` fails, run `npm run format` to auto-fix.

## URL stability — never break deployed URLs

**Once a URL has been deployed, it must never change.** This applies to all content: posts (`p/<slug>/`), songs, projects, and static assets. Renaming files, changing slugs, restructuring directories, or altering permalink patterns are all high-risk operations. If a structural change is unavoidable, add Eleventy redirects rather than removing the old URL.

### Previewing Claude worktree branches

To run a dev server for a Claude-managed worktree branch without checking it out, use the `serve-worktree` shell function (defined in `~/.bash_profile`):

```bash
serve-worktree claude/cranky-grothendieck-ec31fa
```

This serves the worktree from a deterministic port derived from the branch name (range 3000–9999), so multiple worktrees can run simultaneously. The port is printed on start.

## Architecture

This is an [Eleventy](https://www.11ty.dev/) static site. Source is in `src/`, output goes to `dist/`. Templates use Nunjucks (`.njk`). `eleventy.config.js` sets `markdownTemplateEngine: 'njk'`, intending for Markdown files to also run through Nunjucks, but the build currently processes them via Liquid instead (visible in the `npm run build` log, e.g. `(liquid)` next to each `.md` output) — see issue #50. Layouts and includes are both in `src/_layouts/`.

### Content collections

Three Eleventy collections are defined in `eleventy.config.js`:

- **posts** — `src/writing/*.md`, sorted newest-first, permalink pattern `p/<slug>/` (set in `src/writing/writing.yaml`)
- **projects** — `src/projects/*.md`, sorted newest-first by `date` frontmatter
- **songs** — `src/songs/*.md`, sorted alphabetically (articles like "the/a/an" are stripped for sort)

Each collection directory has a `<dir>.yaml` file (e.g. `songs.yaml`) that sets the default layout for all files in that directory.

### Song frontmatter

Songs are Markdown files with lyrics as body content. Key frontmatter fields:

- `released`: array of `{ project, bandcampTrackId }` — links song to a project for the "Appears in" section and Bandcamp embed. If `project` is omitted but `bandcampTrackId` is present, embeds a standalone track player.
- `voiceMemo` / `voiceMemoCaption`: filename in `src/static/audio/` for an audio player (shown only when not released)
- `youtube` / `youtubeCaption`: YouTube URL or 11-char video ID
- `score`: path to PDF in `src/static/scores/`
- `composer`: credit line

The `lyrics` Nunjucks filter (`eleventy/filters/lyrics.js`) converts the rendered Markdown body into stanza `<div>`s, grouping lines by blank-line separators.

### Project frontmatter

Projects link to Bandcamp albums, list track songs, and optionally show upcoming calendar events.

- `bandcampID` + `bandcampUrl`: renders a Bandcamp album embed
- `songLink`: streaming link (Apple Music, etc.)
- `songs`: array of `{ title, lyricsUrl }` — tracklist with optional links to song pages
- `calendarId`: matches a calendar `id` in `src/_data/calendars.js` — pulls live events from that Google Calendar into the project page
- `credits`: Markdown string rendered in the `secondary_content` block (sidebar)

### Blog post frontmatter

- `date`, `title`, `image`, `description` (used for OG tags)
- Blog excerpt: everything before `+++` in the body becomes `page.excerpt` (used on the writing listing page)

### Calendar / Events system

`src/_data/calendars.js` defines Google Calendar feeds (iCal URLs + metadata). `src/_data/calendarEvents.js` fetches those feeds at build time, parses them with `node-ical`, and exposes `{ oneOff, recurring }` as global data. During dev (`PROD=0`), calendar data is never cached; in production it caches for 1 day.

Events filters are in `eleventy/filters/` (three files registered in `eleventy.config.js`):

- `calendar.js` — filter events by calendar ID, look up display names
- `events.js` — format dates in Eastern time, linkify locations to Google Maps, convert plain-text descriptions to HTML
- `lyrics.js` — stanza rendering for song pages

`src/_data/config.yaml` holds site-level config (currently just `highlightedProjects`, used on the homepage).

### Layout structure

`base.njk` provides a two-column grid (desktop sidebar + main content). Child layouts fill `{% block content %}` and optionally `{% block secondary_content %}` (rendered in a sidebar panel to the right of main content). The `project.njk` layout uses `secondary_content` for credits.

### Static assets

`src/static/` is passed through as-is to `dist/static/`. It contains:

- `styles.css` — single stylesheet
- `audio/` — voice memos and recordings referenced by song frontmatter
- `images/` — photos and album art
- `scores/` — downloadable PDFs

Images referenced in HTML are automatically processed by `eleventy-img` (resized to 400/800/auto widths, converted to jpg+webp).
