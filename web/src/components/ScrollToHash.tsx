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
    const id = decodeURIComponent(hash.slice(1))
    document.getElementById(id)?.scrollIntoView()
  }, [hash, pathname])

  return null
}
