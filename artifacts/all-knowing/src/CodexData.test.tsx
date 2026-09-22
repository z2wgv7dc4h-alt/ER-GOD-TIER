import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RecipesSection, SecretsSection, AcquisitionSection } from './CodexData'
import type { Recipe } from './lib/recipes'

// WikiText (used inside the cards) reads the workspace to navigate on click.
vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  return { ...actual, useWorkspace: () => ({ setSelectedMarkerId: () => {}, setModule: () => {} }) }
})

const recipes: Recipe[] = [
  { id: 'recipe:1', name: 'Fire Pot', materials: [{ name: 'Mushroom', qty: 1 }, { name: 'Smoldering Butterfly', qty: 1 }], url: '' },
]

describe('Codex data sections', () => {
  it('renders a recipe with its materials', () => {
    const html = renderToStaticMarkup(<RecipesSection query="fire pot" preloaded={recipes} />)
    expect(html).toContain('Crafting recipes')
    expect(html).toContain('Fire Pot')
    expect(html).toContain('Mushroom x1')
  })

  it('renders a wall secret', () => {
    const html = renderToStaticMarkup(
      <SecretsSection query="illusory" preloaded={[{ id: 'w1', area: 'Sage\u2019s Cave', heading: 'Acquisition', text: 'Behind an illusory wall.', url: '' }]} />,
    )
    expect(html).toContain('Secrets')
    expect(html).toContain('illusory wall')
  })

  it('renders acquisition info', () => {
    const html = renderToStaticMarkup(
      <AcquisitionSection query="larval tear" preloaded={[{ id: 'a1', name: 'Larval Tear', method: 'drop', location: 'Ainsel River', near: 'Ainsel River Main', prereqs: [], missable: false, url: '' }]} />,
    )
    expect(html).toContain('How to get it')
    expect(html).toContain('Larval Tear')
  })

  it('renders nothing for a short query', () => {
    expect(renderToStaticMarkup(<RecipesSection query="fi" preloaded={recipes} />)).toBe('')
  })
})
