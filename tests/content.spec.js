import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'glob'
import yaml from 'js-yaml'

const DIST = resolve('dist')
const SRC = resolve('src')

// Parses the leading `---`-delimited YAML frontmatter block out of a
// markdown source file, mirroring how Eleventy reads these files.
function readFrontmatter(path) {
    const raw = readFileSync(path, 'utf8')
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    if (!match) return {}
    return yaml.load(match[1]) || {}
}

function slugFromPath(path) {
    return path.split('/').pop().replace(/\.md$/, '')
}

// Nunjucks HTML-escapes text output (e.g. "We'll" -> "We&#39;ll"), so decode
// the small set of entities it can actually produce before comparing titles.
function decodeHtmlEntities(text) {
    return text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

async function loadEntries(globPattern) {
    const files = await glob(globPattern, { cwd: SRC, absolute: true })
    return files.map((file) => ({
        slug: slugFromPath(file),
        file,
        data: readFrontmatter(file),
    }))
}

test.describe('song frontmatter cross-references', () => {
    test('every released song embeds its exact Bandcamp track id', async () => {
        const songs = await loadEntries('songs/*.md')
        const missing = []

        for (const song of songs) {
            for (const rel of song.data.released || []) {
                if (!rel.bandcampTrackId) continue
                const distPath = resolve(DIST, 'songs', song.slug, 'index.html')
                if (!existsSync(distPath)) {
                    missing.push(`${song.slug}: dist page missing at ${distPath}`)
                    continue
                }
                const html = readFileSync(distPath, 'utf8')
                if (!html.includes(`track=${rel.bandcampTrackId}`)) {
                    missing.push(
                        `${song.slug}: expected "track=${rel.bandcampTrackId}" in built page`
                    )
                }
            }
        }

        expect(missing, missing.join('\n')).toEqual([])
    })

    test('every released song links to its project in the "Appears in" section', async () => {
        const songs = await loadEntries('songs/*.md')
        const missing = []

        for (const song of songs) {
            for (const rel of song.data.released || []) {
                if (!rel.project) continue
                const distPath = resolve(DIST, 'songs', song.slug, 'index.html')
                if (!existsSync(distPath)) {
                    missing.push(`${song.slug}: dist page missing at ${distPath}`)
                    continue
                }
                const html = readFileSync(distPath, 'utf8')
                const projectsSection = html.match(/<div class="song-projects">[\s\S]*?<\/div>/)
                const expectedHref = `/projects/${rel.project}/`
                if (!projectsSection || !projectsSection[0].includes(`href="${expectedHref}"`)) {
                    missing.push(
                        `${song.slug}: expected .song-projects to link to "${expectedHref}"`
                    )
                }
            }
        }

        expect(missing, missing.join('\n')).toEqual([])
    })
})

test.describe('project frontmatter cross-references', () => {
    test('bandcampID and bandcampUrl are both set or both absent, and the embed matches bandcampID', async () => {
        const projects = await loadEntries('projects/*.md')
        const problems = []

        for (const project of projects) {
            const { bandcampID, bandcampUrl } = project.data
            const hasId = Boolean(bandcampID)
            const hasUrl = Boolean(bandcampUrl)

            if (hasId !== hasUrl) {
                problems.push(
                    `${project.slug}: half-configured Bandcamp embed (bandcampID=${JSON.stringify(
                        bandcampID
                    )}, bandcampUrl=${JSON.stringify(bandcampUrl)}) — project.njk only renders the embed when both are set`
                )
                continue
            }

            if (!hasId) continue

            const distPath = resolve(DIST, 'projects', project.slug, 'index.html')
            if (!existsSync(distPath)) {
                problems.push(`${project.slug}: dist page missing at ${distPath}`)
                continue
            }
            const html = readFileSync(distPath, 'utf8')
            if (!html.includes(`album=${bandcampID}`)) {
                problems.push(`${project.slug}: expected "album=${bandcampID}" in built page`)
            }
        }

        expect(problems, problems.join('\n')).toEqual([])
    })
})

test.describe('homepage highlighted projects', () => {
    test('homepage renders exactly config.highlightedProjects.length cards', async () => {
        const configRaw = readFileSync(resolve(SRC, '_data/config.yaml'), 'utf8')
        const config = yaml.load(configRaw)
        const expectedCount = config.highlightedProjects.length

        const html = readFileSync(resolve(DIST, 'index.html'), 'utf8')
        const actualCount = (html.match(/class="highlighted-project-item"/g) || []).length

        expect(actualCount).toBe(expectedCount)
    })
})

test.describe('project tracklist cross-references', () => {
    test('every songs[].lyricsUrl resolves to a page whose heading matches songs[].title', async () => {
        const projects = await loadEntries('projects/*.md')
        const problems = []

        for (const project of projects) {
            for (const song of project.data.songs || []) {
                if (!song.lyricsUrl) continue

                const cleanPath = song.lyricsUrl.replace(/^\/|\/$/g, '')
                const distPath = resolve(DIST, cleanPath, 'index.html')
                if (!existsSync(distPath)) {
                    problems.push(
                        `${project.slug}: songs[].lyricsUrl "${song.lyricsUrl}" does not resolve to a built page (${distPath})`
                    )
                    continue
                }

                const html = readFileSync(distPath, 'utf8')
                const headingMatch = html.match(/<h2>([^<]*)<\/h2>/)
                if (!headingMatch) {
                    problems.push(
                        `${project.slug}: page at "${song.lyricsUrl}" has no <h2> heading to check`
                    )
                    continue
                }

                const actualTitle = decodeHtmlEntities(headingMatch[1].trim())
                if (actualTitle !== song.title) {
                    problems.push(
                        `${project.slug}: tracklist entry "${song.title}" links to "${song.lyricsUrl}", but that page's heading is "${actualTitle}"`
                    )
                }
            }
        }

        expect(problems, problems.join('\n')).toEqual([])
    })
})
