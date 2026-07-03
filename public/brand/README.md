# Brand assets — booklet chrome logo slots

Live assets (wired in `BookletChrome.tsx` — all background-isolated PNGs):

- `blustream-logo.png` (341×93, color) — LIGHT surfaces: section header bar,
  interior chrome. Display width capped at 195px so the source renders crisp.
- `blustream-logo-white.png` (341×93, white monotone) — DARK surfaces: cover /
  back cover, straight on the navy, no backing plate.
- `rspl-logo.png` (272×86, color) — LIGHT surfaces: sits above the footer rule,
  bottom-right, ~34px tall.
- `rspl-logo-white.png` (272×86, white monotone) — DARK surfaces: cover /
  back cover, straight on the navy; display capped at 160px wide.

The images are never recolored, inverted or tinted in CSS. If a file is
missing, the components render a clean text-mark fallback instead of breaking.
