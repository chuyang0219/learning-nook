---
name: update-index
description: Use when adding a book to the library shelf, updating an entry in the BOOKS catalogue, fixing how a book spine looks (colour, title overflow, sizing), or checking whether a book is already listed. Trigger on "add X to the index", "add X to the shelf", "update the book catalogue", "fix the spine for Y", or any task that touches index.html's BOOKS array. Also trigger after a book synopsis is freshly created and needs to appear on the shelf.
---

# update-index

The library shelf is `index.html`. Books are entries in the `BOOKS` array rendered as 3D spines by a React component (Babel CDN, no build step).

## Locating the catalogue

```bash
grep -n "BOOK CATALOGUE" index.html   # jump to the array
```

The `BOOKS` array starts around line 29. Entries are **ordered alphabetically by `authorLast`**.

## Workflow for adding a book

1. Check the book isn't already listed: `grep "Actual Book Title" index.html` (substitute the real title)
2. Copy any existing `{ ... }` entry block
3. Fill in **all** fields (see reference below) — leaving any field out will cause rendering errors
4. Insert in the correct alphabetical position by `authorLast`
5. Verify in a browser (checklist at the bottom)

## Field reference

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | **Full title — never abbreviated.** Displayed on the spine. |
| `author` | string | Full name, e.g. `"Robert Louis Stevenson"` |
| `authorLast` | string | Surname only — shown on spine; determines sort order |
| `year` | string | Publication year; use `"c. 1600"` for approximate dates |
| `href` | string | `"classic-books/<slug>/<slug>.html"` — must match actual file |
| `cloth` | hex | Main spine colour |
| `foil` | hex | Text + decorative line colour (typically gold or cream) |
| `accent` | hex | Edge/shadow colour — usually a darker shade of `cloth` |
| `height` | 0.75–1.0 | Spine height as fraction of max (320 × height px). **See title-length rule below.** |
| `thickness` | 36–70 | Spine width in px. Reflects how long the book is. Min 36 for any book. |
| `style` | string | `"leather"` · `"cloth"` · `"paper"` — spine texture |
| `wear` | 0–1 | 0 = pristine, 1 = heavily worn/cracked |
| `lean` | number | Leave as `0` |
| `age` | string | `"weathered"` · `"faded"` · `"normal"` — colour filter applied |

## Title length → height (critical)

The title is rendered rotated 90° in a zone that spans 46% of the spine height. If the book is too short, a long title won't fit and will overflow onto the author name or get clipped at the spine edge.

| Title character count | Minimum `height` | What happens at the right height |
|-----------------------|-----------------|----------------------------------|
| ≤ 20 chars | 0.75 | Large font (13–18px), single line, lots of breathing room |
| 21–30 chars | 0.85 | 13px, single line |
| 31–40 chars | 0.93 | 13px, single line, tight |
| 41+ chars | **1.0** | Font drops to 11px and wraps to 2 lines |

For 41+ char titles that wrap to 2 lines: check that the title breaks naturally at a word boundary into two balanced halves. The longest half should be ≤ ~22 chars for a clean 2-line result. If the split is very uneven (e.g. one line is 30 chars, the other is 8), the wrapped spine looks awkward — consider whether `thickness` should be slightly wider (≥ 40px) to give the text columns more visual weight.

**Never abbreviate or shorten the title.** The rendering code handles long titles automatically via font scaling and wrapping.

## Colour and texture guidance

`cloth`/`foil`/`accent` can be any colours — pick something that feels right for the book's era, tone, and nationality. The only constraint: the new spine should look distinct from its neighbours on the shelf (read the existing entries to see what colours are already taken).

**Principles:**
- `cloth` sets the mood — dark jewel tones (forest green, burgundy, navy, slate) look like aged books; avoid bright/saturated colours
- `foil` is usually gold, warm cream, or pale bronze — it's the metallic stamping, so it should have shimmer against the cloth
- `accent` is almost always a very dark shade of `cloth` — it forms the spine edge shadow

**A few working combinations for inspiration:**
- Dark green `#2c3a2e` + gold `#b8a86a` + near-black `#131a14` → old botanical / Victorian naturalist
- Deep red `#5b1a1a` + warm gold `#caa754` + dark red `#2a0808` → Victorian drama / Russian literature
- Navy `#3a4a6b` + cream `#cdb074` + dark navy `#1d2538` → classic academic
- Slate grey `#3a3a42` + pale silver-gold `#c8b87a` + near-black `#1a1a20` → modernist / philosophical
- Warm ochre `#6b4a1a` + cream `#e8d4a0` + dark brown `#2e1e08` → Oriental / ancient texts

For `age` and `wear`: older/classic works suit `"weathered"` + `wear: 0.6–0.8`; mid-century or lighter works suit `"faded"` + `wear: 0.3–0.5`; contemporary works can use `"normal"` + `wear: 0.2–0.4`.

## After-add checklist

Open `index.html` directly in a browser (no server needed) and verify:

- [ ] Spine colour and texture look intentional and distinct from neighbours
- [ ] Full title visible — not cut off, not overlapping the author name
- [ ] If title is 41+ chars: renders on exactly 2 lines, not 3 or more
- [ ] Author surname visible below the lower decorative bar
- [ ] Year stamp visible at the foot of the spine
- [ ] Clicking the spine navigates to the correct book page
