/**
 * Splits a paragraph's inner HTML into per-line strings, keeping inline tags
 * (e.g. <strong>, <em>) that span multiple lines balanced on every resulting
 * line. This lets markdown like "**line one\nline two**" bold both lines
 * instead of leaving an unclosed <strong> orphaned across the split.
 */
function splitLinesKeepingTagsBalanced(content) {
    const rawLines = content.split(/<br\s*\/?>(?:\s*)?|\n/)
    const openTags = []
    const lines = []

    for (const rawLine of rawLines) {
        const prefix = openTags.map((tag) => `<${tag}>`).join('')
        let line = prefix + rawLine

        const tagRegex = /<(\/?)(\w+)[^>]*>/g
        let match
        while ((match = tagRegex.exec(rawLine)) !== null) {
            const [, isClosing, tagName] = match
            if (isClosing) {
                const idx = openTags.lastIndexOf(tagName)
                if (idx !== -1) openTags.splice(idx, 1)
            } else {
                openTags.push(tagName)
            }
        }

        line += openTags
            .slice()
            .reverse()
            .map((tag) => `</${tag}>`)
            .join('')
        lines.push(line.trim())
    }

    return lines.filter((line) => line.length > 0)
}

/**
 * Lyrics filter: converts markdown-rendered HTML into stanza divs with empty-line spacing preserved.
 */
function stanzaHtmlToDivs(lyricsHtml) {
    const normalized = lyricsHtml.replace(/<p>\s*<\/p>/g, '<p class="empty-stanza-marker"></p>')
    return stanzasFromHtml(normalized)
}

function stanzasFromHtml(normalized) {
    const paragraphs = []
    const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/g
    let match

    while ((match = paraRegex.exec(normalized)) !== null) {
        const isMarker = match[0].includes('empty-stanza-marker')
        const content = match[1].trim()
        paragraphs.push({
            type: isMarker || content.length === 0 ? 'empty' : 'content',
            content,
        })
    }

    let result = ''
    for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i]
        const prevPara = i > 0 ? paragraphs[i - 1] : null

        if (para.type === 'empty') {
            if (!prevPara || prevPara.type !== 'empty') {
                result += '<div class="stanza stanza-empty"></div>'
            }
        } else {
            if (prevPara && prevPara.type === 'content') {
                result += '<div class="stanza stanza-empty"></div>'
            }
            const lines = splitLinesKeepingTagsBalanced(para.content)
            if (lines.length > 0) {
                result +=
                    '<div class="stanza">' +
                    lines.map((line) => `<p>${line}</p>`).join('') +
                    '</div>'
            }
        }
    }
    return result
}

/**
 * Splits markdown-rendered lyrics HTML on a "***" horizontal rule into a
 * structural (default) section and an optional fully-written-out section,
 * each rendered to stanza divs. Songs without a "***" separator only have
 * a structural section.
 *
 * `songTitle` is optional and only used to make the build-time log (below)
 * identify which song gained a toggle.
 */
function stanzaSections(lyricsHtml, songTitle) {
    const [structuralHtml, ...rest] = lyricsHtml.split(/<hr\s*\/?>/)
    const fullHtml = rest.join('')
    if (rest.length > 0) {
        console.log(
            `[lyrics] "${songTitle || 'unknown song'}" has a "***" separator — rendering a structural/full lyrics toggle.`
        )
    }
    return {
        structural: stanzaHtmlToDivs(structuralHtml),
        full: rest.length > 0 ? stanzaHtmlToDivs(fullHtml) : null,
    }
}

export default function (eleventyConfig) {
    eleventyConfig.addFilter('lyrics', stanzaHtmlToDivs)
    eleventyConfig.addFilter('lyricsSections', stanzaSections)
}
