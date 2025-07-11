import { format } from 'date-fns'
import { UTCDate } from '@date-fns/utc'
import yaml from 'js-yaml'
import { feedPlugin } from '@11ty/eleventy-plugin-rss'
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import  markdownIt  from 'markdown-it'

export default async function (eleventyConfig) {
    // Add a collection for posts
    eleventyConfig.addCollection("posts", (collection) => {
        return collection.getFilteredByGlob("src/writing/*.md")
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    })

    // Add a collection for projects
    eleventyConfig.addCollection("projects", (collection) => {
        return collection.getFilteredByGlob("src/projects/*.md")
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    })

    // Add a collection for songs
    eleventyConfig.addCollection("songs", (collection) => {
        return collection.getFilteredByGlob("src/songs/*.md")
            .sort((a, b) => a.data.title.localeCompare(b.data.title))
    })

    // Add a filter to format dates using date-fns
    eleventyConfig.addFilter(
        "date",
        (date, formatStr = "MMMM d, yyyy") => format(new UTCDate(date), formatStr)
    )

    // Add YAML as an acceptable data file format
    eleventyConfig.addDataExtension(
        "yml,yaml",
        (contents) => yaml.load(contents)
    )

    // add a markdown filter
    eleventyConfig.addFilter("markdown", (content) => {
        const md = new markdownIt({
          html: true
        });
      
        return md.render(content);
    })

    // "---" is the read more separator. page.excerpt will have everything before this
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
            subtitle: "This is a longer description about your blog.",
            base: "https://emmaazelborn.com",
            author: {
                name: "Emma Azelborn",
                email: "", // Optional
            }
        },
    })

    // Copy static files without processing
    // We could add ESBuild later if you wanted more
    // sophisticated javascript/CSS compilation
    eleventyConfig.addPassthroughCopy("src/static")

    // optimize image sizes: https://www.11ty.dev/docs/plugins/image/#html-transform
    eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        // which file extensions to process
        extensions: 'html',
        // optional, output image formats
        formats: ['jpg', 'webp'],
        // optional, output image widths
        widths: ['auto', 400, 800],
        // optional, attributes assigned on <img> override these values.
        defaultAttributes: {
            // loading: 'lazy',
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
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    },
}