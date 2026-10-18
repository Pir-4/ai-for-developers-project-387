import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.tsx'
import { ScrollToHash } from '../src/components/ScrollToHash.tsx'
import { landingCopy } from '../src/content/landing.ts'
import { LocaleProvider } from '../src/i18n.tsx'

const navHow = landingCopy.ru.nav.how

function renderApp(path = '/') {
  window.history.pushState({}, '', path)
  return render(
    <MantineProvider>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </MantineProvider>,
  )
}

let scrollIntoView: ReturnType<typeof vi.fn>

beforeEach(() => {
  scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hash navigation on the landing page', () => {
  it('scrolls to #how when the hero "Как это работает" button is clicked', async () => {
    const user = userEvent.setup()
    renderApp('/')

    const hero = within(screen.getByRole('main'))
    await user.click(hero.getByRole('link', { name: navHow }))

    expect(window.location.hash).toBe('#how')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(
      document.getElementById('how'),
    )
  })

  it('scrolls to #how when the landing is opened directly with the hash', () => {
    renderApp('/#how')

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(
      document.getElementById('how'),
    )
  })
})

describe('ScrollToHash across routes', () => {
  it('scrolls to the target after a client-side navigation from another route', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ScrollToHash />
        <Routes>
          <Route path="/login" element={<Link to="/#how">go</Link>} />
          <Route path="/" element={<section id="how" />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: 'go' }))

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(
      document.getElementById('how'),
    )
  })
})

describe('ScrollToHash with a malformed hash', () => {
  it('does not scroll when the hash is not valid percent-encoding', async () => {
    render(
      <MemoryRouter initialEntries={['/#%E0%A4%A']}>
        <ScrollToHash />
        <section id="how" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(document.getElementById('how')).not.toBeNull()
    })
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('ScrollToHash when the target is not there yet', () => {
  it('retries once on the next frame once the section renders', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/#how']}>
        <ScrollToHash />
      </MemoryRouter>,
    )

    expect(scrollIntoView).not.toHaveBeenCalled()

    rerender(
      <MemoryRouter initialEntries={['/#how']}>
        <ScrollToHash />
        <section id="how" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
    })
    expect(scrollIntoView.mock.instances[0]).toBe(
      document.getElementById('how'),
    )
  })
})
