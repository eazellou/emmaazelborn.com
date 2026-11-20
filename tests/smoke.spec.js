import { test, expect } from '@playwright/test'

function trackPageErrors(page) {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    return () => errors
}

test('homepage loads with highlighted projects', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/Emma Azelborn/)
    await expect(page.locator('.highlighted-project-item').first()).toBeVisible()
    expect(await page.locator('.highlighted-project-item').count()).toBe(3)
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
    await expect(page.locator('iframe[src*="bandcamp.com"]').first()).toBeVisible()
    expect(getErrors()).toEqual([])
})

test('project page renders Bandcamp embed and tracklist', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/projects/magnolia-sun/')
    await expect(page.locator('h2').first()).toContainText('Magnolia Sun')
    await expect(
        page.locator('iframe[src*="bandcamp.com/EmbeddedPlayer/album="]').first()
    ).toBeVisible()
    const tracks = page.locator('.project-content ol li')
    expect(await tracks.count()).toBe(11)
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
