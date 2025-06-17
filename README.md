# emmaazelborn.com

A personal website and blog built with [Eleventy](https://www.11ty.dev/), a static site generator.

## Architecture

The site is built using the following structure:

```
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

### Building for Production

Generate a production build:

```bash
npm run build
```

The built site will be in the `dist` directory.