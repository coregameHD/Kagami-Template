# template.kagamix.com

A private post-generator toolbox for the Kagami Facebook pages (Kagami Visual Novel and Kagami Nihongo). Each page is a form or snippet editor that assembles a Facebook post in a fixed house format — fill in the fields, watch the live preview, copy the result to the clipboard, paste into Facebook.

Deployed at https://template.kagamix.com (Vercel, static + one serverless function).

Built for one user on a desktop screen (1280×720+). Mobile layout is explicitly out of scope.

## Pages

### Kagami Visual Novel (red accent)

Free-form draft editors with a snippet rail. Click a template button to insert a full post skeleton at the cursor, then edit the placeholders (`developer`, `romaji`, `japanese`, `date`, …) in place.

| Page | Purpose |
|---|---|
| `/visualnovel/japanese` | News posts about Japanese VN releases — announcements, website launch, cast reveal, release date, delay, trial version, master up, new release |
| `/visualnovel/english` | News posts about English localizations — license announcement, Steam page, release date, launch |
| `/visualnovel/media` | Media posts — illustration, merchandise, music, screenshots |

All three share the same Snippets card (news headers, hyperlink lines, release-date and note blocks) and the same editor pane, both injected from `assets/app.js`.

### Kagami Nihongo (pink accent)

Form-based generators with a live preview pane. Each page builds one post type:

| Page | Post type |
|---|---|
| `/nihongo` | คำศัพท์ — vocabulary word (Japanese, romaji, Thai, word-type checkboxes, JLPT level, description, game credit) |
| `/nihongo/katakana` | คาตาคานะ — katakana loanword (same form, with an Origin field instead of romaji) |
| `/nihongo/yojijukugo` | โยจิจุคุโกะ — four-character compound (meaning + explanation sections) |
| `/nihongo/idioms` | สุภาษิต-สำนวน — proverbs and idioms |

The vocab page has a **Lookup** button: it queries the Jisho dictionary through `/api/jisho` and auto-fills romaji (kana → Hepburn conversion in `app.js`), word-type checkboxes (parts of speech mapped to the Thai labels), JLPT level, and the description opener.

### Kagami Blog (indigo accent)

| Page | Purpose |
|---|---|
| `/blog` | Markdown blog-post generator — builds frontmatter (title, categories, date, image, status) + body, downloads as `blogpost.md` |
| `/blog/publish` | Publish guide — copy-paste D1/R2 commands for pushing a post to the kagamix production blog |

## Features (shared across pages)

- **Live preview + char count** — generator pages rebuild the post on every keystroke.
- **Autosave** — every field is persisted to `localStorage` per page (`draft:<pathname>`), so drafts survive reloads and tab closes. Clear Draft wipes the saved copy too.
- **Copy to clipboard** — button or `Ctrl/Cmd+Enter` from anywhere on the page.
- **Theme** — light/dark via CSS `light-dark()`. The ☾/☀ toggle stores the choice in `localStorage`; with no stored choice the site follows the system preference.
- **No dependencies** — plain HTML/CSS/vanilla JS. No framework, no build step, no npm packages at runtime.

## Architecture

```
index.html              Landing page
visualnovel/*.html      VN post editors (japanese, english, media)
nihongo/*.html          Nihongo generators (one page per post type)
blog/index.html         Blog post generator
blog/publish.html       Publish guide (D1/R2 commands)
api/jisho.js            Vercel function: CORS proxy for the Jisho dictionary API
assets/style.css        All styling (kagamiX design tokens)
assets/app.js           Shared code: side nav, theme toggle, autosave, snippets,
                        kana→romaji, Jisho lookup, generator/editor wiring
vercel.json             cleanUrls (serves /nihongo/katakana from nihongo/katakana.html)
```

Each generator page contains only its own `build()` function returning the post text; everything else lives in `assets/app.js`:

- The side nav, the VN Snippets card, the VN editor pane, and the Nihongo Word Properties card are injected into empty placeholder elements — one source of truth for markup that repeats across pages.
- The two vocab pages (คำศัพท์, คาตาคานะ) share `setupVocabPage()` — same form and post format, different title and middle field.
- The three VN editor pages share `setupEditorPage()` — each page carries only its own template card.

`api/jisho.js` exists because jisho.org sends no CORS headers, so the browser can't call it directly. It proxies `/api/jisho?keyword=食べる` to the Jisho word-search API and caches the response at the edge for a day.

## Run locally

Any static file server works for everything except the Lookup button:

```sh
npm start          # npx serve on http://localhost:3000
```

The Lookup button needs the `/api/jisho` serverless function, which `serve` doesn't run. To test it locally, use the Vercel CLI instead:

```sh
npx vercel dev     # static site + api/ functions on http://localhost:3000
```

Everything else (templates, preview, autosave, copy, theme) is pure client-side and works under any server.

## Deploy

Push to `main` — Vercel builds nothing, serves the tree as-is with `cleanUrls` enabled and picks up `api/jisho.js` as a serverless function.

## Editing rules

**Template text is byte-exact.** The strings in `data-snippet` attributes and the page `build()` functions are the published post format. Do not reword, reindent, or trim them — several lines end with a deliberate trailing space (e.g. `📅 Release Date ⋮ `). Check with `grep -n ' $' <file>` after editing.

Other conventions:

- One accent per section: `data-accent` on `<html>` re-tints the page; no hardcoded accent hex outside `style.css`.
- Tag language: every Thai run `lang="th"`, Japanese run `lang="ja"`.
- No animation, no dependencies, no build step.
