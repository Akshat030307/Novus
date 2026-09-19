/**
 * Fullscreen when a game starts. Browsers only allow this from inside a
 * click, so it must be called synchronously from the Start / Continue
 * handler — before any await.
 *
 * Page fullscreen normally hands Escape to the browser (press once, you're
 * out). Escape is the game's "close what's open" key, so where the Keyboard
 * Lock API exists (Chrome, Edge) Escape is locked to the page instead, and
 * leaving fullscreen becomes "hold Escape" — the browser says so on entry.
 * Elsewhere a single Escape leaves fullscreen as usual, and the game still
 * works in a window.
 */

interface KeyboardLock {
  lock?: (keys?: string[]) => Promise<void>
}

export function enterFullscreen(): void {
  const el = document.documentElement
  if (document.fullscreenElement || !el.requestFullscreen) return
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard?.lock?.(['Escape']))
    .catch(() => {
      // refused (an iframe, a browser setting, a denied permission) — the game runs in a window
    })
}
