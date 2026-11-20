/**
 * Shared helpers used across multiple Eleventy filters.
 */

// Escapes the five HTML-significant characters. Callers that also want to
// turn newlines into <br> do that themselves afterward, since that's a
// presentation choice rather than strictly part of escaping.
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}
