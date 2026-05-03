---
name: book-synopsis-html
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

## How this skill runs — three-agent loop

Three agents, orchestrated by you (the main agent):

- **Writer** — researches the book, produces the HTML. Full spec: `agents/writer.md`
- **Reader** — reads the finished HTML fresh (zero prior context), gives critical
  editorial feedback. Full spec: `agents/reader.md`
- **Illustrator** — finds period illustrations for each chapter, downloads them,
  outputs a manifest. Full spec: `agents/illustrator.md`

Read all three agent files before spawning any agent.

Loop (max 3 writer rounds):
```
Round 1:
  1. Spawn Writer → saves HTML with SVG atmospheric strips as placeholders
  2. [In parallel] Spawn Reader + Spawn Illustrator
     - Reader: critiques HTML, returns APPROVED or NEEDS REVISION
     - Illustrator: finds images, saves manifest.json

Round 2 (always runs — needed to insert images regardless of reader verdict):
  3. Spawn Writer (round 2) with:
     - Reader feedback (if NEEDS REVISION) OR instruction "approved — insert images only"
     - Image manifest path
     Writer inserts <img> tags from manifest, keeps SVG strips for chapters with found:false

Round 3 (only if Reader round 2 returns NEEDS REVISION):
  4. Spawn Reader (round 2) → critiques updated HTML
  5. If NEEDS REVISION → spawn Writer (round 3, final)
  6. After round 3, deliver regardless of verdict.

Final check:
  7. Compare manifest chapter count vs final HTML chapter count.
     If chapters were merged/split/reordered during revision: revert mismatched
     chapter images to SVG strips (set found:false for those chapters, re-run Writer
     for a quick image-only fix pass).
```

### Spawning the Writer

**Round 1 prompt** must include: book name, output path, full contents of `agents/writer.md`.

**Round 2+ prompt** must include all of the above, plus:
```
READER FEEDBACK FROM PREVIOUS VERSION:
[paste reader output verbatim, or "APPROVED — insert images only, no content changes"]

IMAGE MANIFEST: [project]/book-htmls/{book-slug}/images/manifest.json
For chapters with "found": true → replace SVG strip with <figure class="ch-illustration">.
For chapters with "found": false → keep SVG strip unchanged.
See agents/illustrator.md for the HTML structure and CSS to use.
```

Output path convention: `[project]/book-htmls/<slug>/<slug>.html`
Images output: `[project]/book-htmls/<slug>/images/chapter_0N.jpg` + `manifest.json`

### Spawning the Reader

Prompt must include: the HTML file path, the book title, and the full contents
of `agents/reader.md`. The reader must not have seen the writer's process.

### Spawning the Illustrator

Prompt must include: book name, slug, chapter list (number + title + 1-sentence scene
description for each), output directory, and full contents of `agents/illustrator.md`.
The illustrator runs in parallel with the Reader — spawn both in the same turn.

---

## Step 0 — Page title and header

Set the browser tab title and render a visible header above the layout.

**Browser `<title>`:** Use the book's name only — no subtitles, no "Synopsis",
no author name appended. Examples: `<title>Anna Karenina</title>`,
`<title>Hamlet</title>`, `<title>The Great Gatsby</title>`.

**Visible header:** Place a `<header class="pg-header">` block immediately
before `<div class="layout">`. It must show:
- The book title (large)
- The author's name and year (smaller, muted)
- A decorative separator below

**Design rule — thematic coherence:** The header's palette, font choices, and
decorative motifs must feel like they belong to the book's world. Derive them
from the same atmosphere you establish in the SVG illustrations (Step 5).
Use only inline styles or classes defined in Step 11 — no external fonts.

**Do not invent new colours or override the core CSS.** The body font, drop
cap, `.qt` border, `.ch-recap` background, and navigation styles from Step 11
are fixed. Customise only the thematic accent colour (used in `.ch-title`,
`.qt` border-color, drop cap colour, and sidebar `.ti.on` indicator) — derive
it from the palette table below. Everything else stays as Step 11 defines it.

| Book world | Suggested palette | Motif |
|---|---|---|
| Russian 19th-century (Dostoevsky, Tolstoy) | Deep navy / warm ochre | thin rule, Cyrillic-weight serif |
| English country house (Austen, Brontë) | Cream / forest green | double rule, restrained spacing |
| Jazz-Age America (Fitzgerald) | Ivory / gold / charcoal | art-deco rule, wide letter-spacing |
| Elizabethan / Jacobean (Shakespeare) | Black / antique gold | ornamental divider (✦ or ❧) |
| French realism (Flaubert, Zola) | Stone grey / deep red | single hairline rule |
| Default (any other) | Match `body` background, `#1a1a1a` | simple `<hr>` |

**Minimal markup template** (customise colours and decoration per the table above):

```html
<header class="pg-header">
  <h1 class="pg-title">Book Title</h1>
  <p class="pg-author">Author Name &middot; Year</p>
  <div class="pg-rule"></div>
</header>
```

