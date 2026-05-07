# Writer Failure Modes

Quick-reference for debugging. Consult only when a specific symptom appears — do not load proactively.

| Symptom | Cause | Fix |
|---------|-------|-----|
| Chapters 2+ render blank | Missing `</div>` on a `.ch` wrapper | Run depth-check script; add closing div before each `<!-- CH N -->` marker |
| `SyntaxError: Unexpected identifier 's'` | Apostrophe in JS double-quoted string | Rewrite desc strings without apostrophes; use shell heredoc for script 2 |
| `SyntaxError: Unexpected token '<'` | Duplicate `<script>` open tag | Grep for `<script` count — must equal `</script>` count |
| Tooltip hear button missing / not clickable | Old inline CSS-only tooltip, no JS | Use global `#tipbox` approach from Step 8; `pointer-events: auto` on `.tip-box` |
| Tooltip follows mouse, hear button unreachable | `mousemove` updating position | Position set once in `mouseenter` only |
| Tooltip disappears before button click | No delay or `pointer-events:none` | 150ms `setTimeout` on hide; remove `pointer-events:none` |
| Caption invisible or missing | `.ch-illus-caption` not in CSS | Add the rule from Step 11; it must have `display:block` and a `color` |
| Images are too large | `width:100%;max-width:680px` fills the column | Use `max-width:420px` and `margin:1.4rem auto` on `.ch-illustration` |
| Double-nested `<figure>` after image insertion | SVG wrapped in `<div>` not `<figure>` | Wrap SVG in `<figure class="ch-illustration">` directly (no outer div) |
| Caption shows source attribution | Insertion script appended attribution span | Caption = description only; no source credit in `<figcaption>` |
| "Why it matters" page blank | Nested inside unclosed sibling chapter | Run depth-check script |
| Quote annotations don't match section | Quotes placed thematically, not chronologically | Move every quote to the chapter where it occurs |
| Nav counter shows "2 / 11 / 11" | Old single-span pattern | Use two-span pattern: separate `nc` and `ntot` spans |
| Header rule looks too narrow | `pg-rule max-width` too small | Set `max-width: 912px` to match content width |
| Story chapters contain `.hl` / `.sym-row` blocks | Analysis leaking into narrative | Move to `.ch-recap` or to "Why it matters" page |
| Recap block missing from a chapter | Skipped | Every story chapter must end with `.ch-recap` |
| Fun Facts look same as theme cards | Both using `.hl` | Fun Facts must use `.fact-card` with distinct background and top border |
| Quotes page buried in "Why it matters" | Old structure | Quotes is its own page (N+2), after "Why it matters" |
| Sidebar titles truncated | Labels too long for sidebar | Keep full label under 22 chars |
| SVG strips overflow on mobile | Missing `viewBox` | Add `viewBox="0 0 680 90"` to every chapter SVG |
