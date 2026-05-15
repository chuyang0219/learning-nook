interface Props {
  correct: boolean
  correctAnswer: string
  onNext: () => void
  isLast: boolean
}

export default function GradeReveal({ correct, correctAnswer, onNext, isLast }: Props) {
  return (
    <div className="mt-8 pt-8 border-t border-neutral-800">
      <p className={`text-sm font-medium mb-3 ${correct ? 'text-neutral-300' : 'text-neutral-500'}`}>
        {correct ? '✓' : '✗'}
      </p>
      {!correct && (
        <p className="font-serif text-xl text-neutral-300 mb-5 leading-relaxed">
          {correctAnswer}
        </p>
      )}
      <button
        onClick={onNext}
        className="text-sm text-neutral-500 hover:text-neutral-100 transition-colors"
      >
        {isLast ? 'Finish' : 'Next →'}
      </button>
    </div>
  )
}
