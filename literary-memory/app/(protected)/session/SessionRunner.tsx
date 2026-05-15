'use client'
import { useState } from 'react'
import PromptCard from '@/components/session/PromptCard'
import AnswerInput from '@/components/session/AnswerInput'
import GradeReveal from '@/components/session/GradeReveal'
import SessionEnd from '@/components/session/SessionEnd'
import { submitAnswer } from '@/actions/session'
import type { SessionItem, Book } from '@/types'

interface Props {
  items: SessionItem[]
  allBooks: Book[]
}

export default function SessionRunner({ items, allBooks }: Props) {
  const [index, setIndex] = useState(0)
  const [grade, setGrade] = useState<{ correct: boolean; correctAnswer: string } | null>(null)
  const [recalled, setRecalled] = useState(0)
  const [missed, setMissed] = useState(0)
  const [done, setDone] = useState(false)

  if (done) {
    return <SessionEnd recalled={recalled} missed={missed} />
  }

  const current = items[index]

  async function handleAnswer(answer: string) {
    const result = await submitAnswer(current.recallItem.id, answer)
    setGrade(result)
    if (result.correct) setRecalled(r => r + 1)
    else setMissed(m => m + 1)
  }

  function handleNext() {
    if (index + 1 >= items.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setGrade(null)
    }
  }

  return (
    <div>
      <PromptCard item={current.recallItem} book={current.book} />
      <AnswerInput
        item={current.recallItem}
        allBooks={allBooks}
        onSubmit={handleAnswer}
        disabled={!!grade}
      />
      {grade && (
        <GradeReveal
          correct={grade.correct}
          correctAnswer={grade.correctAnswer}
          onNext={handleNext}
          isLast={index + 1 >= items.length}
        />
      )}
      <p className="text-xs text-neutral-700 mt-12">{index + 1} / {items.length}</p>
    </div>
  )
}
