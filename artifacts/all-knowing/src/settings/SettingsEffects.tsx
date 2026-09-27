import { useEffect } from 'react'
import { useSettings } from './useSettings'

/**
 * Task 112 §1 — applies the global settings that are expressed as document
 * state: text size and reduce-motion. Mounted once by the shell so every view
 * inherits them; the CSS keys off the `data-*` attributes.
 */
export function SettingsEffects() {
  const { textSize, reduceMotion } = useSettings()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.textSize = textSize
    root.dataset.reduceMotion = reduceMotion ? '1' : '0'
  }, [textSize, reduceMotion])
  return null
}
