function ordinal(n: number): string {
  const last2 = n % 100
  // handle 11-13 (teens always "th")
  if (last2 >= 11 && last2 <= 13) return `${n}th`
  const last1 = n % 10
  if (last1 === 1) return `${n}st`
  if (last1 === 2) return `${n}nd`
  if (last1 === 3) return `${n}rd`
  return `${n}th`
}

export function derivePublicationCentury(year: number): string {
  const n = Math.ceil(year / 100)
  return `${ordinal(n)} century`
}

export interface ParsedMetadata {
  title: string
  author: string
  publication_year: number | null
  publication_century: string
}

export function parseOpenLibraryResponse(raw: Record<string, unknown>): ParsedMetadata {
  const title = String(raw.title ?? '')
  const authorNames = raw.author_name as string[] | undefined
  const author = authorNames?.[0] ?? ''
  const year = typeof raw.first_publish_year === 'number' ? raw.first_publish_year : null

  return {
    title,
    author,
    publication_year: year,
    publication_century: year ? derivePublicationCentury(year) : 'Unknown century',
  }
}

export async function fetchOpenLibraryMetadata(
  title: string,
  author?: string
): Promise<ParsedMetadata | null> {
  const query = author ? `${title} ${author}` : title
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,first_publish_year`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const doc = data?.docs?.[0]
    if (!doc) return null
    return parseOpenLibraryResponse(doc)
  } catch {
    return null
  }
}
