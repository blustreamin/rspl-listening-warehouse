# Brand logo assets (N-04 / N-38)

Drop the client's **real, supplied** brand PNGs here. They are loaded by
`BrandLogo` (components/report/blocks/BookletBlocks.tsx) at
`/brands/<slug>.png` and shown in the Brand Landscape (§12) perception cards.

- **Never generated, never hotlinked** — only genuine supplied assets.
- Transparent background preferred; they render at ~26px tall, ≤130px wide,
  `object-fit: contain` (never recoloured in CSS).
- Until a file exists, `BrandLogo` shows a clean uppercase text-mark of the
  brand name (the graceful empty state) — no broken image.

## Expected filenames (slug = lowercase, non-alphanumerics → hyphen)

| Brand | File |
|-------|------|
| Pampers | `pampers.png` |
| Huggies | `huggies.png` |
| MamyPoko | `mamypoko.png` |
| Little Angels / Littles | `little-angels.png` |
| Supples | `supples.png` |
| Bumtum | `bumtum.png` |
| Himalaya | `himalaya.png` |
| SuperBottoms | `superbottoms.png` |
| BabyHug | `babyhug.png` |
| Lovingle | `lovingle.png` |

Slug aliases handled in code: `little angels`/`littles` → `little-angels`,
`mamy poko` → `mamypoko`, `super bottoms` → `superbottoms`, `baby hug` →
`babyhug`. Any other brand name is slugified automatically
(`brandSlug()`), so new brands only need a matching `<slug>.png` here.