**pg-rule width — critical:** The `pg-rule` must span the full content width,
not be artificially narrow. Set `max-width` to match the layout's content area
(i.e. `max-width: 960px` layout minus `1.5rem` padding on each side ≈ `912px`),
**not** a fixed small value like `480px`. A too-narrow rule looks like a bug.

```css
/* CORRECT — matches content width */
.pg-rule { border: none; border-top: 2px double #8a7055;
           margin: 0 auto; max-width: 912px; }

/* WRONG — artificially narrow */
.pg-rule { border: none; border-top: 1px solid #bbb;
           margin: 0 auto 0; max-width: 480px; }
```

---

## Step 1 — Research before writing

**Always research first — do not rely on training data alone.** Even for
well-known books, training data may misremember quotes, character names, or
plot details. Use web search to verify before writing.

Minimum research queries to run (in parallel where possible):
- `"[Book title] [Author] plot summary"` — for chapter structure
- `"[Book title] famous quotes"` — for verbatim quote text and attribution
- `"[Book title] characters"` — for full names, roles, spellings
- Wikipedia page for the work — publication year, reception, key themes
- SparkNotes or LitCharts if available — reliable chapter-by-chapter breakdown

For less famous works, do more: search for detailed plot breakdowns, character
analyses, and academic commentary. If you cannot find reliable information,
say so before proceeding rather than inventing details.

---

Establish these from your research before producing any HTML:

**Structure.** Identify the work's natural dramatic units — usually 5–10 for
a full novel. For a play, use Acts. For a short novel (<200 pages), 5–6
chapters is appropriate; don't pad to 8. For a long novel with parallel
narratives (e.g. Anna Karenina, Middlemarch), each chapter can cover one
thread or interweave both — decide which serves clarity.

**Characters.** 6–12 key figures. For each: one-sentence role, phonetic
pronunciation of any non-English or difficult name (stressed syllable in
CAPS: `"Lyeh-OH-vin"`, `"ah-NAH"`), a name string for text-to-speech.

**Quotes.** 10–15 well-known passages. Verify the exact wording from a
reliable source — do not paraphrase a quote and present it as verbatim.
For each, note *exactly* where it occurs — which Part/Act, who says it,
to whom. Famous opening lines belong in Chapter 1.

**Themes.** 2–3 central ideas the synopsis must convey — these drive the
"Why it matters" page.

**Tone.** Note the author's prose register. The synopsis prose must mirror it:
- Dostoevsky: short declarative sentences, fever, compression, interiority
- Tolstoy: wide and panoramic, societal observation, slow moral certainty
- Fitzgerald: lyrical, elegiac, saturated with longing
- Austen: ironic, measured, alert to social performance
- Shakespeare: the soliloquies carry more weight than the plot; quote generously

> **Copyright:** Short quotations only (under 15 words). Paraphrase everything
> longer. Never reproduce poems, songs, or substantial prose extracts verbatim.

---

## Step 2 — Chapter plan

| # | Type | Content |
|---|------|---------|
| 1–N | Story chapters | One per major narrative beat |
| N+1 | ✦ Why it matters | Themes, legacy, famous passages |
| N+2 | ✎ Quiz | 3 questions on key ideas |

Total chapter count is N+2. Chapter 1 is the first page shown.

**Chapter count rules:**
- No minimum. Use as few as the story demands — don't pad.
- Standard novels: aim for 5–6 story chapters.
- Max 6. If a book genuinely needs more (very long novel, e.g. War and Peace,
  Middlemarch), **stop and ask the user** before writing:
  > "This book is long enough to warrant more than 6 chapters. Would you prefer:
  > a) A single summary with up to 8 chapters, or
  > b) Two separate summaries — Part I and Part II — each with 4–5 chapters?"
  Then proceed based on their answer.

For plays: chapters = Acts (or scene-clusters for long Acts). Subtitle can
note what the Act is known for: `"Act III · The turning point"`.

### Sidebar chapter titles

Format: `Roman numeral · Short phrase`. Plain text, no `.ti-icon` wrapper.
Keep the full label (including the Roman numeral and ` · `) under 22 characters
so it fits the 178px sidebar without truncation.

Good: `I · The Bennets`, `V · Pemberley`, `III · Mr Collins`
Too long: `I · A Single Man of Fortune`, `III · Proposals and Refusals`

```html
<!-- Story chapters — plain text, no .ti-icon wrapper -->
<button class="ti on" onclick="go(1)">I · The Bennets</button>
<button class="ti" onclick="go(2)">II · First Impressions</button>
```

---

## Step 3 — HTML structure and the div-balance rule

