import { format } from 'date-fns'
import { UTCDate } from '@date-fns/utc'
import yaml from 'js-yaml'
import { feedPlugin } from '@11ty/eleventy-plugin-rss'
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img"
import markdownIt from 'markdown-it'
import markdownItFootnote from 'markdown-it-footnote'
import calendarFilters from './eleventy/filters/calendar.js'
import eventFilters from './eleventy/filters/events.js'
import lyricsFilter from './eleventy/filters/lyrics.js'

export default async function (eleventyConfig) {
    calendarFilters(eleventyConfig)
    eventFilters(eleventyConfig)
    lyricsFilter(eleventyConfig)
    let projectsCollection = [];
    // Add a collection for posts
    eleventyConfig.addCollection("posts", (collection) => {
        return collection.getFilteredByGlob("src/writing/*.md")
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    })

    // Add a collection for projects
    eleventyConfig.addCollection("projects", (collection) => {
        projectsCollection = collection.getFilteredByGlob("src/projects/*.md")
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
        return projectsCollection;
    })

    // Add a collection for songs
    eleventyConfig.addCollection("songs", (collection) => {
        return collection.getFilteredByGlob("src/songs/*.md")
            .sort((a, b) => {
                const getSortKey = (title) => {
                    // Remove common articles from the beginning
                    const articles = /^(the|a|an|o)\s+/i;
                    return title.replace(articles, '').trim();
                };
                
                return getSortKey(a.data.title).localeCompare(getSortKey(b.data.title));
            })
    })

    // Add a filter to get a project by fileSlug
    eleventyConfig.addFilter("getProjectByName", function(projects, name) {
        return projects.find(project => project.fileSlug === name).data;
    });

    // Add a filter to format dates using date-fns
    eleventyConfig.addFilter(
        "date",
        (date, formatStr = "MMMM d, yyyy") => format(new UTCDate(date), formatStr)
    )

    // Add a filter to get MIME type from audio filename
    eleventyConfig.addFilter("audioMimeType", (filename) => {
        if (!filename) return "audio/mpeg";
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'mp4': 'audio/mp4',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'webm': 'audio/webm'
        };
        return mimeTypes[ext] || 'audio/mpeg';
    })

    // Extract YouTube video ID from URL or return as-is if already an ID
    eleventyConfig.addFilter("youtubeEmbedId", (url) => {
        if (!url || typeof url !== "string") return "";
        const trimmed = url.trim();
        const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (shortMatch) return shortMatch[1];
        const longMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
        if (longMatch) return longMatch[1];
        return trimmed.length === 11 ? trimmed : "";
    })

    // Escape and normalize caption text (HTML-escape + newlines to <br>)
    eleventyConfig.addFilter("captionSafe", (text) => {
        if (!text || typeof text !== "string") return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/\n/g, "<br>");
    })

    // Add YAML as an acceptable data file format
    eleventyConfig.addDataExtension(
        "yml,yaml",
        (contents) => yaml.load(contents)
    )

    const markdownItOptions = {
        html: true,
        linkify: true,
        typographer: true
    };
    
    const markdownLib = markdownIt(markdownItOptions).use(markdownItFootnote);
    eleventyConfig.setLibrary("md", markdownLib);

    // add a markdown filter
    eleventyConfig.addFilter("markdown", (content) => {
        return markdownLib.render(content);
    })

    // "---" is the read more separator; page.excerpt gets everything before it
    eleventyConfig.setFrontMatterParsingOptions({
		excerpt: true,
        excerpt_separator: "---",
	});

    eleventyConfig.addFilter("log", (value) => {
        console.log(value);
      });

    // Add RSS feed
    eleventyConfig.addPlugin(feedPlugin, {
        type: "atom",
        outputPath: "/feed.xml",
        collection: {
            name: "posts",
            limit: 10,
        },
        metadata: {
            language: "en",
            title: "Emma Azelborn",
            subtitle: "Thoughts on social singing, contra dancing, and other things.",
            base: "https://emmaazelborn.com",
            author: {
                name: "Emma Azelborn",
                email: "", // Optional
            }
        },
    })

    eleventyConfig.addPassthroughCopy("src/static")

    eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        extensions: 'html',
        formats: ['jpg', 'webp'],
        widths: ['auto', 400, 800],
        defaultAttributes: {
            sizes: '100vw',
            decoding: 'async',
        },
    });
}

export const config = {
    dir: {
        input: "src",
        output: "dist",
        // Store template layouts and includes in the same directory
        // for simplicity
        layouts: "_layouts",
        includes: "_layouts",
        // Switch Markdown and HTML template engines to Nunjucks
        // (otherwise, the default is Liquid)
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
    },
}