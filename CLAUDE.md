# CLAUDE.md

Static site of interactive book synopses, deployed on GitHub Pages. No build step, no framework — pure HTML/CSS/JS. Open any `.html` directly in a browser.

## Adding a new book

Use the `book-synopsis` skill. Read `.claude/skills/book-synopsis/SKILL.md` first — it orchestrates four subagents (Designer, Writer, Reader, Illustrator) and defines the full flow, agent prompts, and image insertion script.

Output paths:

- HTML: `classic-books/<slug>/<slug>.html`
- Images: `classic-books/<slug>/images/chapter_NN.jpg` + `manifest.json`

## Reminders

After adding a book, it also needs to be added to `index.html` manually.

These pages are intended to be viewed on both desktop and mobile. Keep both in mind when designing or changing the layout, e.g., is this look mobile-friendly?

When I report on something that I don't like or want to update in a specific book, always check whether the change is something general that could be translated into a principle or rule to be added to the `book-synopsis` skill.
We want to avoid the same mistakes happening again in future books.
