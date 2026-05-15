import { describe, it, expect } from 'vitest'
import { validateAIOutput } from '../lib/ai/validate'

describe('validateAIOutput', () => {
  it('accepts valid output', () => {
    const valid = {
      memory_anchors: ['guilt', 'Petersburg'],
      recall_items: [{
        type: 'author',
        importance: 'iconic',
        prompt: 'Who wrote Crime and Punishment?',
        answer: 'Fyodor Dostoevsky',
      }],
    }
    expect(() => validateAIOutput(valid)).not.toThrow()
  })

  it('rejects missing memory_anchors', () => {
    expect(() => validateAIOutput({ recall_items: [] })).toThrow()
  })

  it('rejects invalid recall_type', () => {
    const bad = {
      memory_anchors: [],
      recall_items: [{ type: 'INVALID', importance: 'iconic', prompt: 'Q', answer: 'A' }],
    }
    expect(() => validateAIOutput(bad)).toThrow(/recall type/)
  })

  it('rejects invalid importance level', () => {
    const bad = {
      memory_anchors: [],
      recall_items: [{ type: 'author', importance: 'legendary', prompt: 'Q', answer: 'A' }],
    }
    expect(() => validateAIOutput(bad)).toThrow(/importance/)
  })

  it('returns typed output on success', () => {
    const valid = {
      memory_anchors: ['guilt'],
      recall_items: [{ type: 'author', importance: 'iconic', prompt: 'Q', answer: 'A' }],
    }
    const result = validateAIOutput(valid)
    expect(result.memory_anchors).toEqual(['guilt'])
    expect(result.recall_items).toHaveLength(1)
  })

  it('accepts optional alternate_answers', () => {
    const valid = {
      memory_anchors: [],
      recall_items: [{
        type: 'author',
        importance: 'strong',
        prompt: 'Q',
        answer: 'A',
        alternate_answers: ['B', 'C'],
      }],
    }
    expect(() => validateAIOutput(valid)).not.toThrow()
  })
})
