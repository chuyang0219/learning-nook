---
name: book-synopsis
description: >
  Creates a self-contained interactive HTML synopsis for any famous book, play,
  or novel — paginated, illustrated, with sidebar navigation, character tooltips
  (including pronunciation and audio), contextually placed quotes, a thematic
  essay page, and a quiz. Use this skill whenever the user asks to summarise a
  famous book, wants a "synopsis HTML", says "do the same thing as Crime and
  Punishment for [book]", or wants an interactive reading companion for any
  literary work. Works for novels, plays, and long-form narrative non-fiction.
---

# Book synopsis HTML skill

Produces a single self-contained `.html` file that works as a beautifully
designed reading companion — not a Wikipedia summary. The output should feel
like reading the book itself, compressed and illuminated.

---

## Agents

- **Doodles the Designer** — derives bespoke visual identity from the Research Brief. Full spec: `agents/designer.md`
- **Willy the Writer** — produces the HTML synopsis. Full spec: `agents/writer.md`
- **Matilda the Reader** — evaluates the HTML cold, returns verdict. Full spec: `agents/reader.md`
- **Arty the Illustrator** — finds period illustrations, downloads them, outputs a manifest. Full spec: `agents/illustrator.md`

Read all four agent files before spawning any agent.

When announcing agent activity, always use the full name+role — e.g. "Spawning Doodles the Designer now" or "Matilda the Reader has flagged some revisions". Never use the first name alone.

---

## Flow

```
Before Phase 0 — Ask the user one question:

  "Any preferred image sources for illustrations? e.g. a specific Wikimedia
  category, a museum collection URL, an illustrated edition on Internet Archive.
  Leave blank to use the default search order."

  Record as: preferred_sources (list of URLs/descriptions, may be empty).

Phase 0 — Pre-research and design:
  1. Run web searches in parallel:
     - "[Book title] [Author] plot summary"
     - "[Book title] famous quotes"
     - Goodreads quotes page for the book — note top ~8 by likes
     - "[Book title] characters"
     - Wikipedia page for the work
     - SparkNotes or LitCharts if available
  2. Compile Research Brief (format below).
  3. Spawn Designer with Research Brief → produces Design Spec.

Round 1:
  4. Spawn Writer with Research Brief + Design Spec → saves HTML.
  5. Spawn Reader. Wait for verdict before spawning Illustrator.
     (Running Reader and Illustrator in parallel risks rate-limit contention —
      Reader finishes in ~1 min; Illustrator takes 15–25 min and burns the budget.)
     - Reader: critiques HTML, returns APPROVED or NEEDS REVISION.
  6. Spawn Illustrator after Reader returns verdict.
     - Illustrator: finds images, saves manifest.json.
     - **Do NOT run Illustrator in background** unless the project settings pre-approve
       `Bash(curl * -o ".../classic-books/*/images/*" *)`. Background agents cannot
       prompt for permission — they will complete all searches then silently fail on
       every download, forcing a full re-run foreground (doubling search tool use).

Image insertion (orchestrator — no Writer spawn needed):
  7. Once Illustrator finishes: run image insertion script below.
     For chapters with found: true → replace SVG strip with <figure>.
     For chapters with found: false → keep SVG strip unchanged.
     If a revision round is needed before Illustrator finishes,
     run Writer revision first, then insert images afterwards.

Round 2 (only if Reader returned NEEDS REVISION):
  8. Spawn Writer (round 2) with Reader feedback.
  9. Re-run image insertion script.
  10. Spawn Reader (round 2).

Round 3 (only if Reader round 2 returns NEEDS REVISION):
  11. Spawn Writer (round 3, final). Re-run image insertion after.
  12. Deliver regardless of verdict.

Final check:
  13. Compare manifest chapter count vs final HTML chapter count (N story chapters).
      Revert mismatched chapter images to SVG strips.
      Note: total HTML pages = N + 3 (story + Why it matters + Famous Passages + Quiz).
```

---

## Research Brief format

```
RESEARCH BRIEF — [Book Title]
Author: [name] · Year: [year]
Tone: [prose register, e.g. "feverish, compressed, interior — mirror Dostoevsky"]

CHAPTER OUTLINE:
1. [Working title] — [2–3 sentence beat: what happens, what turns]
…

KEY CHARACTERS (6–12):
[Name] (pron: [STRESSED-syllable]) — [role, 1 sentence, no apostrophes]
…

KEY LOCATIONS (4–6):
[PlaceKey] — [what it is, why it matters, 1 sentence, no apostrophes]
…

VERIFIED QUOTES (10–15):
Ch[N]: "[exact text]" — [speaker, to whom, context]
…
Prioritise quotes with high Goodreads like counts. Include all top ~8 somewhere — in chapter prose if not the "Famous Passages" section.

THEMES (2–3):
- [theme]: [1–2 sentence explanation]
…
```

