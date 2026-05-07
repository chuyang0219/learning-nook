---
name: update-books
description: Audits an existing book synopsis HTML against the current book-synopsis skill spec and applies targeted, surgical fixes. Use this skill whenever the book-synopsis skill has been updated and older synopsis pages need to be brought into compliance — or when reviewing an existing book HTML against current spec. Trigger on phrases like "update [book] html", "sync [book] to current skill", "bring [book] up to date", "audit existing synopsis", "apply skill changes to existing books", or any review/comparison of an older synopsis page against the current spec. Also triggers after any session that modifies the book-synopsis skill agents — check whether existing books need updating.
---

# Book Synopsis Update Skill

Audits an existing book synopsis HTML against the current `/book-synopsis` skill spec and applies targeted, surgical fixes. Does **not** regenerate content, replace images, rewrite prose, or touch design decisions that are intentionally book-specific.

**Always confirm with the user before applying any fix.**

---

## Step 0 — Read the current spec

Before touching any HTML, read these files in full:

```
.claude/skills/book-synopsis/agents/writer.md   ← primary reference (CSS, JS, HTML structure)
.claude/skills/book-synopsis/SKILL.md            ← flow and image insertion
```

The designer and reader agent files are not needed for an update pass — they govern new creation, not compliance checks.

Then read the target HTML file.

---

## Step 1 — Systematic audit

Work through both checklists below. For every item: state PASS, NEEDS FIX, or DRASTIC.

- **NEEDS FIX** = surgical, structural change — safe to propose
- **DRASTIC** = content/prose rewrite or major structural overhaul — flag only, do not propose applying

---

### Checklist A — Surgical fixes (propose to user)

#### CSS: Tooltip styling

| Check | Current spec | Common old pattern |
|-------|-------------|--------------------|
| `.cn-tip` | `border-bottom: 1px dashed [muted]; cursor: help;` (separate rule) | Combined with `.loc-tip`, both `dotted [accent]` |
| `.loc-tip` | `border-bottom: 1px dotted [accent]; cursor: help;` (separate rule) | Same as above |
| `.tip-box` | includes `pointer-events: auto;` | Missing — prevents "hear" button from being clicked |

The muted and accent colours are whatever the book's design uses — don't change them, just make sure the two tooltip classes are **separate** rules with the correct border styles.

#### CSS: Mobile sidebar

| Check | Current spec | Common old pattern |
|-------|-------------|--------------------|
| `.sb` (mobile) | `position: sticky; top: 0; z-index: 100; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;` | `position: static; flex-wrap: wrap; align-items: center;` |
| `.sb::-webkit-scrollbar` | `display: none` | Missing |
| `.sb .sb-label, .sb .tdiv` | `display: none` | May be different selector or missing |
| `.ti` (mobile) | `white-space: nowrap; border-left: none; border-bottom: 2px solid transparent;` | Various |
| `.ti.on` (mobile) | `border-bottom: 2px solid [accent]; border-left: none;` | `border-bottom-color: transparent` (no visible indicator) |

#### CSS: "Why it matters" page

| Check | Current spec | Common old pattern |
|-------|-------------|--------------------|
| Theme grid | `.hl-grid` (2×2 CSS grid) + `.hl` cards + `.hl-title` + `<ul>` bullets | `.theme-grid` + `.theme-card` + `<h3>` + `<p>` paragraphs |
| Fact card header | `<p class="fact-title">` with `.fact-title` CSS | `<h3>` inside `.fact-card` |
| Fact card border | `border-top: 3px solid [accent]; border-radius: 0 0 8px 8px;` | `border-radius: 8px; margin-top: 1rem;` (no top border) |

#### JS: Tooltip system

The tooltip system is the most common source of drift between skill versions. Check all of these:

| Check | Current spec | Old pattern |
|-------|-------------|------------|
| `showTip` signature | `showTip(el, e)` — unified, `isChar` check inside | `showTip(el, name, pron, desc)` — data looked up before calling |
| `hideTip` | `hideTimer = setTimeout(function(){ tipbox.style.display = "none"; }, 150);` | Immediate `tipbox.style.display = "none"` — breaks "hear" button |
| Tipbox hover | `tipbox.addEventListener("mouseenter", function(){ clearTimeout(hideTimer); });` + `tipbox.addEventListener("mouseleave", hideTip);` | Missing — tipbox dismisses itself when cursor moves onto it |
| `placeTip` | Takes mouse event `e`, uses `e.clientX + 16` / `e.clientY + 16` | Takes element `el`, uses `getBoundingClientRect()` |
| Speak button | `e.stopPropagation()` + `u.rate = 0.8` | Missing one or both |
| `onvoiceschanged` | `if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) { speechSynthesis.onvoiceschanged = function(){}; }` | Missing |
| Event binding | Single `document.querySelectorAll(".cn-tip, .loc-tip")` loop | Separate `.cn-tip` and `.loc-tip` forEach loops |
| Touch events | `if ("ontouchstart" in window) { ... }` block — tap to show, tap outside to dismiss | Missing |
| `currentSpeakText` | Variable name for speech synthesis text | May be `currentSpeak` (shorter, older name) |

When rewriting the tooltip JS block, preserve the CHARS and LOCS data objects exactly — only the event wiring and helper functions change.

#### JS: Quiz score tally

