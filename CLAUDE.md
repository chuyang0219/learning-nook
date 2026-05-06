# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static site of interactive book synopses, deployed on GitHub Pages. No build step, no framework — pure HTML/CSS/JS. Open any `.html` directly in a browser.

## Adding a new book

Use the `book-synopsis` skill. Read `.claude/skills/book-synopsis/SKILL.md` first — it orchestrates four subagents (Designer, Writer, Reader, Illustrator) and defines the full flow, agent prompts, and image insertion script.

Output paths:

- HTML: `classic-books/<slug>/<slug>.html`
- Images: `classic-books/<slug>/images/chapter_NN.jpg` + `manifest.json`

After adding a book, add a card to `index.html` manually.

Each book gets a **bespoke colour palette** from the Designer agent — do not copy colours or styles from another book.
