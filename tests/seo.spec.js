import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
        '<meta name="description" content="A song about the women who fought to save California&#39;s redwood forests from logging in the early 1900s.">'
    )

    const home = readFileSync(resolve(DIST, 'index.html'), 'utf8')
    expect(home).toContain(
        '<meta name="description" content="Hi, I\'m Emma Azelborn. I\'m a songwriter, dancer, and musician.">'
    )
})
