# me

A static personal site that renders a single authoritative markdown file, `ZAC_DUTHIE.md`, in two modes:

- `AGENT`: raw markdown — what an LLM or scraper sees
- `HUMAN`: rendered HTML, with five switchable visual styles (Editorial, Brutalist, Newspaper, Soft, Minimal)

The site also ships `llms.txt` and `robots.txt` to be polite to both kinds of visitors.

## Local development

Because the site fetches `ZAC_DUTHIE.md` at runtime, serve it over a small local web server instead of opening `index.html` directly as a file.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

This repo is designed to work well on GitHub Pages:

1. Push the repository to GitHub.
2. Enable GitHub Pages for the repository.
3. Set the source to deploy from your default branch or a Pages workflow.
4. Add a custom domain later if you want the site on your own domain.

No build step is required.
