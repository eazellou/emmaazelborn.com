import { format } from 'date-fns'
import { UTCDate } from '@date-fns/utc'
import yaml from 'js-yaml'
import { feedPlugin } from '@11ty/eleventy-plugin-rss'
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import markdownIt from 'markdown-it'
import markdownItFootnote from 'markdown-it-footnote'
import markdownItAnchor from 'markdown-it-anchor'
import calendarFilters from './eleventy/filters/calendar.js'
import eventFilters from './eleventy/filters/events.js'
import lyricsFilter from './eleventy/filters/lyrics.js'
import { escapeHtml } from './eleventy/filters/utils.js'

function addCollections(eleventyConfig) {
    const articlePattern = /^(the|a|an|o|it[''']s)\s+/i
    const sortByTitle = (a, b) => {
        const key = (title) => title.replace(articlePattern, '').trim()
        return key(a.data.title).localeCompare(key(b.data.title))
    }

    eleventyConfig.addCollection('posts', (collection) =>
        collection
            .getFilteredByGlob('src/writing/*.md')
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    )

    eleventyConfig.addCollection('projects', (collection) =>
        collection
            .getFilteredByGlob('src/projects/*.md')
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    )

    eleventyConfig.addCollection('songs', (collection) =>
        collection.getFilteredByGlob('src/songs/*.md').sort(sortByTitle)
    )
}

export default async function (eleventyConfig) {
    calendarFilters(eleventyConfig)
    eventFilters(eleventyConfig)
    lyricsFilter(eleventyConfig)
    addCollections(eleventyConfig)

    // Add a filter to get a project by fileSlug
    eleventyConfig.addFilter('getProjectByName', function (projects, name) {
        return projects.find((project) => project.fileSlug === name).data
    })

    // Add a filter to format dates using date-fns
    eleventyConfig.addFilter('date', (date, formatStr = 'MMMM d, yyyy') =>
        format(new UTCDate(date), formatStr)
    )

    // Add a filter to get MIME type from audio filename
    eleventyConfig.addFilter('audioMimeType', (filename) => {
        if (!filename) return 'audio/mpeg'
        const ext = filename.split('.').pop().toLowerCase()
        const mimeTypes = {
            mp3: 'audio/mpeg',
            mp4: 'audio/mp4',
            m4a: 'audio/mp4',
            ogg: 'audio/ogg',
            wav: 'audio/wav',
            webm: 'audio/webm',
        }
        return mimeTypes[ext] || 'audio/mpeg'
    })

    // Extract YouTube video ID from URL or return as-is if already an ID
    eleventyConfig.addFilter('youtubeEmbedId', (url) => {
        if (!url || typeof url !== 'string') return ''
        const trimmed = url.trim()
        const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        if (shortMatch) return shortMatch[1]
        const longMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/)
        if (longMatch) return longMatch[1]
        return trimmed.length === 11 ? trimmed : ''
    })

    // Escape and normalize caption text (HTML-escape + newlines to <br>)
    eleventyConfig.addFilter('captionSafe', (text) => {
        if (!text || typeof text !== 'string') return ''
        return escapeHtml(text).replace(/\n/g, '<br>')
    })

    // Add YAML as an acceptable data file format
    eleventyConfig.addDataExtension('yml,yaml', (contents) => yaml.load(contents))

    const markdownItOptions = {
        html: true,
        linkify: true,
        typographer: true,
    }

    const markdownLib = markdownIt(markdownItOptions)
        .use(markdownItFootnote)
        .use(markdownItAnchor, { level: [2, 3] })
    eleventyConfig.setLibrary('md', markdownLib)

    // add a markdown filter
    eleventyConfig.addFilter('markdown', (content) => {
        return markdownLib.render(content)
    })

    // Renders inline markdown (no wrapping <p>) for use in contexts like the
    // post excerpt, which is already placed inside a <p>. Footnote markers
    // (e.g. [^1]) are stripped first: the footnote definitions live after the
    // "+++" separator and aren't part of the excerpt, so rendering them would
    // produce a broken reference. This lets links etc. render correctly in the
    // homepage/writing listing excerpts while dropping post-only footnotes.
    eleventyConfig.addFilter('markdownInline', (content) => {
        if (!content) return content
        const withoutFootnotes = content.replace(/\[\^[^\]]+\]/g, '')
        return markdownLib.renderInline(withoutFootnotes)
    })

    // "+++" is the read more separator; page.excerpt gets everything before it
    eleventyConfig.setFrontMatterParsingOptions({
        excerpt: true,
        excerpt_separator: '+++',
    })

    eleventyConfig.addFilter('log', (value) => {
        console.log(value)
    })

    // Add RSS feed
    eleventyConfig.addPlugin(feedPlugin, {
        type: 'atom',
        outputPath: '/feed.xml',
        collection: {
            name: 'posts',
            limit: 10,
        },
        metadata: {
            language: 'en',
            title: 'Emma Azelborn',
            subtitle: 'Thoughts on social singing, contra dancing, and other things.',
            base: 'https://emmaazelborn.com',
            author: {
                name: 'Emma Azelborn',
                email: '', // Optional
            },
        },
    })

    eleventyConfig.addPassthroughCopy('src/static')

    eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        extensions: 'html',
        formats: ['jpg', 'webp'],
        widths: ['auto', 400, 800],
        defaultAttributes: {
            sizes: '100vw',
            decoding: 'async',
        },
    })
}

export const config = {
    dir: {
        input: 'src',
        output: 'dist',
        // Store template layouts and includes in the same directory
        // for simplicity
        layouts: '_layouts',
        includes: '_layouts',
        // Switch Markdown and HTML template engines to Nunjucks
        // (otherwise, the default is Liquid)
        htmlTemplateEngine: 'njk',
        markdownTemplateEngine: 'njk',
    },
}