| Check | Current spec | Old pattern |
|-------|-------------|------------|
| `#qz-score` div | Present in quiz chapter HTML, after last question | Missing |
| Score tracking | `score` or `qScore` var, incremented on each correct answer | Missing |
| Score display | After all 3 answered: show `"Score: N/3 — [message]"` | Missing |
| Messages | `["Keep reading.", "Good — you have the shape of it.", "Very good.", "Excellent."][score]` | N/A |

The `#qz-score` div style should use the book's muted colour. Example:
```html
<div id="qz-score" style="display:none; margin-top:1.5rem; font-style:italic; color:[muted]; font-size:.95rem;"></div>
```

#### HTML: Structure checks

| Check | Spec requirement |
|-------|-----------------|
| SVG strips | `<figure class="ch-illustration">` wrapper, **no** inner `<figcaption>` |
| Real illustrations | `<figure class="ch-illustration">` + `<img>` + `<figcaption class="ch-illus-caption">[caption text only — no attribution]</figcaption>` |
| Quote markup | `.qt` class — never `.quote-block`, `.pull-quote`, or other variants |
| Why-it-matters HTML | `.hl-grid` > `.hl` > `<p class="hl-title">` + `<ul><li>…</li></ul>` |
| Fact card HTML | `<p class="fact-title">` not `<h3>` |

---

### Checklist B — Drastic issues (flag only, do not propose applying)

These items may be non-compliant with the current spec, but fixing them requires rewriting prose, restructuring content, or regenerating sections — out of scope for a surgical update pass. Flag them clearly in the report so the user can decide whether to address them separately.

| Item | Current spec target | Why drastic |
|------|--------------------|-|
| Chapter prose length | ~250 words per chapter | Requires prose editing/cutting |
| Chapter count | 3–5 story chapters | Requires adding or removing entire chapters |
| Sidebar tab title format | Roman numeral · short phrase ≤ 22 chars (e.g. `III · The Confession`) | Requires renaming all tabs |
| Recap box title quality | Single evocative phrase, not a plot summary | Requires editorial rewrite |
| Recap paragraph quality | 2–4 sentences, present tense, literary register | Requires prose rewrite |
| Quote count per chapter | 1–2 verified quotes, Goodreads-sourced | Requires sourcing and replacing quotes |
| Tooltip tagging scope | Each character/location tagged only on first 2 appearances | Requires reviewing all prose |
| Theme card bullet count | 3–4 bullets per `.hl` card | Requires editorial trimming or expansion |
| Fun facts count | 4–5 facts in `.fact-card` | Requires editorial trimming or expansion |
| Famous Passages count | Exactly 8 quotes on the quotes page | Requires sourcing and replacing quotes |

---

## Step 2 — Present findings and confirm

After completing the audit, output ALL findings grouped as follows. Do **not** apply any changes yet.

```
PROPOSED FIXES (Checklist A — surgical):
- [CSS] <item>: <current state> → <what needs to change>
- [JS] <item>: <current state> → <what needs to change>
- [HTML] <item>: <current state> → <what needs to change>
…

ALREADY COMPLIANT:
- <items that passed>
…

FLAGGED OUT OF SCOPE (Checklist B — drastic, not proposed):
- <item>: <current state vs spec target> — requires <type of work>
…
```

Then ask: **"Which of the proposed fixes should I apply? I can apply all, or just a subset — let me know."**

Wait for the user's response before proceeding.

---

## Step 3 — Apply confirmed fixes

Apply only the fixes the user confirmed. Each fix must be surgical — Edit the relevant lines only. Do not rewrite surrounding code.

---

## Step 4 — Output a change report

After all edits:

```
CHANGES MADE:
- [CSS] <what changed and why>
- [JS] <what changed and why>
- [HTML] <what changed and why>
…

SKIPPED (user did not confirm):
- <items>
…

FLAGGED OUT OF SCOPE:
- <items from Checklist B, carried forward>
…
```

---

## What NOT to change (ever)

These are intentionally book-specific and must not be touched under any circumstances:

- Prose content, chapter titles, chapter subtitle lines
- CHARS and LOCS data objects (keys, pronunciations, descriptions)
- Quiz questions, answer letters, feedback text
- Images — any `<figure class="ch-illustration">` block containing `<img>`
- SVG strip artwork (the shapes, gradients, colours within the `<svg>`)
- Palette colours (background, text, accent, muted) — derived from the book's Design Spec
- Font choices and Google Fonts import
- Any CSS that is already compliant with spec

---

## Step 5 (optional) — Reader prose verdict

After all surgical fixes are applied, offer: **"Want me to run the Reader agent for a prose verdict? It reads the full HTML cold and returns APPROVED or NEEDS REVISION with chapter-level notes. Takes ~1 min per book."**

If the user says yes:

- Spawn the Reader agent per `agents/reader.md` (read that file for the full prompt).
- Reader must not have seen the Writer's or your process — clean spawn.
- Append Reader's verdict and chapter notes to the change report under:

```
READER VERDICT:
- <book>: APPROVED / NEEDS REVISION
  [chapter notes if NEEDS REVISION]
```

- If Reader flags NEEDS REVISION: note the chapters in the report. Do **not** spawn Writer automatically — this is a separate decision. If the issues look surgical (a single bad sentence, a missing quote), add them to a new PROPOSED FIXES list and ask the user. If they look substantive (chapter is 400 words, prose register is wrong), add them to FLAGGED OUT OF SCOPE.

---

## Running against multiple books

If the user says "update all books" or names several, audit each HTML file in sequence. Present a combined findings report covering all books before asking for confirmation. Apply confirmed fixes to all books, then produce a combined change summary.
