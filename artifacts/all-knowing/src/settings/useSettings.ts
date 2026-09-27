import { useSyncExternalStore } from 'react'
import { getSettings, subscribeSettings, type Settings } from './store'

/** Subscribe a component to the device settings document. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings)
}
