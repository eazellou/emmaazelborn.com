# emmaazelborn.com

A personal website and blog built with [Eleventy](https://www.11ty.dev/), a static site generator.

## Architecture

The site is built using the following structure:

```text
src/
├── _layouts/          # Nunjucks templates
│   ├── base.njk      # Base layout with common HTML structure
│   ├── post.njk      # Layout for blog posts
│   └── page.njk      # Layout for regular pages
├── blog/             # Blog posts in Markdown
├── index.njk         # Homepage template
└── ...other pages
```

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
