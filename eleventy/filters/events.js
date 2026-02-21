/**
 * Event display filters: location links, description HTML, Eastern-time date formatting.
 */

const EASTERN_TZ = 'America/New_York'

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
        const escaped = s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        return escaped.replace(/\n/g, '<br>')
    })

    eleventyConfig.addFilter('dateEastern', (date, formatType = 'date') => {
        if (!date) return ''
        const d = new Date(date)
        if (formatType === 'time') {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: EASTERN_TZ,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }).format(d)
        }
        if (formatType === 'datetime') {
            const dateStr = new Intl.DateTimeFormat('en-US', {
                timeZone: EASTERN_TZ,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(d)
            const timeStr = new Intl.DateTimeFormat('en-US', {
                timeZone: EASTERN_TZ,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }).format(d)
            return `${dateStr} at ${timeStr}`
        }
        return new Intl.DateTimeFormat('en-US', {
            timeZone: EASTERN_TZ,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(d)
    })
}