```html
<div class="layout">
  <div class="sb">          ← sidebar, sticky 178px
    <div class="sb-label">Chapters</div>
    …one button per story chapter, onclick="go(1)" … go(N)"…
    <div class="tdiv"></div>
    <!-- Why it matters — SparklesIcon -->
    <button class="ti" onclick="go(N+1)">…Why it matters…</button>
    <!-- Quiz — Certificate01Icon -->
    <button class="ti" onclick="go(N+2)">…Quiz…</button>
  </div>
  <div class="main">
    <!-- CH 1 -->
    <div class="ch on" data-t="…">…content…</div>
    <!-- CH 2 -->
    <div class="ch">…content…</div>
    …
    <!-- Nav -->
    <div class="nr">
      <button id="pb" onclick="nav(-1)" disabled>&#8592; Back</button>
      <span><span id="nc">1</span> / <span id="ntot">TOTAL</span></span>
      <button id="fwb" onclick="nav(1)">Next &#8594;</button>
    </div>
  </div>
</div>
<!-- tipbox and both scripts go here, outside .layout -->
```

**Nav counter — two-span pattern (avoids the double-slash bug):**

The `nc` span holds only the current page number. The total is in a separate
`ntot` span. The JS updates both independently:

```html
<!-- HTML -->
<span><span id="nc">1</span> / <span id="ntot">11</span></span>
```

```js
// JS — inside go()
document.getElementById('nc').textContent = (c+1);
document.getElementById('ntot').textContent = N;
```

**Why this matters:** The old pattern `textContent = (c+1) + ' / ' + N` wrote
the full string into `nc`, while the surrounding HTML already had `/ TOTAL` —
producing `"2 / 11 / 11"`. The two-span pattern avoids this entirely.

**The total hardcoded in `ntot`** must match actual chapter count (N story
chapters + Character Map + Why it matters + Quiz = N+3).

### Div-balance verification — run this before delivering

```python
import re
src = open('output.html').read()

# 1. Total file balance
o = len(re.findall(r'<div', src))
c = len(re.findall(r'</div>', src))
assert o == c, f"Total imbalance: {o} opens, {c} closes"

# 2. Each chapter block is balanced (N story chapters + Why it matters + Quiz = N+2 total)
for i in range(1, N+3):
    tag = f'<!-- CH {i} -->' if i <= 9 else f'<!-- CH {i}'
    nxt = f'<!-- CH {i+1}' if i < N+2 else '<!-- Nav'
    s, e = src.find(tag), src.find(nxt, src.find(tag))
    block = src[s:e]
    bo = len(re.findall(r'<div', block))
    bc = len(re.findall(r'</div>', block))
    assert bo == bc, f"CH{i} imbalanced: {bo}/{bc}"

# 3. Every chapter starts at depth 1 (inside .main only)
main = src.find('<div class="main">')
pos = main; depth = 0
for i in range(1, N+3):
    tpos = src.find(f'<!-- CH {i}')
    seg  = src[pos:tpos]
    depth += len(re.findall(r'<div', seg)) - len(re.findall(r'</div>', seg))
    assert depth == 1, f"CH{i} at wrong nesting depth {depth} — a prior chapter is unclosed"
    pos = tpos

print("All checks passed.")
```

A single missing `</div>` on chapter N causes every subsequent chapter to
be nested inside the invisible hidden chapter N. They will render blank.

---

## Step 4 — Chapter anatomy

Every story chapter body follows this structure:

```
[prose — opening paragraph(s)]
[illustration — placed near the relevant prose moment, not always at the top]
[prose — continuation]
[quote — placed where it chronologically occurs]
[prose — continuation]
[quote — if a second occurs here]
[end-of-chapter recap block]
```

**Image placement:** Illustrations belong near the prose moment they depict.
An image of a proposal scene goes next to the paragraph about the proposal,
not at the top of the chapter. If a chapter's main image depicts the chapter's
climax, place it just before that climactic paragraph. Top placement is fine
only when the image introduces the setting or atmosphere of the whole chapter.

**The prose must read like the book, compressed — with meaning woven in very
lightly.** Think of it as a knowledgeable friend retelling the story: they
don't pad, repeat, or over-explain, but they do naturally say why a moment
matters as they go. Each major beat gets 1–2 paragraphs.

The light-touch rule: a brief phrase or clause can hint at significance
without stopping the story. The insight should feel like good storytelling,
not analysis.

Good (barely-there, flows naturally):
> "Darcy dismisses Elizabeth as beneath his notice — a judgement he'll spend
> the rest of the novel slowly, painfully revising."
> "For the first time, she isn't sure she was right."

Bad (breaks the narrative, feels like a lecture):
> "This symbolises the rigid class structures of Regency society."
> "Austen uses this scene to critique the role of women."
> "The tension here represents the novel's central theme."

If adding the meaning-phrase makes the sentence feel heavy or stops the
reader, cut it. Story first, always.

**Reading time target:** Each story chapter should take 1–2 minutes to read
(~300–450 words of prose, not counting quotes or recap). The full synopsis
should read in 5–10 minutes. Cut ruthlessly — every sentence must earn its
place.

Do **not** use `.hl` highlight boxes or `.sym-row` symbol rows inside story
chapters. They clutter the narrative and are banned from the chapter body.

### Quote markup — standardised

