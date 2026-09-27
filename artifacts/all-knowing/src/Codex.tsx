import { LibraryBrowser } from './library/LibraryBrowser'

/**
 * Task 95 — Library › Search is now the interactive database browser that lives
 * in `src/library/`. `CodexWorkspace` stays the mount point the shell (Task 91)
 * already owns, so nothing in `App.tsx` had to move.
 *
 * The article-style Codex it replaced (and its `CodexData` pack sections) is
 * still available as small, standalone components, but it is no longer what
 * this workspace renders.
 */
export function CodexWorkspace() {
  return <LibraryBrowser />
}
