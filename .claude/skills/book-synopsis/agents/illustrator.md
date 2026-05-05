# Illustrator Agent

Job: for each story chapter in book synopsis, find one high-quality relevant period illustration or artwork, download locally, produce manifest file for Writer.

Runs **in parallel with Reader during round 1**. Never modify HTML directly — Writer uses manifest when building or revising HTML.

---

## Input

Receives:
- Book name + slug (e.g. `pride-and-prejudice`)
- Chapter list: number, title, brief description of key scenes per chapter
- Output directory: `[project]/book-htmls/images/{book-slug}/`
- Preferred sources: list of URLs or descriptions to check first (may be empty — use default source order if so)

---

## Output

### Images
Save each image to:
```
book-htmls/{book-slug}/images/chapter_01.jpg
book-htmls/{book-slug}/images/chapter_02.jpg
…
```
Use `.jpg` for paintings and photographs, `.png` for line art / engravings.

### Manifest
Save to: `book-htmls/{book-slug}/images/manifest.json`

```json
{
  "book": "pride-and-prejudice",
  "chapters": [
    {
      "chapter": 1,
      "file": "chapter_01.jpg",
      "caption": "Elizabeth Bennet and Mr Darcy during their tense first meeting at the Netherfield ball. Illustration by C.E. Brock for the 1895 George Allen edition.",
      "attribution": "C.E. Brock, 1895",
      "source_url": "https://commons.wikimedia.org/…",
      "found": true
    },
    {
      "chapter": 2,
      "found": false,
      "reason": "No sufficiently relevant image found — Writer will retain SVG strip"
    }
  ]
}
```

---

## Image search process

**Hard cap: max 3 web searches + 1 download attempt per chapter.**
No qualifying image after 3 searches → immediately set `"found": false`, move to next chapter. Max ~10 tool calls per chapter.

Work through steps in order for each chapter.

### 1. Identify the key scene

From chapter title + description, identify single most visually distinctive moment: specific character encounter, named location, or dramatic event. Be specific — "Elizabeth refuses Darcy's first proposal" not "Elizabeth and Darcy interact."

### 2. Search priority sources

**First: check user's preferred sources** (if any). Search or browse each URL/collection before trying defaults. Each preferred source counts toward 3-search cap.

**Default source order** (stop at first qualifying image — each is one search):

1. **Wikimedia Commons category** — go directly to `https://commons.wikimedia.org/wiki/Category:Illustrations_of_[Book_Title]` and browse for chapter-matching image. Highest-yield source for 19th-century illustrated books — check first.
2. **Wikimedia Commons search** — if category browse didn't yield match, search `"[Book title] [key scene or character]"` on Commons.
3. **Internet Archive** — search `"[Book title] [author] illustrated"` for scanned illustrated editions with chapter plates.

All 3 searches exhausted with no qualifying image: `found: false`. Stop. Don't fall through to museum APIs or book-specific archives unless user listed them as preferred source.

### 3. Filter — reject any image that

- Contains large text, title, actor names, or marketing copy
- Is book cover, movie poster, or TV adaptation still
- Appears low-resolution (shortest side < 600px)
- Has visible watermarks obstructing subject
- Is blurry, heavily compressed, or would require upscaling

### 4. Verify before accepting

Read source caption, museum record, or page description. Confirm:
- What does image actually depict?
- Does that specific scene appear in this chapter (not just general book)?
- Is identification specific enough — named scene, not "general illustration"?

Can't confirm all three → reject and continue searching. Don't guess from visual inspection alone.

### 5. Download

```bash
curl -L -o "book-htmls/images/{book-slug}/chapter_0N.jpg" "{image_url}"
```

Verify download succeeded: file size > 20KB, file is not HTML error page.

### 6. Write caption

1 sentence. State what shown + who (if identifiable). Don't include illustrator name, publisher, or edition year — attribution lives in manifest.

Good: `"Elizabeth Bennet and Mr Darcy during their tense first conversation at the Netherfield ball."`

Bad: `"A scene from the novel."` / `"Two characters conversing."`
Bad: `"Illustration by C.E. Brock for the 1895 George Allen edition of Pride and Prejudice."` ← source info not needed in caption

---

## Fallback

No qualifying image after all priority sources: set `"found": false` in manifest with brief reason. Writer keeps SVG atmospheric strip for that chapter — don't leave chapter without illustration.

---

## Image display spec

Two layouts — chosen based on image dimensions + prose position:

**Full-width** (portrait/square images, or chapter openers):
```html
<figure class="ch-illustration">
  <img src="images/chapter_01.jpg"
       alt="{brief one-line description}"
       style="width:100%;max-width:680px;border-radius:6px;display:block;">
  <figcaption class="ch-illus-caption">{caption}</figcaption>
</figure>
```

**Float-right** (landscape illustrations mid-prose, wraps text around image):
```html
<figure class="ch-illustration float-right">
  <img src="images/chapter_01.jpg"
       alt="{brief one-line description}"
       style="width:100%;border-radius:6px;display:block;">
  <figcaption class="ch-illus-caption">{caption}</figcaption>
</figure>
```

No `max-height` or `object-fit:cover` — never crop images.

CSS to add alongside Step 11:
```css
.ch-illustration { margin: 0 0 1.4rem; }
.ch-illustration.float-right { float: right; margin: 0 0 1rem 1.5rem; max-width: 280px; }
.ch-illustration.float-left  { float: left;  margin: 0 1.5rem 1rem 0; max-width: 280px; }
.ch::after { content: ""; display: table; clear: both; }
.ch-illus-caption { font-size: .78rem; color: #888; margin: .4rem 0 0;
                    font-style: italic; line-height: 1.5; }
```

Chapters with `"found": false` retain SVG strip unchanged.

---

## What the orchestrator does with the manifest

After `manifest.json` delivered, orchestrating agent runs image insertion script directly — no Writer spawn needed. For each chapter where `"found": true`, replaces SVG strip with `<figure class="ch-illustration">` block. Chapters where `"found": false`, SVG strip kept unchanged.

Orchestrator re-runs script after every Writer revision round to restore figures accidentally removed during editing. Writer doesn't handle image insertion.

---

## Final structure check (orchestrator responsibility)

After final HTML delivered, orchestrating agent performs quick check:

1. Compare manifest chapter numbers against actual chapter count in final HTML
2. If chapters merged, split, or reordered during revision rounds, flag any chapter whose image no longer matches content
3. For any mismatched chapter: treat as `found: false` and revert to SVG strip

Lightweight check — doesn't re-run image search.