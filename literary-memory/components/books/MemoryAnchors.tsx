export default function MemoryAnchors({ anchors }: { anchors: string[] }) {
  if (!anchors.length) return null
  return (
    <section className="mb-10">
      <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-4">Memory Anchors</h2>
      <ul className="space-y-1">
        {anchors.map((anchor, i) => (
          <li key={i} className="font-serif text-lg text-neutral-300">— {anchor}</li>
        ))}
      </ul>
    </section>
  )
}
