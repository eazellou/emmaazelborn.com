# emmaazelborn.com

A personal website and blog built with [Eleventy](https://www.11ty.dev/), a static site generator.

## Architecture

The site is built using the following structure:

```text
src/
├── _data/             # Global data files (site config, calendar feeds/events)
│   ├── config.yaml    # Site-level config (e.g. homepage highlighted projects)
│   ├── calendars.js   # Google Calendar feed metadata
│   └── calendarEvents.js  # Fetches/parses calendar feeds at build time
├── _layouts/           # Nunjucks templates
│   ├── base.njk       # Base layout with common HTML structure
│   ├── post.njk       # Layout for blog posts
│   ├── page.njk       # Layout for regular pages
│   ├── project.njk    # Layout for project pages
│   ├── song.njk       # Layout for song pages
│   ├── events.njk     # Layout for the events page
│   └── includes/      # Shared partials
├── writing/            # Blog posts in Markdown (permalink pattern p/<slug>/)
├── songs/              # Song pages in Markdown (lyrics as body content)
├── projects/           # Project pages in Markdown (albums, releases)
├── static/             # Passed through as-is to dist/static/ (styles, audio, images, scores)
├── home.njk            # Homepage template
└── ...other pages
```

`eleventy/filters/` (project root, not under `src/`) holds custom Eleventy filters registered in `eleventy.config.js`: `calendar.js` (filter events by calendar ID), `events.js` (date/location formatting), and `lyrics.js` (stanza rendering for song pages).

## Development

### Installation

1. Clone the repository
2. Install dependencies:

    ```bash
     npm install
    ```

### Running Locally

Start the development server with hot reloading:

```bash
npm run serve
```

The site will be available at `http://localhost:8080`

#### Previewing Claude worktree branches

Claude Code manages changes in git worktrees under `.claude/worktrees/`. To preview a worktree branch without checking it out, use the `serve-worktree` shell function (defined in `~/.bash_profile`):

```bash
serve-worktree claude/cranky-grothendieck-ec31fa
```

Each worktree gets a deterministic port in the 3000–9999 range based on its branch name, so multiple can run at once.

### Building for Production

Generate a production build:

```bash
npm run build
```

The built site will be in the `dist` directory.
