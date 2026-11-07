// Mobile navigation toggle
function initMobileNav() {
    const hamburger = document.querySelector('.hamburger-menu')
    const mobileNav = document.querySelector('.mobile-nav-menu')
    if (!hamburger || !mobileNav) return

    hamburger.addEventListener('click', function () {
        hamburger.classList.toggle('active')
        mobileNav.classList.toggle('active')
    })

    // Close mobile menu when clicking on a link
    const mobileNavLinks = mobileNav.querySelectorAll('a')
    mobileNavLinks.forEach((link) => {
        link.addEventListener('click', function () {
            hamburger.classList.remove('active')
            mobileNav.classList.remove('active')
        })
    })
}

// In-page anchor links (e.g. "#audio-production") need manual scrolling because
// .page-content, not the document, is the scrolling container.
function initAnchorScroll() {
    function scrollToHash(hash) {
        if (!hash) return
        const target = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const anchorLinks = document.querySelectorAll('a[href^="#"]')
    if (anchorLinks.length === 0 && !window.location.hash) return

    anchorLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            const hash = this.getAttribute('href')
            if (!hash || hash === '#') return
            e.preventDefault()
            scrollToHash(hash)
            history.pushState(null, '', hash)
        })
    })

    if (window.location.hash) {
        scrollToHash(window.location.hash)
    }
}

// Expand/collapse event descriptions (toggle: read more… / show less)
function initEventExpandCollapse() {
    const toggles = document.querySelectorAll('.event-description-toggle')
    if (toggles.length === 0) return

    toggles.forEach((btn) => {
        btn.addEventListener('click', function () {
            const wrap = this.previousElementSibling
            if (!wrap || !wrap.classList.contains('event-description-wrap')) return
            const isExpanded = wrap.classList.contains('event-description--expanded')
            if (isExpanded) {
                wrap.classList.remove('event-description--expanded')
                wrap.classList.add('event-description--truncated')
                this.setAttribute('aria-expanded', 'false')
                this.setAttribute('aria-label', 'Expand description')
                this.textContent = 'read more…'
            } else {
                wrap.classList.remove('event-description--truncated')
                wrap.classList.add('event-description--expanded')
                this.setAttribute('aria-expanded', 'true')
                this.setAttribute('aria-label', 'Collapse description')
                this.textContent = 'show less'
            }
        })
    })
}

// Toggle between structural and full song lyrics
function initLyricsToggle() {
    const toggleButtons = document.querySelectorAll('.song-lyrics-toggle-button')
    if (toggleButtons.length === 0) return

    toggleButtons.forEach((btn) => {
        btn.addEventListener('click', function () {
            const wrap = this.closest('.song-lyrics-toggle').parentElement
            const structural = wrap.querySelector('.song-lyrics[data-lyrics-view="structural"]')
            const full = wrap.querySelector('.song-lyrics[data-lyrics-view="full"]')
            if (!structural || !full) return
            const showingFull = this.getAttribute('aria-pressed') === 'true'
            if (showingFull) {
                full.hidden = true
                structural.hidden = false
                this.setAttribute('aria-pressed', 'false')
                this.textContent = 'Show full lyrics'
            } else {
                structural.hidden = true
                full.hidden = false
                this.setAttribute('aria-pressed', 'true')
                this.textContent = 'Show structural lyrics'
            }
        })
    })
}

// Only show expand button when description actually overflows 2 lines (run after layout)
function initOverflowDetection() {
    const wraps = document.querySelectorAll('.event-description-wrap.event-description--truncated')
    if (wraps.length === 0) return

    function hideUnneededExpandButtons() {
        wraps.forEach((wrap) => {
            const btn = wrap.nextElementSibling
            if (btn && btn.classList.contains('event-description-toggle')) {
                if (wrap.scrollHeight <= wrap.clientHeight + 2) {
                    wrap.classList.remove('event-description--truncated')
                    wrap.classList.add('event-description--expanded')
                    btn.style.display = 'none'
                }
            }
        })
    }
    requestAnimationFrame(function () {
        requestAnimationFrame(hideUnneededExpandButtons)
    })
}

document.addEventListener('DOMContentLoaded', function () {
    initMobileNav()
    initAnchorScroll()
    initEventExpandCollapse()
    initLyricsToggle()
    initOverflowDetection()
})