Every quote uses `.qt` with a `data-qid` attribute (needed for the favourites
feature). The `data-qid` format is `[book-slug]-ch[N]-q[N]`:

```html
<div class="qt" data-qid="pride-and-prejudice-ch1-q1">
  <p>"It is a truth universally acknowledged…"</p>
  <cite>— Opening line, Chapter 1</cite>
</div>
```

Use this class only — never `.quote-block`, `.pull-quote`, or other variants.

### Quote count and placement

Every chapter must have **at least one quote**. Use up to **three** if the
chapter contains multiple famous or highly relevant passages — don't force
extra quotes in just to hit a number.

Every quote appears **only in the chapter where it chronologically occurs**.
The annotation (`— Character, Part III`) must match the section.

Never use a future quote as "contrast" or "foreshadowing" in an earlier chapter.
If a quote is thematically relevant to an earlier moment, make the point in
*prose* and save the quote for its correct chapter.

Famous opening lines go in Chapter 1 even if they seem like authorial framing.

### End-of-chapter recap block

Every story chapter ends with a `<div class="ch-recap">` containing an
**evocative title** followed by a **single flowing paragraph**.

The title (3–5 words) should capture the chapter's defining quality —
something a reader would remember, not a plot label.
Good: `"The Social Architecture"`, `"Pemberley as Character"`, `"Pride Before the Fall"`
Weak: `"Chapter Summary"`, `"What Happened"`, `"Elizabeth Meets Darcy"`

The paragraph (2–4 sentences) is an editor's note: draw out whatever is most
worth pausing on — an irony, a character shift, a power dynamic, what to carry
forward. It should feel different every chapter. Never just restate the prose.

```html
<div class="ch-recap">
  <p class="recap-title">The Social Architecture</p>
  <p>Mrs Bennet's campaign begins in earnest — and already the gap between
     what she says and what she means is the engine of every scene. Bingley
     is charming and pliant; Darcy's first impression of Elizabeth is the
     novel's great opening irony, since we will watch that contempt turn into
     something he cannot control.</p>
</div>
```

Keep it tight. One well-aimed paragraph, not a recap of everything that
just happened. The reader should feel the chapter crystallise, not be
summarised at them.

### Parallel narratives

If the novel follows two parallel threads (e.g. Anna/Levin in Karenina,
Pip/Estella in Great Expectations), you have two options:
- **Interleave:** One chapter per major beat, weaving both threads. Label the
  chapter header to signal the switch: `"Part II · Anna and Levin diverge"`.
- **Separate arcs:** One chapter per thread, clearly labelled. Works when the
  threads don't interact until late.

Either approach is fine; pick whichever serves clarity for that novel.

---

## Step 5 — Illustrations (SVG)

Each chapter gets a **lightweight atmospheric header** — an SVG strip
(680×90px) using **hardcoded hex colours only** (no CSS variables, won't
invert in dark mode).

**Keep it simple and fast to generate.** The goal is atmosphere, not a
detailed scene. A gradient sky + one or two silhouette shapes is enough.
Do not draw elaborate paths, multiple figures, or complex compositions.

Formula per chapter:
1. A `<linearGradient>` or `<radialGradient>` background fill for the
   strip — colours derived from the book's palette
2. At most **2 simple shapes**: one silhouette (a roofline, a tree, a
   horizon, a doorway) plus an optional accent (a moon, a candle glow,
   a window light)
3. Optional: one small atmospheric text label in low-opacity serif
   (`"St. Petersburg, 1865"`) — only if it adds something

```svg
<!-- Example: English country house chapter -->
<svg width="680" height="90" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8d8b0"/>
      <stop offset="100%" stop-color="#e8e0cc"/>
    </linearGradient>
  </defs>
  <rect width="680" height="90" fill="url(#sky)"/>
  <!-- simple house silhouette -->
  <rect x="260" y="52" width="160" height="38" fill="#3a4a28"/>
  <polygon points="260,52 340,20 420,52" fill="#2a3a18"/>
  <!-- two windows -->
  <rect x="285" y="62" width="18" height="22" fill="#c8b870" opacity=".6"/>
  <rect x="377" y="62" width="18" height="22" fill="#c8b870" opacity=".6"/>
</svg>
```

Establish a palette and silhouette vocabulary in Chapter 1 and reuse/vary it:
- English country house: soft greens/creams, rooflines, hedgerows
- Russian 19th-century: deep navy/ochre, domes, lit windows against dark sky
- Jazz-Age America: gold/charcoal, mansion outline, dock lights on water
- Elizabethan stage: black/gold, battlements, a single torch flame

---

## Step 6 — Character tooltips

Tag every named character on use (and on subsequent uses where a reminder helps):

```html
<span class="cn-tip" data-char="CharKey">Character Name</span>
```

The JS `CHARS` object (in script 2) maps each key:

