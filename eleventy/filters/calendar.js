/**
 * Calendar-related filters: event filtering and calendar metadata from calendars data.
 */
export default function (eleventyConfig) {
    eleventyConfig.addFilter('eventsForCalendar', function (events, calendarId) {
        if (!Array.isArray(events)) return []
        return events.filter((e) => e.calendar === calendarId)
    })

    eleventyConfig.addFilter('calendarDisplayName', function (calendarId, calendars) {
        if (!Array.isArray(calendars)) return calendarId
        const cal = calendars.find((c) => c.id === calendarId)
        return cal?.displayName ?? calendarId
    })

    eleventyConfig.addFilter('calendarProjectPath', function (calendarId, calendars) {
        if (!Array.isArray(calendars)) return null
        const cal = calendars.find((c) => c.id === calendarId)
        return cal?.projectPath ?? null
    })

    eleventyConfig.addFilter('calendarWebUrl', function (calendarId, calendars) {
        if (!Array.isArray(calendars)) return '#'
        const cal = calendars.find((c) => c.id === calendarId)
        return cal?.webUrl ?? '#'
    })
}
