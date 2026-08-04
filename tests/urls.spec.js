import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'glob'

const DIST = resolve('dist')

// tests/deployed-urls.json is a snapshot of every URL that was live in a past
// build. It is NOT aspirational — it should only ever be regenerated from an
// actual build output, never hand-edited to describe a future state. Content
// files (especially songs, whose URLs derive from the filename via
// fileSlug — see CLAUDE.md's URL-stability section) must never be renamed or
// removed in a way that drops one of these URLs from the build. New URLs
// showing up in the build that aren't in the manifest is fine and expected;
// this test only guards against URLs disappearing.
test('every previously-deployed URL still exists in the build', async () => {
    const EXPECTED = JSON.parse(readFileSync('tests/deployed-urls.json', 'utf8'))

    const files = await glob('**/index.html', { cwd: DIST })
    const built = new Set(files.map((f) => '/' + f.replace(/index\.html$/, '')))

    const missing = EXPECTED.filter((url) => !built.has(url))

    const summary = missing.map((url) => `  ${url}`).join('\n')
    expect(
        missing.length,
        `${missing.length} previously-deployed URL(s) are missing from the build:\n${summary}\n\n` +
            'If a URL was intentionally retired, add an Eleventy redirect rather than ' +
            'letting it 404 (see CLAUDE.md: "Once a URL has been deployed, it must never change"). ' +
            'If this is a legitimate rename with a redirect stub in place, update tests/deployed-urls.json ' +
            'to include the new URL alongside the old one (the old URL must still resolve via the redirect).'
    ).toBe(0)
})
