# Moizza Azhar — Portfolio

Static HTML/CSS/JS. No build step, no dependencies, free to host on GitHub Pages.

## Files

```
index.html                  home — hero + selected work
about.html                  about me
hobbies.html                off-the-clock page
resume.html                 full résumé (real content from your PDF)
case-studies/
  smartends-iot.html        001
  inovo.html                002
  quran-recitation.html     003
style.css                   the whole design system
script.js                   cursor, loader, reveals, magnetic buttons
Moizza-Azhar-Resume.pdf     linked from the résumé page + footer
assets/                     put your images here
```

## Theme

| Token | Value | Used for |
|---|---|---|
| `--bone` | `#F1EBE1` | page background (beige) |
| `--bone-deep` | `#E4DACB` | placeholder fills |
| `--paper` | `#FFFDF9` | cards, polaroid (white) |
| `--ink` | `#14110F` | text, buttons (black) |
| `--ink-soft` | `#554D46` | body copy |
| `--ink-faint` | `#90867B` | labels, captions |
| `--tan` | `#B99B72` | the single accent — bullets, section numbers |

All colours live at the top of `style.css`. Change those seven values and the
entire site re-themes.

**Type**: Instrument Serif (display), Inter Tight (body), Space Mono (labels).
All free from Google Fonts.

## Interactions

- **Dice loader** — rolls once on load, settles, fades out
- **Custom cursor** — a dot that tracks precisely plus a ring that lags behind; the ring swells and shows a label over anything clickable (`data-cursor="open"` sets the label)
- **Hover previews** — project rows float a thumbnail that follows your cursor
- **Magnetic buttons** — `data-magnetic="0.3"` pulls an element toward the pointer
- **Scroll reveal** — anything with `class="reveal"` fades up on entry, staggered
- **Marquee** — the skills strip; pauses on hover
- **Grid + gradient + grain** background, fixed behind everything
- **Console easter egg** — open dev tools

Touch devices skip cursor effects. `prefers-reduced-motion` disables all of it.

## To personalize

1. **Photo** — add `assets/profile.jpg`, then in `index.html` replace the
   `<p class="polaroid-placeholder">` with `<img src="assets/profile.jpg" alt="Moizza Azhar">`.
   Your résumé headshot works.
2. **LinkedIn** — search all files for `YOUR-HANDLE` and replace.
3. **Hobbies** — every `[bracketed]` block on `hobbies.html` is a prompt telling
   you what to write. These are guesses; replace with what's true.
4. **Case studies** — same bracket system. Content still needed from your Notion.
5. **Images** — each `.image-frame` is a placeholder. Replace with
   `<img src="assets/name.jpg" alt="...">`.

## Hosting free on GitHub Pages

```bash
git init
git add .
git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/YOURNAME/portfolio.git
git push -u origin main
```

Then **Settings → Pages → Source: main branch (root)**. Live at
`https://YOURNAME.github.io/portfolio/` within a minute or two.

Name the repo `YOURNAME.github.io` instead to get it at the root domain.
