type Anchor = { anchor: string; note: string }

export default function MemoryAnchors({ anchors }: { anchors: Anchor[] }) {
  if (!anchors.length) return null
  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Memory Anchors</h2>
      <ul className="space-y-3">
        {anchors.map((a, i) => (
          <li key={i}>
            <span className="font-serif text-lg text-neutral-300">— {a.anchor}</span>
            {a.note && <p className="text-sm text-neutral-500 ml-4 mt-0.5">{a.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
