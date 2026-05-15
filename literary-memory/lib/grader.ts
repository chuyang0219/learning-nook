import type { MasteryState, ImportanceLevel } from '@/types'

export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normaliseText(a).split(' '))
  const tokensB = new Set(normaliseText(b).split(' '))
  let overlap = 0
  tokensA.forEach(t => { if (tokensB.has(t)) overlap++ })
  return overlap / Math.max(tokensA.size, tokensB.size)
}

export function quoteMatches(answer: string, correct: string): boolean {
  const normCorrect = normaliseText(correct)
  const wordCount = normCorrect.split(' ').length
  const threshold = wordCount < 10 ? 0.95 : 0.90
  return tokenOverlap(answer, correct) >= threshold
}

interface MasteryTransitionResult {
  mastery: MasteryState
  consecutiveCorrect: number
  consecutiveWrong: number
}

export function transitionMastery(
  current: MasteryState,
  correct: boolean,
  consecutiveCorrect: number,
  consecutiveWrong: number
): MasteryTransitionResult {
  const order: MasteryState[] = ['unfamiliar', 'learning', 'stable', 'mastered']
  const idx = order.indexOf(current)

  if (correct) {
    const newConsec = consecutiveCorrect + 1
    const thresholds: Record<MasteryState, number> = {
      unfamiliar: 1,
      learning: 3,
      stable: 5,
      mastered: Infinity,
    }
    const shouldAdvance = newConsec >= thresholds[current] && idx < order.length - 1
    return {
      mastery: shouldAdvance ? order[idx + 1] : current,
      consecutiveCorrect: newConsec,
      consecutiveWrong: 0,
    }
  } else {
    const newWrong = consecutiveWrong + 1
    const shouldRegress = newWrong >= 2 && idx > 0
    return {
      mastery: shouldRegress ? order[idx - 1] : current,
      consecutiveCorrect: 0,
      consecutiveWrong: newWrong,
    }
  }
}

const CORRECT_INTERVALS_MS: Record<MasteryState, number> = {
  unfamiliar: 1 * 24 * 60 * 60 * 1000,
  learning:   3 * 24 * 60 * 60 * 1000,
  stable:     7 * 24 * 60 * 60 * 1000,
  mastered:  30 * 24 * 60 * 60 * 1000,
}

const WRONG_INTERVALS_MS: Record<MasteryState, number> = {
  unfamiliar:      10 * 60 * 1000,
  learning:   1 * 24 * 60 * 60 * 1000,
  stable:     3 * 24 * 60 * 60 * 1000,
  mastered:   7 * 24 * 60 * 60 * 1000,
}

const IMPORTANCE_MULTIPLIERS: Record<ImportanceLevel, number> = {
  iconic:    0.7,
  strong:    1.0,
  secondary: 1.5,
}

export function computeNextDue(
  mastery: MasteryState,
  importance: ImportanceLevel,
  correct: boolean,
  now: Date = new Date()
): Date {
  const base = correct ? CORRECT_INTERVALS_MS[mastery] : WRONG_INTERVALS_MS[mastery]
  const interval = Math.round(base * IMPORTANCE_MULTIPLIERS[importance])
  return new Date(now.getTime() + interval)
}
