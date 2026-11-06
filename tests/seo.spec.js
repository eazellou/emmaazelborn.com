import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'glob'

const DIST = resolve('dist')

test('robots.txt is served at site root and references the sitemap', async () => {
    const robots = readFileSync(resolve(DIST, 'robots.txt'), 'utf8')
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Sitemap: https://emmaazelborn.com/sitemap.xml')
})

test('sitemap.xml lists posts, songs, and projects with absolute URLs', async () => {
    const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
        expect(url).toMatch(/^https:\/\/emmaazelborn\.com\//)
    }

    expect(urls.some((url) => url.includes('/p/'))).toBe(true)
    expect(urls.some((url) => url.includes('/songs/'))).toBe(true)
    expect(urls.some((url) => url.includes('/projects/'))).toBe(true)
})

test('pages with a description set a meta description tag, others fall back to the site default', async () => {
    const herVoice = readFileSync(resolve(DIST, 'songs/her-voice/index.html'), 'utf8')
    expect(herVoice).toContain(
        '<meta name="description" content="her voice still echoes through the valley / it weaves through the leaves of the redwood trees">'
    )

    const home = readFileSync(resolve(DIST, 'index.html'), 'utf8')
    expect(home).toContain(
        '<meta name="description" content="Hi, I\'m Emma Azelborn. I\'m a songwriter, dancer, and musician.">'
    )
})

test('every song page sets a lyric-based meta description, not the site default', async () => {
    const songFiles = await glob('songs/*/index.html', { cwd: DIST })
    const genericDescription = "Hi, I'm Emma Azelborn. I'm a songwriter, dancer, and musician."

    expect(songFiles.length).toBeGreaterThan(0)
    for (const file of songFiles) {
        const html = readFileSync(resolve(DIST, file), 'utf8')
        if (html.includes('Redirecting...')) continue
        const match = html.match(/<meta name="description" content="([^"]+)">/)
        expect(match, `${file} should have a meta description`).not.toBeNull()
        expect(match[1], `${file} should not use the generic site description`).not.toBe(
            genericDescription
        )
    }
})

test('feed.xml lists the newest posts first and is discoverable from pages', async () => {
    const feed = readFileSync(resolve(DIST, 'feed.xml'), 'utf8')
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom"')

    // Expected order: posts in src/writing sorted newest-first by `date`, capped at 10
    const files = await glob('src/writing/*.md')
    const expected = files
        .map((file) => ({
            slug: file.split('/').pop().replace(/\.md$/, ''),
            date: new Date(readFileSync(file, 'utf8').match(/^date:\s*(.+)$/m)[1]),
        }))
        .sort((a, b) => b.date - a.date)
        .slice(0, 10)
        .map(({ slug }) => `https://emmaazelborn.com/p/${slug}/`)

    const entryUrls = [
        ...feed.matchAll(/<entry>\s*<title>.*?<\/title>\s*<link href="(.*?)"/gs),
    ].map((m) => m[1])
    expect(entryUrls.length).toBeGreaterThan(0)
    expect(entryUrls).toEqual(expected)

    const home = readFileSync(resolve(DIST, 'index.html'), 'utf8')
    expect(home).toContain(
        '<link rel="alternate" type="application/atom+xml" title="Emma Azelborn" href="https://emmaazelborn.com/feed.xml">'
    )
})
