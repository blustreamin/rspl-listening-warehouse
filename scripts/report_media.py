#!/usr/bin/env python3
"""
report_media.py — RSPL Baby-Diapers report v2, Agent 1 (ASSETS & WIRING).

Exposes a single pure stage function:

    inject_media(html: str, ctx: dict) -> str

It swaps the v1 base64 / placeholder imagery for the optimized WebP derivatives
produced by prepare-assets.py, following the CONFIRMED asset->section mapping in
scripts/assets-map.json (passed in via ctx['assets_map']).

Design principles (from CONTRACT.md):
  * Pure & idempotent-safe: same input -> same output; safe to run twice.
  * Defensive: no map entry / fragile anchor -> return html unchanged.
  * No `onerror` handlers are ever emitted (v1 used them; v2 drops them).
  * Everything below the fold gets loading="lazy" + explicit width/height so the
    browser reserves space and there is no layout shift.
  * "No image is better than a wrong one." Where a text anchor is ambiguous we
    HOLD (inject nothing). The held anchors and the reasons are documented inline
    beside each stage and summarised in the build report.

WIRED in this report:
  * Heroes  -> §01,02,03,04,05,06,09,10,11,12,14,16,17,18,21 (A-series, 3:2 box)
  * Cover   -> A10 divider swap (jpg -> webp), TOC grid left to Agent 4
  * §06     -> 5 persona portraits (P01..P05), matched by persona NAME in alt
  * §17     -> 5 brand logos (.llogo base64 -> assets/<brand>.webp, alt = brand)
  * §18     -> 5 brand-card monograms (.logo badge letter -> real logo image)
  * §11     -> Mother / Father role icons (C06/C07) on clean `.rn` anchors

HELD (reported, not wired) — anchors inspected in the real v1 output and found
fragile or absent:
  * §18 driver icons B01..B07 : only abbreviated matrix headers
                                ("Soft / O'night absorb / Rash safe / ...") — a
                                dense comparison table; icons would clutter it.
  * §19 driver icons B01..B07 : driver names appear only inside prose / verbatim
                                quotes — no standalone label anchor.
  * §14 C01..C03 (Trial/Repeat/Switch) : emitted journey uses a different frame
                                (Discover / Evaluate / Decide & buy / Repeat-switch);
                                "Trial" and "Switch" do not appear as labels.
  * §10 C04/C05 (Night, Day/Outing) : occasion rows already carry emoji glyphs
                                (🌙/🏠/🏫) and there is no single "Day/Outing"
                                label (it is split into Daytime home / Daycare).
  * §11 C08/C09 (Grandparent, Maalish wali) : not present as role-card labels
                                (only "Mother-in-law (saas)" and "Nanny / help",
                                plus zero-mention chips) — no exact anchor.
"""

import os
import re

# ---------------------------------------------------------------------------
# Intrinsic-dimension lookup (for explicit width/height -> no layout shift)
# ---------------------------------------------------------------------------
_DIM_CACHE = {}
_SERIES_DEFAULT = {"A": (1536, 1024), "B": (640, 640), "C": (640, 640), "P": (900, 1350)}
_LOGO_DEFAULT = {
    "pampers": (320, 320), "huggies": (739, 415), "mamypoko": (326, 151),
    "little-angels": (767, 492), "lovingle": (436, 212), "rspl": (234, 55),
    "blustream": (341, 93),
}


def _dims(ctx, code):
    """Intrinsic (w, h) for an optimized asset. Reads the real webp when it can
    (Pillow), else falls back to the known series/logo defaults. Cached."""
    if code in _DIM_CACHE:
        return _DIM_CACHE[code]
    dims = None
    try:
        from PIL import Image  # optional at inject time
        assets_dir = (ctx or {}).get("assets_dir", "assets")
        here = os.path.dirname(os.path.abspath(__file__))
        candidates = [
            os.path.join(assets_dir, code + ".webp"),
            os.path.join(here, "report-assets", "assets", code + ".webp"),
        ]
        for p in candidates:
            if os.path.isfile(p):
                with Image.open(p) as im:
                    dims = (im.width, im.height)
                break
    except Exception:
        dims = None
    if not dims:
        dims = _LOGO_DEFAULT.get(code) or _SERIES_DEFAULT.get(code[:1]) or (1536, 1024)
    _DIM_CACHE[code] = dims
    return dims


# ---------------------------------------------------------------------------
# Small HTML helpers
# ---------------------------------------------------------------------------
def _attr(tag, name):
    """Return the value of an HTML attribute from a single tag string, or None."""
    m = re.search(r'\b' + re.escape(name) + r'\s*=\s*"([^"]*)"', tag)
    return m.group(1) if m else None


def _esc(text):
    """Minimal attribute-safe escaping for alt text."""
    return (text or "").replace("&", "&amp;").replace('"', "&quot;")


