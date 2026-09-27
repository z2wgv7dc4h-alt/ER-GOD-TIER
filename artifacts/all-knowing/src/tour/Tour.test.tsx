import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TOUR_STEPS, markTourSeen, resetTourSeen } from './tourStore'
import { Tour, TourCoach } from './Tour'

describe('Tour overlay (Task 117)', () => {
  it('renders a coach mark with a step counter and the action', () => {
    const html = renderToStaticMarkup(
      <TourCoach step={TOUR_STEPS[0]} index={0} total={TOUR_STEPS.length} onNext={() => {}} onSkip={() => {}} />,
    )
    expect(html).toContain('Step 1 of 5')
    expect(html).toContain('Tarnished')
    expect(html).toContain('Next')
    expect(html).toContain('Skip')
  })

  it('labels the last step Done', () => {
    const last = TOUR_STEPS.length - 1
    const html = renderToStaticMarkup(
      <TourCoach step={TOUR_STEPS[last]} index={last} total={TOUR_STEPS.length} onNext={() => {}} onSkip={() => {}} />,
    )
    expect(html).toContain('Step 5 of 5')
    expect(html).toContain('Done')
  })

  it('auto-opens only while it has not been seen', () => {
    resetTourSeen()
    expect(renderToStaticMarkup(<Tour />)).toContain('Step 1 of 5')
    markTourSeen()
    expect(renderToStaticMarkup(<Tour />)).toBe('')
    resetTourSeen()
  })
})
