/**
 * Lyrics filter: converts markdown-rendered HTML into stanza divs with empty-line spacing preserved.
 */
function stanzaHtmlToDivs(lyricsHtml) {
    const normalized = lyricsHtml.replace(/<p>\s*<\/p>/g, '<p class="empty-stanza-marker"></p>')
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
            const lines = para.content
                .split(/<br\s*\/?>(?:\s*)?|\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
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

export default function (eleventyConfig) {
    eleventyConfig.addFilter('lyrics', stanzaHtmlToDivs)
}
