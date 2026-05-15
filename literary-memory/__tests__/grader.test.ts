import { describe, it, expect } from 'vitest'
import {
  normaliseText,
  quoteMatches,
  transitionMastery,
  computeNextDue,
} from '../lib/grader'

describe('normaliseText', () => {
  it('lowercases and strips punctuation', () => {
    expect(normaliseText('Hello, World!')).toBe('hello world')
  })
  it('collapses whitespace', () => {
    expect(normaliseText('  two   spaces  ')).toBe('two spaces')
  })
})

describe('quoteMatches', () => {
  it('returns true for identical strings', () => {
    const q = 'Whatever our souls are made of his and mine are the same'
    expect(quoteMatches(q, q)).toBe(true)
  })
  it('returns true with minor punctuation difference', () => {
    expect(quoteMatches(
      'Whatever our souls are made of his and mine are the same',
      'Whatever our souls are made of, his and mine are the same.'
    )).toBe(true)
  })
  it('returns false for paraphrase', () => {
    expect(quoteMatches(
      'Our souls are one and the same',
      'Whatever our souls are made of, his and mine are the same.'
    )).toBe(false)
  })
  it('exact short quote matches', () => {
    expect(quoteMatches('Call me Ishmael', 'Call me Ishmael.')).toBe(true)
  })
  it('wrong short quote does not match', () => {
    expect(quoteMatches('Call me Bob', 'Call me Ishmael.')).toBe(false)
  })
})

describe('transitionMastery', () => {
  it('unfamiliar → learning after 1 correct', () => {
    expect(transitionMastery('unfamiliar', true, 0, 0)).toEqual({
      mastery: 'learning',
      consecutiveCorrect: 1,
      consecutiveWrong: 0,
    })
  })
  it('learning → stable after 3 consecutive correct', () => {
    expect(transitionMastery('learning', true, 2, 0)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 3,
      consecutiveWrong: 0,
    })
  })
  it('stable stays stable at 4 consecutive correct', () => {
    expect(transitionMastery('stable', true, 3, 0)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 4,
      consecutiveWrong: 0,
    })
  })
  it('stable → mastered after 5 consecutive correct', () => {
    expect(transitionMastery('stable', true, 4, 0)).toEqual({
      mastery: 'mastered',
      consecutiveCorrect: 5,
      consecutiveWrong: 0,
    })
  })
  it('mastered → stable after 2 consecutive wrong', () => {
    expect(transitionMastery('mastered', false, 0, 1)).toEqual({
      mastery: 'stable',
      consecutiveCorrect: 0,
      consecutiveWrong: 2,
    })
  })
  it('unfamiliar stays unfamiliar with 2 consecutive wrong', () => {
    expect(transitionMastery('unfamiliar', false, 0, 1)).toEqual({
      mastery: 'unfamiliar',
      consecutiveCorrect: 0,
      consecutiveWrong: 2,
    })
  })
  it('correct resets consecutive_wrong', () => {
    const result = transitionMastery('stable', true, 0, 3)
    expect(result.consecutiveWrong).toBe(0)
  })
  it('wrong resets consecutive_correct', () => {
    const result = transitionMastery('stable', false, 4, 0)
    expect(result.consecutiveCorrect).toBe(0)
  })
})

describe('computeNextDue', () => {
  const now = new Date('2026-05-14T12:00:00Z')

  it('wrong unfamiliar → 10 minutes', () => {
    const due = computeNextDue('unfamiliar', 'strong', false, now)
    expect(due.getTime() - now.getTime()).toBe(10 * 60 * 1000)
  })
  it('correct unfamiliar → 1 day', () => {
    const due = computeNextDue('unfamiliar', 'strong', true, now)
    expect(due.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000)
  })
  it('iconic items resurface sooner than strong', () => {
    const strong = computeNextDue('mastered', 'strong', true, now)
    const iconic = computeNextDue('mastered', 'iconic', true, now)
    expect(iconic.getTime()).toBeLessThan(strong.getTime())
  })
  it('secondary items resurface later than strong', () => {
    const strong = computeNextDue('stable', 'strong', true, now)
    const secondary = computeNextDue('stable', 'secondary', true, now)
    expect(secondary.getTime()).toBeGreaterThan(strong.getTime())
  })
  it('correct mastered → ~30 days for strong', () => {
    const due = computeNextDue('mastered', 'strong', true, now)
    const days = (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBeCloseTo(30, 0)
  })
})
