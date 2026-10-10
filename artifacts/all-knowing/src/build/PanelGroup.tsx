import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Task 197 §3 — the collapsible panels on Library › Builds should all be open on
 * a desktop (so the tools are visible at a glance) but behave as a one-at-a-time
 * accordion on a phone (so the page does not become a wall of stacked sections).
 *
 * The breakpoint is the app's shared 700px phone line (see `LibraryBrowser.tsx`).
 * In a non-DOM render (`renderToStaticMarkup`, the node test env) `matchMedia`
 * does not exist, so the hook reports desktop — the tests read the open markup.
 */

const PHONE_QUERY = '(max-width: 700px)'

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(PHONE_QUERY).matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

export type PanelGroupState = {
  isPhone: boolean
  /** On phone, the single open panel id; desktop ignores it. */
  openId: string | null
  setOpenId: (id: string | null) => void
}

const PanelGroupContext = createContext<PanelGroupState | null>(null)

/** Wraps a set of collapsible panels so they can be open (desktop) or an accordion (phone). */
export function PanelGroup({ children }: { children: ReactNode }) {
  const isPhone = useIsPhone()
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <PanelGroupContext.Provider value={{ isPhone, openId, setOpenId }}>
      {children}
    </PanelGroupContext.Provider>
  )
}

/** Null when a panel is rendered outside a group (tests, or a standalone mount). */
export function usePanelGroup(): PanelGroupState | null {
  return useContext(PanelGroupContext)
}
