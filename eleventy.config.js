import { format } from 'date-fns'
import { UTCDate } from '@date-fns/utc'
import yaml from 'js-yaml'
import { feedPlugin } from '@11ty/eleventy-plugin-rss'
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import  markdownIt  from 'markdown-it'
import markdownItFootnote from 'markdown-it-footnote'

export default async function (eleventyConfig) {
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

    // Filter calendar events by calendar id (e.g. for project pages that show their events)
    eleventyConfig.addFilter("eventsForCalendar", function(events, calendarId) {
        if (!Array.isArray(events)) return [];
        return events.filter(e => e.calendar === calendarId);
    });

    // Human-readable name for event calendar (for labels/badges)
    eleventyConfig.addFilter("calendarDisplayName", function(calendarId) {
        const names = { "violet-folk-sings": "Violet Folk Sings", "paper-plane": "Paper Plane", "emma": "Emma Azelborn" };
        return names[calendarId] || calendarId;
    });

    // Project page URL for a calendar (from calendars data). Returns null if calendar has no projectPath.
    eleventyConfig.addFilter("calendarProjectPath", function(calendarId, calendars) {
        if (!Array.isArray(calendars)) return null;
        const cal = calendars.find((c) => c.id === calendarId);
        return cal?.projectPath ?? null;
    });

    // Google Calendar web URL for a calendar (from calendars data). For "full calendar" links.
    eleventyConfig.addFilter("calendarWebUrl", function(calendarId, calendars) {
        if (!Array.isArray(calendars)) return "#";
        const cal = calendars.find((c) => c.id === calendarId);
        return cal?.webUrl ?? "#";
    });

    // Google Maps search URL for an address (for event location links)
    eleventyConfig.addFilter("googleMapsUrl", function(address) {
        if (!address || typeof address !== "string") return "#";
        return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address.trim());
    });

    // Return a Maps URL only when the location looks like an address; otherwise null (so we don’t link "Zoom Livestream", "Online", etc.)
    eleventyConfig.addFilter("locationLinkUrl", function(location) {
        if (!location || typeof location !== "string") return null;
        const s = location.trim().toLowerCase();
        const nonAddressPatterns = [
            /^zoom\b/i, /\bzoom\b/i, /\blivestream\b/i, /\blive\s*stream\b/i,
            /\bonline\b/i, /\bvirtual\b/i, /^tbd$/i, /\bwebinar\b/i,
            /\blink\s+will\s+be\s+sent\b/i, /\bto\s+be\s+announced\b/i,
        ];
        if (nonAddressPatterns.some((re) => re.test(s))) return null;
        return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location.trim());
    });

    // Event description: preserve line breaks. If calendar sends HTML (e.g. Google), pass through; otherwise escape and convert \n to <br>.
    eleventyConfig.addFilter("descriptionToHtml", function(str) {
        if (str == null || str === "") return "";
        const s = String(str)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");
        const looksLikeHtml = /<[a-z][^>]*>/i.test(s);
        if (looksLikeHtml) {
            return s;
        }
        const escaped = s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        return escaped.replace(/\n/g, "<br>");
    });

    // Add a filter to format dates using date-fns
    eleventyConfig.addFilter(
        "date",
        (date, formatStr = "MMMM d, yyyy") => format(new UTCDate(date), formatStr)
    )

    // Format a date in Eastern time (for event listings). Use formatType: 'date' (e.g. "Wed, Feb 19, 2025"), 'time' (e.g. "3:00 PM"), or 'datetime'.
    const easternTz = "America/New_York";
    eleventyConfig.addFilter("dateEastern", (date, formatType = "date") => {
        if (!date) return "";
        const d = new Date(date);
        if (formatType === "time") {
            return new Intl.DateTimeFormat("en-US", { timeZone: easternTz, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
        }
        if (formatType === "datetime") {
            const dateStr = new Intl.DateTimeFormat("en-US", { timeZone: easternTz, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
            const timeStr = new Intl.DateTimeFormat("en-US", { timeZone: easternTz, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
            return `${dateStr} at ${timeStr}`;
        }
        return new Intl.DateTimeFormat("en-US", { timeZone: easternTz, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
    });

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

    // Lyrics filter that processes HTML and preserves empty lines between stanzas
    const stanzaHtmlToDivs = (lyricsHtml) => {
      // Handle empty paragraphs (markdown empty lines become empty <p></p> tags)
      let normalized = lyricsHtml.replace(/<p>\s*<\/p>/g, '<p class="empty-stanza-marker"></p>');
      
      // Extract all paragraphs
      const paragraphs = [];
      const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
      let match;
      
      while ((match = paraRegex.exec(normalized)) !== null) {
        const isMarker = match[0].includes('empty-stanza-marker');
        const content = match[1].trim();
        
        if (isMarker || content.length === 0) {
          paragraphs.push({ type: 'empty' });
        } else {
          paragraphs.push({ type: 'content', content: content });
        }
      }
      
      // Build result: each paragraph becomes a stanza
      // When markdown has empty lines between stanzas, markdown-it creates separate paragraphs
      // but no empty paragraph tags. We add empty stanzas between content paragraphs to preserve spacing.
      let result = '';
      
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        const prevPara = i > 0 ? paragraphs[i - 1] : null;
        
        if (para.type === 'empty') {
          // Explicit empty paragraph from markdown - add empty stanza
          if (!prevPara || prevPara.type !== 'empty') {
            result += `<div class="stanza stanza-empty"></div>`;
          }
        } else {
          // Content paragraph: add empty stanza before it if previous was also content
          // This preserves spacing from empty lines in markdown (which create separate paragraphs)
          if (prevPara && prevPara.type === 'content') {
            result += `<div class="stanza stanza-empty"></div>`;
          }
          
          // Process content stanza: split into lines
          const lines = para.content
            .split(/<br\s*\/?>(?:\s*)?|\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          if (lines.length > 0) {
            result += `<div class="stanza">` +
              lines.map(line => `<p>${line}</p>`).join('') +
              `</div>`;
          }
        }
      }
      
      return result;
    };
    
    eleventyConfig.addFilter("lyrics", stanzaHtmlToDivs);

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
            subtitle: "Thoughts on social singing, contra dancing, and other things.",
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
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
    },
}