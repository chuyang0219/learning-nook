import type { AIGenerationOutput } from '@/types'

const VALID_TYPES = new Set([
  'author', 'publication_century', 'opening_line', 'major_character',
  'character_relationship', 'quote_attribution', 'quote_completion',
  'quote_verbatim', 'theme_identifier', 'setting', 'title_from_quote',
  'cultural_trivia',
])

const VALID_IMPORTANCE = new Set(['iconic', 'strong', 'secondary'])

export function validateAIOutput(raw: unknown): AIGenerationOutput {
  if (!raw || typeof raw !== 'object') throw new Error('AI output must be an object')
  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.memory_anchors)) throw new Error('memory_anchors must be an array')
  if (!Array.isArray(obj.recall_items)) throw new Error('recall_items must be an array')

  for (const item of obj.recall_items) {
    if (!item || typeof item !== 'object') throw new Error('Each recall_item must be an object')
    const ri = item as Record<string, unknown>
    if (!VALID_TYPES.has(ri.type as string)) throw new Error(`Invalid recall type: ${ri.type}`)
    if (!VALID_IMPORTANCE.has(ri.importance as string)) throw new Error(`Invalid importance: ${ri.importance}`)
    if (typeof ri.prompt !== 'string') throw new Error('prompt must be a string')
    if (typeof ri.answer !== 'string') throw new Error('answer must be a string')
  }

  return obj as unknown as AIGenerationOutput
}