```js
var CHARS = {
  Anna: { pron:"ah-NAH", speak:"Anna Karenina", desc:"Aristocrat trapped between duty and desire." },
  Levin: { pron:"LYEH-vin", speak:"Konstantin Levin", desc:"Landowner seeking authentic meaning." }
};
```

- `pron`: phonetic guide, stressed syllable in CAPS
- `speak`: full name passed to `speechSynthesis` — will attempt Russian/relevant
  language voice first, fall back to `en-GB`
- `desc`: one sentence, **no apostrophes** (e.g. `"Friend of Raskolnikov"` not
  `"Raskolnikov's friend"` — apostrophes in double-quoted JS strings cause errors)

Tooltip behaviour: appears on hover, locks position (does not follow mouse),
stays open when mouse moves onto it (so user can click hear button).

---

## Step 7 — Writing JS safely

**Always write the second script block via a shell heredoc.** Python string
escaping silently writes `\'` into the file for any apostrophe, which breaks
the browser JS parser with `SyntaxError: Unexpected identifier 's'`.

```bash
cat > /tmp/script2.js << 'JSEOF'
var CHARS = {
  CharKey: { pron:"...", speak:"...", desc:"No apostrophes here." }
};
var tipbox = document.getElementById("tipbox");
/* ... rest of tooltip + quiz JS, all double-quoted strings ... */
JSEOF

# Verify before use
python3 -c "
s = open('/tmp/script2.js').read()
assert \"'\" not in s, 'Single quotes found — rewrite affected strings'
print('OK — zero single quotes')
"
```

Then splice into the HTML in Python:

```python
old_start = src.find('\n<script>\nvar CHARS')
old_end   = src.find('</script>', old_start) + len('</script>')
with open('/tmp/script2.js') as f:
    js = f.read()
src = src[:old_start] + '\n<script>\n' + js + '</script>' + src[old_end:]
```

### Script 1 (navigation) — safe to write in Python

```js
let c = 0;
const chs = document.querySelectorAll('.ch');
const tis = document.querySelectorAll('.ti');
const N = chs.length;
function go(i) {
  chs[c].classList.remove('on'); tis[c].classList.remove('on');
  c = i;
  chs[c].classList.add('on'); tis[c].classList.add('on');
  document.getElementById('pb').disabled  = c === 0;
  document.getElementById('fwb').disabled = c === N-1;
  document.getElementById('nc').textContent = (c+1);
  document.getElementById('ntot').textContent = N;
  window.scrollTo({top:0, behavior:'smooth'});
}
function nav(d) { go(c+d); }
```

### Script 2 (tooltips + quiz) — full template

```js
var CHARS = { /* see Step 6 */ };

var tipbox   = document.getElementById("tipbox");
var tipname  = document.getElementById("tipname");
var tippron  = document.getElementById("tippron");
var tipspeak = document.getElementById("tipspeak");
var tipdesc  = document.getElementById("tipdesc");
var hideTimer = null;
var currentSpeakText = "";

function placeTip(e) {
  var x = e.clientX + 16, y = e.clientY + 16;
  if (x + 260 > window.innerWidth)  x = e.clientX - 264;
  if (y + 120 > window.innerHeight) y = e.clientY - 124;
  tipbox.style.left = x + "px";
  tipbox.style.top  = y + "px";
}
function showTip(el, e) {
  clearTimeout(hideTimer);
  var ch = CHARS[el.getAttribute("data-char")];
  if (!ch) return;
  currentSpeakText = ch.speak;
  tipname.textContent = el.getAttribute("data-char");
  tippron.querySelector("span").textContent = ch.pron;
  tipdesc.textContent = ch.desc;
  placeTip(e);
  tipbox.style.display = "block";
}
function hideTip() {
  hideTimer = setTimeout(function(){ tipbox.style.display = "none"; }, 150);
}
tipbox.addEventListener("mouseenter", function(){ clearTimeout(hideTimer); });
tipbox.addEventListener("mouseleave", hideTip);
tipspeak.addEventListener("click", function(e) {
  e.stopPropagation();
  if (!window.speechSynthesis || !currentSpeakText) return;
  var u = new SpeechSynthesisUtterance(currentSpeakText);
  var voices = speechSynthesis.getVoices();
  var match = voices.find(function(v){ return v.lang.startsWith("LANG_CODE"); });
  u.lang = match ? "LANG_CODE" : "en-GB";
  u.rate = 0.8;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});
if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = function(){};
}
document.querySelectorAll(".cn-tip").forEach(function(el) {
  el.addEventListener("mouseenter", function(e){ showTip(el, e); });
  el.addEventListener("mouseleave", hideTip);
});

/* === QUIZ === */
var qAnswers  = { 1:"b", 2:"b", 3:"b" };   /* correct answer is always "b" */
var qDone     = {};
var qFeedback = {
  1: { b:"Explanation of why b is correct.", wrong:"Explanation of what the wrong answers miss." },
  2: { b:"...", wrong:"..." },
  3: { b:"...", wrong:"..." }
};
function answer(qNum, choice) {
  if (qDone[qNum]) return;
  qDone[qNum] = choice;
  var correct = qAnswers[qNum];
  document.querySelectorAll("#q" + qNum + "-opts .qz-opt").forEach(function(btn, i) {
    var letter = ["a","b","c"][i];
    btn.disabled = true;
    if (letter === correct) btn.classList.add("correct");
    else if (letter === choice) btn.classList.add("wrong");
    else btn.classList.add("reveal");
  });
  var fb = document.getElementById("q" + qNum + "-fb");
  fb.textContent = (choice === correct) ? qFeedback[qNum][correct] : qFeedback[qNum]["wrong"];
  fb.className = "qz-fb show " + (choice === correct ? "correct" : "wrong");
  if (Object.keys(qDone).length === 3) {
    var score = [1,2,3].filter(function(q){ return qDone[q] === qAnswers[q]; }).length;
    document.getElementById("score-n").textContent = score + " / 3";
    document.getElementById("score-msg").textContent = ["Keep reading.",
      "Good — you have the shape of it.", "Very good.", "Excellent."][score];
    document.getElementById("qz-score").classList.add("show");
  }
}
```

