import { useEffect } from 'react'
import { useLocation } from 'react-router'

// React Router does not scroll to the element named by a link's hash. This
// component turns hash navigation (`/#how`) into an actual scroll, so anchor
// links work from any route. The target sections carry `scroll-margin-top`,
// which `scrollIntoView` honours, keeping the heading clear of the sticky header.
export function ScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      // A malformed hash (e.g. `#%E0%A4%A`) is not valid percent-encoding;
      // there is no element to scroll to, so leave the page as is.
      return
    }
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView()
      return
    }
    // The section may render a tick later (e.g. lazy content on a fresh route),
    // so retry once on the next frame before giving up.
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView()
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, pathname])

  return null
}
