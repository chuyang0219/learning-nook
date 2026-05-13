# CLAUDE.md

Static site of interactive book synopses, deployed on GitHub Pages. No build step, no framework — pure HTML/CSS/JS. Open any `.html` directly in a browser.

## Referring to books

I will typically use acronyms when referring to book titles, e.g. P&P for Pride and Prejudice, WH for Wuthering Heights.
If you find any acronyms confusing or ambiguous, clarify with me.

## Adding a new book

Use the `book-synopsis` skill. Read `.claude/skills/book-synopsis/SKILL.md` first — it orchestrates four subagents (Designer, Writer, Reader, Illustrator) and defines the full flow, agent prompts, and image insertion script.

Output paths:

- HTML: `classic-books/<slug>/<slug>.html`
- Images: `classic-books/<slug>/images/chapter_NN.jpg` + `manifest.json`

## Reminders

After adding a book synopsis, it also needs to be added to the shelf index.html. Use the `update-index` skill for this.

These pages are intended to be viewed on both desktop and mobile. Keep both in mind when designing or changing the layout, e.g., is this look mobile-friendly?

After any fix to a book page, you MUST — before reporting the task done — state whether the fix generalises to the skill, and either apply it or explain why not. Do not wait to be asked.