Replace `"LANG_CODE"` with the appropriate BCP-47 code: `"ru-RU"` for Russian,
`"fr-FR"` for French, `"ja-JP"` for Japanese, etc. Use `"en-GB"` as fallback
for English-language novels.

Note: the correct quiz answer is always option `"b"`. This is a convention for
consistency — design questions so b is the right answer.

---

## Step 8 — The tooltip HTML

Place this just before the closing `</body>`:

```html
<div class="tip-box" id="tipbox">
  <div class="tip-name" id="tipname"></div>
  <div class="tip-pron" id="tippron">
    <span></span>
    <button class="tip-speak" id="tipspeak" data-speak="" title="Hear pronunciation">&#9654; hear</button>
  </div>
  <div class="tip-desc" id="tipdesc"></div>
</div>
```

Critical CSS — the `pointer-events` line is the most-forgotten rule:

```css
.cn-tip  { border-bottom: 1px dotted #888; cursor: help; }
.tip-box { display: none; position: fixed; z-index: 9999; max-width: 240px;
           background: #fff8f0; border: .5px solid #ccc; border-radius: 8px;
           padding: 10px 13px;
           /* NO pointer-events:none — the hear button must be clickable */ }
```

---

## Step 9 — "Why it matters" page

This is the only page where thematic analysis, symbolism, and `.hl` highlight
boxes are appropriate. Keep them out of story chapters.

Structure the page with clear headings. Use visual organisation (cards,
stat elements, pull-quote styling) where it helps — but don't force a rigid
grid if simpler prose serves better. The goal is a page that informs and
delights, not one that ticks boxes.

### Section 1 — Central Themes & Legacy
*(choose a title that fits the book — "Why It Endures", "What It's Really About", etc.)*

Up to **3** central themes, reasons for its fame, or core ideas. Each gets:
- A short title (3–5 words)
- 2–3 sentences of clear, plain explanation — why does this theme matter,
  what does the book do with it, why does it still resonate?

Use cards, a grid, or simple labelled blocks — whichever reads most clearly.
No academic jargon. No vague claims ("explores the human condition").

### Section 2 — Fun Facts

Surprising, memorable, or little-known facts about the work: its composition,
reception, adaptations, controversies, cultural impact, misattributions.
Aim for 4–6 facts that would make a non-reader say "I didn't know that."

Use a visual format — stat-style callout cards, a list with visual markers,
or a compact grid. Include numbers/dates where they're interesting
(e.g. "Rejected by 12 publishers", "800,000 copies sold in first year").

If a famous quote is commonly misattributed to this work, correct it here.

### Section 3 — Famous Passages

Three of the most celebrated quotes from the work. For each:
- The quote (styled as a pull-quote)
- One sentence explaining *why* this passage is famous or what makes it land

---

## Step 10 — Quiz

Three questions testing **understanding of themes and ideas**, not plot recall.

Good question types:
- "Character X does Y — what is the author arguing through this choice?"
- "Why does the novel structure work the way it does?"
- "What does [character/event] represent in contrast to [other]?"

Option B is always correct (by convention — design questions accordingly).
Feedback paragraphs explain the reasoning, not just confirm right/wrong.

---

## Step 11 — Core CSS

