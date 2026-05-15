import Anthropic from '@anthropic-ai/sdk'
import { validateAIOutput } from './validate'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt'
import type { AIGenerationOutput } from '@/types'

const client = new Anthropic()

export async function generateMemoryProfile(
  title: string,
  author: string,
  metadata: { synopsis?: string; publication_year?: number; tradition?: string }
): Promise<AIGenerationOutput> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(title, author, metadata) }
    ],
  })

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { text: string }).text)
    .join('')

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  const raw = JSON.parse(cleaned)
  return validateAIOutput(raw)
}