---

## Image insertion script

Run directly after Illustrator delivers — no Writer spawn needed:

```python
import json

slug          = "{book-slug}"
html_path     = f"classic-books/{slug}/{slug}.html"
manifest_path = f"classic-books/{slug}/images/manifest.json"

html     = open(html_path).read()
manifest = json.load(open(manifest_path))
total    = len(manifest["chapters"])

for ch in manifest["chapters"]:
    if not ch.get("found"):
        continue
    n       = ch["chapter"]
    tag     = f"<!-- CH {n} -->"
    nxt_tag = f"<!-- CH {n+1}" if n < total else "<!-- Nav"
    start   = html.find(tag)
    end     = html.find(nxt_tag, start)
    if start == -1 or end == -1:
        continue
    block     = html[start:end]
    svg_start = block.find('<svg width="680"')
    if svg_start == -1:
        continue  # already replaced
    # Find enclosing <figure class="ch-illustration"> if it wraps the SVG
    fig_open  = '<figure class="ch-illustration">'
    fig_start = block.rfind(fig_open, 0, svg_start)
    if fig_start != -1:
        fig_end = block.find("</figure>", fig_start) + len("</figure>")
        replace_start, replace_end = fig_start, fig_end
    else:
        # bare SVG fallback
        svg_end = block.find("</svg>", svg_start) + len("</svg>")
        replace_start, replace_end = svg_start, svg_end
    # Caption = brief description only — no source attribution in <figcaption>
    figure = (
        '<figure class="ch-illustration">\n'
        f'  <img src="images/chapter_{n:02d}.jpg"\n'
        f'       alt="{ch["caption"]}">\n'
        f'  <figcaption class="ch-illus-caption">{ch["caption"]}</figcaption>\n'
        '</figure>'
    )
    block = block[:replace_start] + figure + block[replace_end:]
    html  = html[:start] + block + html[end:]

open(html_path, "w").write(html)
inserted = sum(1 for c in manifest["chapters"] if c.get("found"))
print(f"Images inserted: {inserted}/{total} chapters")
```

Re-run after every Writer revision round to keep images current.

---

## Spawning instructions

### Designer

Prompt must include: book name, slug, and the full Research Brief.
Include full contents of `agents/designer.md`.

**Use the Haiku model** — the task is pure reasoning with no tool calls and a fixed output format. Haiku is 20× cheaper and equally capable for palette/font derivation.

The Designer returns a **Design Spec**. Pass this verbatim to the Writer in Round 1.

### Writer — Round 1

Prompt must include: book name, output path, Research Brief, Design Spec, full contents of `agents/writer.md`.

### Writer — Round 2+

Lean prompt only. Do NOT re-send the Research Brief, Design Spec, or full writer.md.

```
You are the Writer Agent revising an existing book synopsis HTML.

FILE: [full path to HTML]
Read the existing file before making changes. Do not truncate — rewrite the full file.

READER FEEDBACK:
[paste reader output verbatim]

RULES:
- Address every TOP FIX and CHAPTER NOTE flagged NEEDS REVISION.
- Preserve all <figure class="ch-illustration"> blocks — do not remove or replace them.
- After editing, run the div-balance script and fix any imbalances.
- Output a WHAT CHANGED section listing each fix made.
```

Include writer.md's "When revising" section if spawning the writer fresh. Omit all other steps.

### Reader

Prompt must include: the HTML file path, the book title, full contents of `agents/reader.md`.
The reader must not have seen the writer's process.

### Illustrator

Prompt must include: book name, slug, chapter list (number + title + 1-sentence scene description per chapter), output directory, preferred_sources, full contents of `agents/illustrator.md`.

---

## Rate-limit handling

If a subagent returns a rate-limit error ("You've hit your limit · resets HH:MMam"):
- Tell the user the reset time and stop.
- When the user says "continue", re-spawn that agent with the same prompt.

**Illustrator specifically:** Arty writes `manifest.json` incrementally after each chapter. On re-spawn it reads the existing manifest and skips completed chapters automatically — no work is repeated. The re-spawn prompt needs no changes; the skip logic is in `agents/illustrator.md`.

**Writer/Reader:** These do not have incremental state. Re-spawn from scratch with the same prompt.

---

## Output paths

HTML: `classic-books/<slug>/<slug>.html`
Images: `classic-books/<slug>/images/chapter_0N.jpg` + `manifest.json`
