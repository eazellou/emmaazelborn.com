/**
 * Event display filters: location links, description HTML, Eastern-time date formatting.
 */

import { escapeHtml } from './utils.js'

const EASTERN_TZ = 'America/New_York'

// Shared Intl.DateTimeFormat option sets, reused by dateEastern below.
const DATE_PART_OPTIONS = {
    timeZone: EASTERN_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
}
const TIME_PART_OPTIONS = {
    timeZone: EASTERN_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
}

// Constructing an Intl.DateTimeFormat is relatively expensive, so build these
// once at module scope and reuse them across calls rather than per-call.
const dateFormatter = new Intl.DateTimeFormat('en-US', DATE_PART_OPTIONS)
const timeFormatter = new Intl.DateTimeFormat('en-US', TIME_PART_OPTIONS)

const NON_ADDRESS_PATTERNS = [
    /^zoom\b/i,
    /\bzoom\b/i,
    /\blivestream\b/i,
    /\blive\s*stream\b/i,
    /\bonline\b/i,
    /\bvirtual\b/i,
    /^tbd$/i,
    /\bwebinar\b/i,
    /\blink\s+will\s+be\s+sent\b/i,
    /\bto\s+be\s+announced\b/i,
]

function mapsSearchUrl(location) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location.trim())
}

export default function (eleventyConfig) {
    eleventyConfig.addFilter('googleMapsUrl', function (address) {
        if (!address || typeof address !== 'string') return '#'
        return mapsSearchUrl(address)
    })

    eleventyConfig.addFilter('locationLinkUrl', function (location) {
        if (!location || typeof location !== 'string') return null
        const s = location.trim().toLowerCase()
        if (NON_ADDRESS_PATTERNS.some((re) => re.test(s))) return null
        return mapsSearchUrl(location)
    })

    eleventyConfig.addFilter('descriptionToHtml', function (str) {
        if (str == null || str === '') return ''
        const s = String(str).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        if (/<[a-z][^>]*>/i.test(s)) return s
        return escapeHtml(s).replace(/\n/g, '<br>')
    })

    // Event dates use raw Intl + a fixed Eastern timezone here instead of the
    // date-fns + @date-fns/utc combo used for content dates (see the `date`
    // filter in eleventy.config.js). Content dates (posts, projects) are
    // date-only values with no meaningful timezone, so they're formatted as
    // UTC to avoid off-by-one-day shifts. Event times are genuinely
    // timezone-bound — they represent a specific instant that should always
    // display in Eastern regardless of server/viewer timezone — which is a
    // different problem best solved with Intl's built-in timeZone support.
    eleventyConfig.addFilter('dateEastern', (date, formatType = 'date') => {
        if (!date) return ''
        const d = new Date(date)
        if (formatType === 'time') {
            return timeFormatter.format(d)
        }
        if (formatType === 'datetime') {
            return `${dateFormatter.format(d)} at ${timeFormatter.format(d)}`
        }
        return dateFormatter.format(d)
    })
}