```css
body   { font-family: Georgia, serif; background: #f5f2ed; color: #1a1a1a; }

/* Page header — customise colours/motifs per Step 0 */
.pg-header { max-width: 960px; margin: 0 auto; padding: 2.2rem 1.5rem 0;
             text-align: center; }
.pg-title  { font-size: 2.4rem; font-weight: 700; letter-spacing: .02em;
             margin: 0 0 .3rem; }
.pg-author { font-size: 1rem; color: #666; margin: 0 0 1.2rem;
             letter-spacing: .04em; }

/* pg-rule: MUST span full content width — match layout padding */
.pg-rule   { border: none; border-top: 1px solid #bbb;
             margin: 0 auto; max-width: 912px; }

.ch    { display: none; }
.ch.on { display: block; }
.layout { display: flex; max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
.sb    { width: 178px; flex-shrink: 0; position: sticky; top: 1.5rem;
         align-self: flex-start; padding-right: 1.2rem; }
.main  { flex: 1; min-width: 0; }
.ti    { display: block; width: 100%; text-align: left; background: none;
         border: none; padding: 5px 9px; border-radius: 6px; cursor: pointer;
         font-family: system-ui,sans-serif; font-size: 13px; color: #555;
         white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
         border-left: 2px solid transparent; transition: background .12s; }
.ti:hover { background: rgba(0,0,0,.06); color: #1a1a1a; }
.ti.on    { background: rgba(0,0,0,.07); color: #1a1a1a; font-weight: 600;
            border-left: 2px solid #555; }

/* Icon alignment inside sidebar buttons */
.ti-icon     { display: inline-flex; align-items: center; gap: 5px; }
.ti-icon svg { flex-shrink: 0; }

/* Chapter prose — larger, more readable */
.ch-title { font-size: 1.45rem; font-weight: 700; margin: 0 0 .2rem; }
.ch-sub   { font-size: .88rem; color: #8a8070; margin: 0 0 1.4rem;
            letter-spacing: .05em; text-transform: uppercase; }
.ch p { line-height: 1.85; font-size: 1.1rem; margin: 0 0 1.1rem; }
.ch p:first-of-type::first-letter { float: left; font-size: 3.4em; line-height: .85;
  margin: .08em .12em 0 0; font-weight: 700; }

/* Quotes — standardised .qt class */
.qt { border-left: 3px solid currentColor; padding: .9rem 1.1rem .9rem 1.3rem;
      margin: 1.6rem 0; border-radius: 0 6px 6px 0; opacity: .92; }
.qt p { margin: 0 0 .35rem; font-style: italic; font-size: 1.05rem; line-height: 1.75; }
.qt cite { font-size: .82rem; font-style: normal; opacity: .7; }

/* End-of-chapter recap block */
.ch-recap { margin: 2rem 0 0; padding: 1.1rem 1.4rem;
            border-radius: 6px; border-top: 2px solid rgba(0,0,0,.1);
            background: rgba(0,0,0,.03); }
.recap-title { display: block; font-size: .72rem; text-transform: uppercase;
               letter-spacing: .13em; margin: 0 0 .55rem;
               font-family: system-ui, sans-serif; font-style: normal;
               font-weight: 600; opacity: .55; }
.ch-recap p { font-size: .97rem; line-height: 1.72; margin: 0;
              font-style: italic; }

/* Navigation bar */
.nr { display: flex; align-items: center; justify-content: space-between;
      padding: 1.4rem 0 .5rem; margin-top: 1rem;
      border-top: 1px solid rgba(0,0,0,.08); }
.nr button { background: none; border: 1px solid rgba(0,0,0,.2); border-radius: 5px;
             padding: .45rem .9rem; cursor: pointer; font-size: .9rem;
             transition: background .12s; }
.nr button:hover:not(:disabled) { background: rgba(0,0,0,.06); }
.nr button:disabled { opacity: .35; cursor: default; }

/* Mobile — sidebar collapses to horizontal scroll strip */
@media (max-width: 640px) {
  .layout { flex-direction: column; padding: 1rem .9rem; }
  .sb { width: 100%; padding: 0 0 .8rem; position: static;
        display: flex; flex-wrap: nowrap; overflow-x: auto;
        gap: .3rem; -webkit-overflow-scrolling: touch; }
  .sb::-webkit-scrollbar { display: none; }
  .sb .sb-label, .sb .tdiv { display: none; }
  .ti { width: auto; flex-shrink: 0; white-space: nowrap; border-left: none;
        border-bottom: 2px solid transparent; border-radius: 4px; }
  .ti.on { border-bottom: 2px solid currentColor; border-left: none; }
  .pg-title { font-size: 1.9rem; }
  .ch p { font-size: 1.05rem; }
  .qt p { font-size: 1rem; }
}
```

---

## Step 12 — Sidebar icons (HugeIcons, inlined SVG)

Story chapter buttons are plain text (no `.ti-icon` wrapper). Only the two
special pages use icons — wrap icon + label in a `.ti-icon` span.

**Why it matters** → `SparklesIcon`
```html
<button class="ti" onclick="go(N+1)"><span class="ti-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M15 2L15.5387 4.39157C15.9957 6.42015 17.5798 8.00431 19.6084 8.46127L22 9L19.6084 9.53873C17.5798 9.99569 15.9957 11.5798 15.5387 13.6084L15 16L14.4613 13.6084C14.0043 11.5798 12.4202 9.99569 10.3916 9.53873L8 9L10.3916 8.46127C12.4201 8.00431 14.0043 6.42015 14.4613 4.39158L15 2Z"/><path d="M7 12L7.38481 13.7083C7.71121 15.1572 8.84275 16.2888 10.2917 16.6152L12 17L10.2917 17.3848C8.84275 17.7112 7.71121 18.8427 7.38481 20.2917L7 22L6.61519 20.2917C6.28879 18.8427 5.15725 17.7112 3.70827 17.3848L2 17L3.70827 16.6152C5.15725 16.2888 6.28879 15.1573 6.61519 13.7083L7 12Z"/></svg>Why it matters</span></button>
```

