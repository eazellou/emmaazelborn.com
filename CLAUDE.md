# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run serve      # Dev server at http://localhost:8080 (PROD=0, no cache)
npm run build      # Production build to dist/ (PROD=1, 1d cache)
npm run lint       # Run JS (eslint) + Markdown (markdownlint) linting
npm run format     # Auto-format with Prettier
```

No test suite — verify changes by running `serve` and checking the browser.

Always run `npm run lint && npm run format:check` before finalizing any changes. If `format:check` fails, run `npm run format` to auto-fix.

## URL stability — never break deployed URLs

**Once a URL has been deployed, it must never change.** This applies to all content: posts (`p/<slug>/`), songs, projects, and static assets. Renaming files, changing slugs, restructuring directories, or altering permalink patterns are all high-risk operations. If a structural change is unavoidable, add Eleventy redirects rather than removing the old URL.

### Redirect-stub pattern

This site is hosted on GitHub Pages, which has no server-side redirect support (no `_redirects`, no custom server config). When a song's slug changes, the old URL is kept alive as a client-side redirect stub instead of being removed.

A stub is a standalone `.html` file (not `.md`) placed at the old path inside `src/songs/`, using frontmatter to opt out of the normal song template and collection:

- `permalink` — pins the file to the exact old URL. **Never change this value once deployed** — it _is_ the deployed URL.
- `eleventyExcludeFromCollections: true` — keeps the stub out of the `songs` collection (listings, sorting, "Appears in" sections, etc.)
- `layout: false` — the stub supplies its own complete `<html>` document instead of using a song layout
- `templateEngineOverride: false` — the file's HTML is emitted as-is, not run through Nunjucks

The body is a minimal HTML page combining three redirect mechanisms for maximum compatibility: a `<meta http-equiv="refresh">` (works without JS), a `<link rel="canonical">` (tells search engines the real URL to index), and a `window.location.href` script (fast redirect when JS is available), plus a visible fallback link for anyone who lands there before any of those fire.

`src/songs/the-north-wind.html` is the simplest existing example and can be copied as a template for a new stub — swap the `permalink`, the three occurrences of the destination URL, and the visible link text:

```html
---
permalink: /songs/the-north-wind/
eleventyExcludeFromCollections: true
layout: false
templateEngineOverride: false
---

<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="refresh" content="0; url=/songs/the-north-wind-doth-blow/" />
        <link rel="canonical" href="/songs/the-north-wind-doth-blow/" />
        <title>Redirecting...</title>
        <script>
            window.location.href = '/songs/the-north-wind-doth-blow/'
        </script>
    </head>
    <body>
        <p>
            I renamed this song. If you are not redirected automatically,
            <a href="/songs/the-north-wind-doth-blow/">click here</a>.
        </p>
    </body>
</html>
```

The `<title>Redirecting...</title>` text is also used as a marker: `tests/seo.spec.js` skips any page containing "Redirecting..." when asserting on lyric-based meta descriptions, since stub pages intentionally have neither lyrics nor a meaningful description.

Other existing stubs: `src/songs/the-winds-song.html` and `src/songs/o wind (that sings so loud a song).html`.

### Previewing Claude worktree branches

To run a dev server for a Claude-managed worktree branch without checking it out, use the `serve-worktree` shell function (defined in `~/.bash_profile`):

```bash
serve-worktree claude/cranky-grothendieck-ec31fa
```

This serves the worktree from a deterministic port derived from the branch name (range 3000–9999), so multiple worktrees can run simultaneously. The port is printed on start.

## Architecture

This is an [Eleventy](https://www.11ty.dev/) static site. Source is in `src/`, output goes to `dist/`. Templates use Nunjucks (`.njk`); Markdown also runs through Nunjucks. Layouts and includes are both in `src/_layouts/`.

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
