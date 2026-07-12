# Product

## Register

product

## Users

One user: the site owner (coregamehd), admin of two Thai-language Facebook pages — Kagami Visual Novel and Kagami Nihongo. Desktop only (1280×720+), often long drafting sessions. Mobile layout explicitly out of scope; broken CSS on small screens is acceptable.

## Product Purpose

A private post-generator toolbox. Each page is a form or snippet editor that assembles a Facebook post in a fixed house format; the output text is copied to the clipboard and pasted into Facebook. Success = fewer keystrokes per post and byte-exact template output.

## Brand Personality

Playful and otaku-sincere voice, strict system underneath. Two worlds, one site: VN red (#e84a4a) and Nihongo pink (#ff4081) over a quiet neutral frame. Quiet chrome, loud content.

## Anti-references

- Generic SaaS landing-page grammar — hero metrics, identical icon-card grids, eyebrow labels.
- Ad-stuffed, autoplaying, neon-on-black anime-site chaos.
- Sterile corporate polish.

## Design Principles

1. **Template text is sacred.** Generated post output must stay byte-exact; trailing spaces are significant. UI may change freely, output never.
2. **One accent, structural.** `data-accent` on `<html>` re-tints the page; no hardcoded accent hex outside style.css.
3. **Desktop workspace, not a webpage.** Single user on a big screen: persistent nav, split panes, actions always visible.
4. **No dependencies, no motion.** Plain HTML/CSS/vanilla JS; no animation, no hand-drawn SVG.
5. **Tagged language.** Every Thai run `lang="th"`, Japanese run `lang="ja"`.

## Accessibility & Inclusion

Single known user, but keep the floor: body text ≥4.5:1 contrast in both themes, visible focus states, native form controls. No motion anywhere, so reduced-motion is satisfied by construction.