**Quiz** → `Certificate01Icon`
```html
<button class="ti" onclick="go(N+2)"><span class="ti-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 22C7.49306 22 5.48959 22 4.2448 20.5355C3 19.0711 3 16.714 3 12C3 7.28596 3 4.92893 4.2448 3.46447C5.48959 2 7.49306 2 11.5 2C15.5069 2 17.5104 2 18.7552 3.46447C19.7572 4.64332 19.9527 6.40054 19.9908 9.5"/><path d="M8 8H15M8 13H11"/><path d="M19.6092 18.1054C20.4521 17.4918 21 16.4974 21 15.375C21 13.511 19.489 12 17.625 12H17.375C15.511 12 14 13.511 14 15.375C14 16.4974 14.5479 17.4918 15.3908 18.1054M19.6092 18.1054C19.0523 18.5108 18.3666 18.75 17.625 18.75H17.375C16.6334 18.75 15.9477 18.5108 15.3908 18.1054M19.6092 18.1054L20.192 19.9404C20.4143 20.6403 20.5255 20.9903 20.4951 21.2082C20.4318 21.6617 20.0619 21.9984 19.6252 22C19.4154 22.0008 19.101 21.8358 18.4723 21.5059C18.2027 21.3644 18.0679 21.2936 17.93 21.252C17.649 21.1673 17.351 21.1673 17.07 21.252C16.9321 21.2936 16.7973 21.3644 16.5277 21.5059C15.899 21.8358 15.5846 22.0008 15.3748 22C14.9381 21.9984 14.5682 21.6617 14.5049 21.2082C14.4745 20.9903 14.5857 20.6403 14.808 19.9404L15.3908 18.1054"/></svg>Quiz</span></button>
```

The SVG paths are from `@hugeicons/core-free-icons` (free tier, MIT-licensed
rendering utilities). `stroke="currentColor"` means they automatically inherit
the button's active/inactive text colour.

---

## Failure modes quick-reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| Chapters 2+ render blank | Missing `</div>` on a `.ch` wrapper | Run the depth-check script; add closing div before each `<!-- CH N -->` marker |
| `SyntaxError: Unexpected identifier 's'` | Apostrophe in JS double-quoted string (`\'`) | Rewrite desc strings without apostrophes; always use shell heredoc for script 2 |
| `SyntaxError: Unexpected token '<'` | Duplicate `<script><script>` open tag | Grep for `<script` count — must equal `</script>` count |
| Tooltip follows mouse, hear button unreachable | `mousemove` updating position | Position set once in `mouseenter` only — no `mousemove` listener |
| Tooltip disappears before button click | No delay, or `pointer-events:none` | 150ms `setTimeout` on hide; remove `pointer-events:none` |
| "Why it matters" page blank | Nested inside an unclosed sibling chapter | Run depth-check script — find which chapter has missing `</div>` |
| Quote annotations don't match section | Quotes placed thematically, not chronologically | Move every quote to the chapter where it actually occurs in the book |
| Nav counter shows "2 / 11 / 11" | Old single-span pattern; JS wrote full string into `nc` | Use two-span pattern: `<span id="nc">` for page, `<span id="ntot">` for total |
| Character Map boxes overflow text | Box height too small for 4 text lines | Use H≥72; measure: name(y+18) + subtitle(y+32) + desc1(y+48) + desc2(y+61) |
| Character Map lines cut through boxes | Lines not routed to exact edge midpoints | Precompute all edge midpoints in SVG comment block; use only H/V path segments |
| Character Map boxes overlap | Not enough column spacing | Use ≥170px column spacing with W=150 boxes (gives 20px gap between adjacent) |
| Header rule looks too narrow | `pg-rule max-width: 480px` | Set `max-width: 912px` to match full content width |
| Story chapters contain `.hl` / `.sym-row` blocks | Interpretation leaking into narrative | Move analysis to `.ch-recap` or to the "Why it matters" page |
| Quote uses `.quote-block` or `.pull-quote` class | Inconsistent markup | Rename to `.qt`; add `data-qid="[slug]-ch[N]-q[N]"` |
| Recap block missing from a chapter | Skipped by accident | Every story chapter must end with `.ch-recap` |
| Sidebar titles truncated | Labels too long for 178px column | Keep full label (Roman numeral + phrase) under 22 chars |
| Story chapter buttons wrapped in `.ti-icon` | Only icon buttons need the wrapper | Plain text buttons: `<button class="ti" onclick="go(N)">I · Title</button>` |
