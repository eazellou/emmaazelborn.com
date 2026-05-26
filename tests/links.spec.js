import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { glob } from 'glob'

const DIST = resolve('dist')

function resolveInternal(href) {
    const clean = decodeURIComponent(href.split('#')[0].split('?')[0])
    if (!clean || clean.startsWith('http://') || clean.startsWith('https://')) return null
    if (clean.startsWith('mailto:') || clean.startsWith('tel:')) return null
    const path = clean.startsWith('/') ? clean.slice(1) : clean
    if (!path) return DIST
    const candidate = join(DIST, path)
    if (existsSync(candidate)) {
        const stat = statSync(candidate)
        if (stat.isDirectory()) {
            return existsSync(join(candidate, 'index.html')) ? candidate : null
        }
        return candidate
    }
    if (existsSync(candidate + '.html')) return candidate + '.html'
    if (existsSync(join(candidate, 'index.html'))) return join(candidate, 'index.html')
    return null
}

test('all internal links in built site resolve', async () => {
    const htmlFiles = await glob('**/*.html', { cwd: DIST, absolute: true })
    expect(htmlFiles.length).toBeGreaterThan(0)

    const broken = []
    const hrefRegex = /\bhref\s*=\s*["']([^"']+)["']/gi
    for (const file of htmlFiles) {
        const html = readFileSync(file, 'utf8')
        let match
        while ((match = hrefRegex.exec(html)) !== null) {
            const href = match[1]
            if (href.startsWith('http://') || href.startsWith('https://')) continue
            if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#'))
                continue
            if (resolveInternal(href) === null) {
                broken.push({ file: file.replace(DIST + '/', ''), href })
            }
        }
    }

    if (broken.length) {
        const summary = broken.map((b) => `  ${b.file} → ${b.href}`).join('\n')
        throw new Error(`Found ${broken.length} broken internal link(s):\n${summary}`)
    }
})