# ---------------------------------------------------------------------------
# Stage 1 — Heroes
# ---------------------------------------------------------------------------
# v1 hero (to be removed): <div class="hero-img"><img ...></div>
_V1_HERO_RE = re.compile(r'<div class="hero-img">.*?</div>', re.S)
# our own previously-injected hero (idempotency): <figure class="rpt-hero" ...>...</figure>
# NB: the injected figure carries a style attribute, so match attributes too.
_V2_HERO_RE = re.compile(r'<figure class="rpt-hero"[^>]*>.*?</figure>', re.S)
_FIRST_H1_RE = re.compile(r'</h1>')


def _build_hero(ctx, code, alt):
    w, h = _dims(ctx, code)
    assets_dir = ctx.get("assets_dir", "assets")
    src = f"{assets_dir}/{code}.webp"
    # Fixed 3:2 aspect box + subtle navy legibility gradient. Inline styles keep
    # the treatment self-contained; the .rpt-hero class is a hook for report.css.
    return (
        '<figure class="rpt-hero" style="position:relative;margin:18px 0 22px;'
        'border-radius:14px;overflow:hidden;aspect-ratio:3/2;background:#0D2A55">'
        f'<img src="{src}" alt="{_esc(alt)}" width="{w}" height="{h}" loading="lazy" '
        'style="width:100%;height:100%;object-fit:cover;display:block"/>'
        '<span class="rpt-hero-grad" aria-hidden="true" style="position:absolute;'
        'inset:0;background:linear-gradient(180deg,rgba(13,42,85,0) 55%,'
        'rgba(13,42,85,0.42) 100%);pointer-events:none"></span>'
        '</figure>'
    )


def _inject_hero(html, ctx):
    heroes = ctx["assets_map"].get("heroes", {})
    code = heroes.get(ctx.get("num"))
    if not code:
        return html  # no hero for this section
    # Remove any pre-existing hero (v1 div and/or a prior v2 figure) first.
    html = _V1_HERO_RE.sub("", html)
    html = _V2_HERO_RE.sub("", html)
    alt = ctx["assets_map"].get("hero_alt", {}).get(ctx.get("num"), "")
    block = _build_hero(ctx, code, alt)
    # Insert immediately after the first </h1>. If there is no h1, hold.
    m = _FIRST_H1_RE.search(html)
    if not m:
        return html
    i = m.end()
    return html[:i] + block + html[i:]


# ---------------------------------------------------------------------------
# Stage 2 — Cover divider (is_cover): swap A10.jpg -> A10.webp, new treatment.
# ---------------------------------------------------------------------------
def _inject_cover(html, ctx):
    heroes = ctx["assets_map"].get("heroes", {})
    code = heroes.get("cover")
    if not code:
        return html
    w, h = _dims(ctx, code)
    assets_dir = ctx.get("assets_dir", "assets")
    alt = ctx["assets_map"].get("hero_alt", {}).get("cover", "Category divider")

    def repl(m):
        return (
            f'<img src="{assets_dir}/{code}.webp" alt="{_esc(alt)}" '
            f'width="{w}" height="{h}" loading="lazy" '
            'style="width:100%;height:auto;border-radius:0 0 16px 16px;display:block;'
            'margin-top:-2px;border:1px solid var(--line);border-top:none"/>'
        )

    # Match the v1 divider <img src="assets/A10.jpg" ...> (any current extension).
    pat = re.compile(r'<img\s+src="assets/A10\.(?:jpg|jpeg|png|webp)"[^>]*>')
    if pat.search(html):
        return pat.sub(repl, html, count=1)
    return html  # divider not found -> leave untouched


# ---------------------------------------------------------------------------
# Stage 3 — §06 persona portraits (match by persona NAME in the alt text)
# ---------------------------------------------------------------------------
_PIMG_RE = re.compile(r'<img\b[^>]*\bclass="pimg"[^>]*>')


def _inject_personas(html, ctx):
    amap = ctx["assets_map"]
    if ctx.get("num") not in amap.get("personas", {}):
        return html
    names = amap.get("persona_names", {})  # {P0x: "Name"}
    name_to_code = {v: k for k, v in names.items()}
    assets_dir = ctx.get("assets_dir", "assets")

    def repl(m):
        tag = m.group(0)
        src = _attr(tag, "src") or ""
        if not src.startswith("data:"):
            return tag  # already swapped -> idempotent
        alt = _attr(tag, "alt") or ""
        code = None
        for pname, pcode in name_to_code.items():
            if pname in alt:
                code = pcode
                break
        if not code:
            return tag  # unknown persona -> hold
        w, h = _dims(ctx, code)
        return (
            f'<img class="pimg" alt="{_esc(alt)}" src="{assets_dir}/{code}.webp" '
            f'width="{w}" height="{h}" loading="lazy">'
        )

    return _PIMG_RE.sub(repl, html)


# ---------------------------------------------------------------------------
# Stage 4a — §17 pricing brand logos (.llogo base64 -> assets/<brand>.webp)
# ---------------------------------------------------------------------------
# Each v1 logo is <span class="llogo"><img src="data:..." alt="<brandkey>" ...></span>.
_LLOGO_IMG_RE = re.compile(r'<img\b[^>]*\bsrc="data:image[^"]*"[^>]*>')


