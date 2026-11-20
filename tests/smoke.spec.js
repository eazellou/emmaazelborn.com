import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'glob'
import yaml from 'js-yaml'

const DIST = resolve('dist')

function trackPageErrors(page) {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    return () => errors
}

// Parses the YAML frontmatter block (between the leading `---` fences) out of
// a Markdown source file, matching the delimiter convention used throughout
// src/songs and src/projects.
function readFrontmatter(path) {
    const raw = readFileSync(path, 'utf8')
    const match = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return {}
    return yaml.load(match[1]) || {}
}

test('homepage loads with highlighted projects', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/Emma Azelborn/)
    await expect(page.locator('.highlighted-project-item').first()).toBeVisible()
    expect(getErrors()).toEqual([])
})

test('song page renders lyric stanzas and Bandcamp embed when released', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/songs/magnolia-sun/')
    await expect(page.locator('h2')).toContainText('Magnolia Sun')
    const stanzas = page.locator('.song-lyrics .stanza:not(.stanza-empty)')
    await expect(stanzas.first()).toBeVisible()
    expect(await stanzas.count()).toBeGreaterThan(1)
    await expect(page.locator('.song-projects')).toContainText('Magnolia Sun')
    const iframe = page.locator('iframe[src*="bandcamp.com"]').first()
    await expect(iframe).toBeVisible()
    // Guards against YAML integer coercion of bandcampTrackId (unquoted IDs
    // lose leading zeros or precision) silently swapping in the wrong track.
    await expect(iframe).toHaveAttribute('src', /track=1765836546\b/)
    expect(getErrors()).toEqual([])
})

test('project page renders Bandcamp embed and tracklist', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/projects/magnolia-sun/')
    await expect(page.locator('h2').first()).toContainText('Magnolia Sun')
    const iframe = page.locator('iframe[src*="bandcamp.com/EmbeddedPlayer/album="]').first()
    await expect(iframe).toBeVisible()
    // Guards against YAML integer coercion of bandcampID (unquoted IDs lose
    // leading zeros or precision) silently swapping in the wrong album.
    await expect(iframe).toHaveAttribute('src', /album=1983118898\b/)
    const tracks = page.locator('.project-content ol li')
    expect(await tracks.count()).toBeGreaterThan(0)
    await expect(page.locator('.credits')).toBeVisible()
    expect(getErrors()).toEqual([])
})

test('every song and project Bandcamp embed matches its frontmatter ID exactly', async () => {
    // Comprehensive companion to the two targeted magnolia-sun checks above:
    // for every song with released[].bandcampTrackId and every project with
    // bandcampID, confirm the built page embeds that exact ID string. This
    // guards the whole catalog (not just one file) against YAML integer
    // coercion silently swapping in a wrong/truncated ID.
    const songFiles = await glob('src/songs/*.md')
    let checkedSongs = 0
    for (const file of songFiles) {
        const data = readFrontmatter(file)
        if (!Array.isArray(data.released)) continue
        const slug = file.replace(/^src\/songs\//, '').replace(/\.md$/, '')
        const distPath = resolve(DIST, 'songs', slug, 'index.html')
        const html = readFileSync(distPath, 'utf8')
        for (const release of data.released) {
            if (!release.bandcampTrackId) continue
            checkedSongs++
            const id = String(release.bandcampTrackId)
            const idPattern = new RegExp(`track=${id}\\b`)
            expect(
                html,
                `${distPath} should embed an iframe with track=${id} (from ${file})`
            ).toMatch(idPattern)
        }
    }
    expect(checkedSongs).toBeGreaterThan(0)

    const projectFiles = await glob('src/projects/*.md')
    let checkedProjects = 0
    for (const file of projectFiles) {
        const data = readFrontmatter(file)
        if (!data.bandcampID) continue
        checkedProjects++
        const slug = file.replace(/^src\/projects\//, '').replace(/\.md$/, '')
        const distPath = resolve(DIST, 'projects', slug, 'index.html')
        const html = readFileSync(distPath, 'utf8')
        const id = String(data.bandcampID)
        const idPattern = new RegExp(`album=${id}\\b`)
        expect(html, `${distPath} should embed an iframe with album=${id} (from ${file})`).toMatch(
            idPattern
        )
    }
    expect(checkedProjects).toBeGreaterThan(0)
})

test('writing index lists posts and a post page renders', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/writing/')
    const postLinks = page.locator('a[href^="/p/"]')
    expect(await postLinks.count()).toBeGreaterThan(0)
    const firstPostHref = await postLinks.first().getAttribute('href')
    expect(firstPostHref).toBeTruthy()
    await page.goto(firstPostHref)
    await expect(page.locator('.post-content h2').first()).toBeVisible()
    await expect(page.locator('.post-content time')).toBeVisible()
    expect(getErrors()).toEqual([])
})

test('events page renders without crashing', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/events/')
    await expect(page.locator('.page-title')).toContainText('Events')
    expect(getErrors()).toEqual([])
})
