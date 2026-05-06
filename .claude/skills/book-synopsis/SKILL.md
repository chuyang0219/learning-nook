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
  5. In parallel: Spawn Reader + Spawn Illustrator.
     - Reader: critiques HTML, returns APPROVED or NEEDS REVISION.
     - Illustrator: finds images, saves manifest.json.

Image insertion (orchestrator — no Writer spawn needed):
  6. Once Illustrator finishes: run image insertion script below.
     For chapters with found: true → replace SVG strip with <figure>.
     For chapters with found: false → keep SVG strip unchanged.
     If Illustrator hasn't finished by the time Round 2 Writer is needed,
     run Writer revision first, then insert images afterwards.

Round 2 (only if Reader returned NEEDS REVISION):
  7. Spawn Writer (round 2) with Reader feedback.
  8. Re-run image insertion script.
  9. Spawn Reader (round 2).

Round 3 (only if Reader round 2 returns NEEDS REVISION):
  10. Spawn Writer (round 3, final). Re-run image insertion after.
  11. Deliver regardless of verdict.

Final check:
  12. Compare manifest chapter count vs final HTML chapter count.
      Revert mismatched chapter images to SVG strips.
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
    svg_end = block.find("</svg>", svg_start) + len("</svg>")
    figure = (
        '<figure class="ch-illustration">\n'
        f'  <img src="images/chapter_{n:02d}.jpg"\n'
        f'       alt="{ch["caption"]}"\n'
        '       style="width:100%;max-width:680px;border-radius:6px;display:block;">\n'
        f'  <figcaption class="ch-illus-caption">{ch["caption"]}'
        f' <span style="opacity:.6">— {ch["attribution"]}</span></figcaption>\n'
        '</figure>'
    )
    block = block[:svg_start] + figure + block[svg_end:]
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
- When the user says "continue", re-spawn that agent from where it failed. Same prompt — do not restart the whole process.

---

## Output paths

HTML: `classic-books/<slug>/<slug>.html`
Images: `classic-books/<slug>/images/chapter_0N.jpg` + `manifest.json`