def _inject_pricing_logos(html, ctx):
    amap = ctx["assets_map"]
    logos = amap.get("logos", {})  # {brandkey: filestem}
    assets_dir = ctx.get("assets_dir", "assets")

    def repl(m):
        tag = m.group(0)
        alt = (_attr(tag, "alt") or "").strip()
        stem = logos.get(alt)
        if not stem:
            return tag  # not a known brand logo -> hold (idempotent for non-brand)
        w, h = _dims(ctx, stem)
        return (
            f'<img src="{assets_dir}/{stem}.webp" alt="{_esc(alt)}" '
            f'width="{w}" height="{h}" loading="lazy">'
        )

    return _LLOGO_IMG_RE.sub(repl, html)


# ---------------------------------------------------------------------------
# Stage 4b — §18 brand-card monograms (.logo letter badge -> real logo image)
# ---------------------------------------------------------------------------
# v1: <span class="bn"><span class="logo">P</span>Pampers<span class="tag ...">...
# The 20x20 .logo badge holds a monogram; we drop the real logo into it (contain).
_BRAND_DISPLAY = {
    "Pampers": "pampers", "Huggies": "huggies", "MamyPoko": "mamypoko",
    "Little Angels": "little-angels", "Lovingle": "lovingle",
}
_MONO_RE = re.compile(
    r'<span class="logo">([^<]{1,4})</span>('
    + "|".join(re.escape(d) for d in _BRAND_DISPLAY)
    + r')'
)


def _inject_brandcard_logos(html, ctx):
    logos = ctx["assets_map"].get("logos", {})
    assets_dir = ctx.get("assets_dir", "assets")

    def repl(m):
        display = m.group(2)
        stem = logos.get(_BRAND_DISPLAY[display])
        if not stem:
            return m.group(0)  # logo not supplied -> keep monogram
        return (
            '<span class="logo">'
            f'<img src="{assets_dir}/{stem}.webp" alt="{_esc(display)}" '
            'width="20" height="20" loading="lazy" '
            'style="width:100%;height:100%;object-fit:contain;display:block"></span>'
            f'{display}'
        )

    # Idempotent: once the badge holds an <img>, the [^<]{1,4} monogram group
    # no longer matches, so re-runs are no-ops.
    return _MONO_RE.sub(repl, html)


# ---------------------------------------------------------------------------
# Stage 5 — §11 role-card vector icons (only clean `.rn` anchors are wired)
# ---------------------------------------------------------------------------
def _inject_role_icons(html, ctx):
    vectors = ctx["assets_map"].get("vectors", {})
    vmap = vectors.get(ctx.get("num"))
    if not vmap:
        return html
    assets_dir = ctx.get("assets_dir", "assets")
    # The only clean, unambiguous vector anchor across the emitted vector sections
    # is the §11 role-card header: <span class="rn">Mother <span ...>. We wire an
    # inline icon there for any vector label that appears as an exact `.rn` label.
    # Labels that are NOT `.rn` role names (§10 emoji occasions, §14 Discover/…
    # steps, §11 Grandparent/Maalish) simply never match -> HELD.
    for label, code in vmap.items():
        # "<span class="rn">LABEL <"  — trailing space + '<' prevents matching
        # longer names (e.g. "Mother" must not match "Mother-in-law").
        pat = re.compile(r'(<span class="rn">)' + re.escape(label) + r'( <)')
        if not pat.search(html):
            continue  # HOLD: no clean anchor for this label in this section
        w, h = _dims(ctx, code)
        icon = (
            f'<img src="{assets_dir}/{code}.webp" alt="" aria-hidden="true" '
            f'width="18" height="18" loading="lazy" '
            'style="width:18px;height:18px;vertical-align:-3px;margin-right:5px;'
            'display:inline-block">'
        )
        # Insert the icon right after the opening <span class="rn"> (idempotent:
        # after insertion the label no longer immediately follows the span open).
        html = pat.sub(lambda m: m.group(1) + icon + label + m.group(2), html, count=1)
    return html


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def inject_media(html: str, ctx: dict) -> str:
    """Pure stage: swap v1 imagery for optimized WebP per the assets map.

    Returns html unchanged if ctx / assets_map are missing (defensive)."""
    if not html or not ctx or not ctx.get("assets_map"):
        return html

    if ctx.get("is_cover"):
        # Cover: ONLY the divider swap. TOC grid = Agent 4; footer = Agent 2.
        return _inject_cover(html, ctx)

    html = _inject_hero(html, ctx)
    html = _inject_personas(html, ctx)

    num = ctx.get("num")
    logo_sections = ctx["assets_map"].get("logo_sections", [])
    if num in logo_sections:
        if num == "17":
            html = _inject_pricing_logos(html, ctx)
        elif num == "18":
            html = _inject_brandcard_logos(html, ctx)

    html = _inject_role_icons(html, ctx)

    # NOTE — driver icons (§18/§19 B01..B07) are intentionally HELD: no clean,
    # unambiguous standalone driver label exists in the emitted output (abbreviated
    # matrix headers in §18; prose/verbatims in §19). See module docstring.
    return html
