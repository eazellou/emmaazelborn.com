import { test, expect } from '@playwright/test'

/**
 * Capture page console errors and uncaught exceptions, returning a getter for them.
 * Bandcamp/YouTube embeds load from third-party origins and routinely log noise we don't control,
 * so we filter to errors originating from our own pages.
 */
function trackPageErrors(page) {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const url = msg.location().url
        if (url && !url.startsWith('http://localhost')) return
        errors.push(msg.text())
    })
    return () => errors
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
    await expect(page.locator('iframe[src*="bandcamp.com"]')).toHaveCount(1)
    expect(getErrors()).toEqual([])
})

test('project page renders Bandcamp embed and tracklist', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/projects/magnolia-sun/')
    await expect(page.locator('h2').first()).toContainText('Magnolia Sun')
    await expect(page.locator('iframe[src*="bandcamp.com/EmbeddedPlayer/album="]')).toHaveCount(1)
    const tracks = page.locator('.project-content ol li')
    expect(await tracks.count()).toBeGreaterThan(5)
    await expect(page.locator('.credits')).toBeVisible()
    expect(getErrors()).toEqual([])
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
