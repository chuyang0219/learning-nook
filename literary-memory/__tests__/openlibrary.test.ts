import { describe, it, expect } from 'vitest'
import { derivePublicationCentury, parseOpenLibraryResponse } from '../lib/metadata/openlibrary'

describe('derivePublicationCentury', () => {
  it('1813 → 19th century', () => {
    expect(derivePublicationCentury(1813)).toBe('19th century')
  })
  it('1900 → 19th century', () => {
    expect(derivePublicationCentury(1900)).toBe('19th century')
  })
  it('1901 → 20th century', () => {
    expect(derivePublicationCentury(1901)).toBe('20th century')
  })
  it('2001 → 21st century', () => {
    expect(derivePublicationCentury(2001)).toBe('21st century')
  })
  it('2000 → 20th century', () => {
    expect(derivePublicationCentury(2000)).toBe('20th century')
  })
})

describe('parseOpenLibraryResponse', () => {
  it('extracts title, author, year, and century', () => {
    const raw = {
      title: 'Pride and Prejudice',
      first_publish_year: 1813,
      author_name: ['Jane Austen'],
    }
    const result = parseOpenLibraryResponse(raw)
    expect(result.title).toBe('Pride and Prejudice')
    expect(result.author).toBe('Jane Austen')
    expect(result.publication_year).toBe(1813)
    expect(result.publication_century).toBe('19th century')
  })

  it('handles missing year gracefully', () => {
    const raw = { title: 'Unknown', author_name: ['Someone'] }
    const result = parseOpenLibraryResponse(raw)
    expect(result.publication_year).toBeNull()
    expect(result.publication_century).toBe('Unknown century')
  })

  it('handles missing author', () => {
    const raw = { title: 'No Author', first_publish_year: 1900 }
    const result = parseOpenLibraryResponse(raw)
    expect(result.author).toBe('')
  })
})
