#!/usr/bin/env python3
"""report_immersion.py — Agent 4 (IMMERSION) stage for the RSPL Baby Diapers v2 bundle.

Pure, defensive, idempotent stage. Exposes a single entry point:

    inject_section(html: str, ctx: dict) -> str

Runs AFTER report_media (hero/logos) and report_nav (chrome) in the orchestrator.
It never re-nests or rewrites content — it only *adds a class token* to existing
top-level blocks (scroll-reveal + micro-polish hooks), and, on the cover, swaps the
v1 text TOC for a visual section grid. All motion is opt-in via `html.js-reveal`
(set by immersion.js), so with JS disabled / an absent IntersectionObserver / print
every block stays fully visible. See immersion.css / immersion.js for the styling
and behaviour that consume these hooks.

Design tokens & filenames per scripts/report-assets/CONTRACT.md. This module writes
NO files and touches only the string it is handed.
"""
from __future__ import annotations

import html as _html
import re

# ---------------------------------------------------------------------------
#  What NOT to reveal (page masthead + chrome). Everything else that is a direct
#  child of `.wrap` AND already carries a class attribute becomes a reveal target
#  — this covers every bespoke section block (band / ws / pair / vb / callbox /
#  note / hero / *row / cards / tables …) uniformly without enumerating each one,
#  while staying conservative: we only ever append a token to an existing class.
# ---------------------------------------------------------------------------
_SKIP_TOKENS = {
    "rpt-top", "rpt-foot", "kicker", "lede", "sub",
    "rpt-nav", "rpt-chrome", "rpt-pager", "rpt-crumbs",
    "pager", "prevnext", "breadcrumb", "crumb", "crumbs",
}

# Small tile/card blocks that also get a subtle hover-lift hook.
_LIFT_TOKENS = {"card", "pcard", "sc", "tier", "seg", "av"}

_VOID = {
    "img", "br", "hr", "meta", "input", "source", "link",
    "col", "area", "base", "wbr", "embed", "track", "param",
}

# Graceful image degrade for cover thumbnails: on load failure, hide the <img>
# and turn its wrapper into the navy placeholder tile (never a broken-image icon,
# never a fabricated asset).
_THUMB_ONERROR = (
    "this.style.display='none';"
    "this.parentNode.classList.add('cv-thumb--ph');"
    "this.parentNode.setAttribute('data-n',this.getAttribute('data-n'))"
)


# ===========================================================================
#  Balanced-tag scanner (same engine family as prepare-report.py)
# ===========================================================================
def _find_block_end(text: str, open_start: int, tag: str) -> int | None:
    """Index just past the tag closing the element opening at `open_start`
    (index of its '<tag'), accounting for nesting. None if unbalanced."""
    open_re = re.compile(r"<" + tag + r"\b", re.I)
    close_re = re.compile(r"</" + tag + r"\s*>", re.I)
    gt = text.find(">", open_start)
    if gt == -1:
        return None
    depth = 1
    pos = gt + 1
    while depth > 0:
        mo = open_re.search(text, pos)
        mc = close_re.search(text, pos)
        if mc is None:
            return None
        if mo is not None and mo.start() < mc.start():
            depth += 1
            pos = mo.end()
        else:
            depth -= 1
            pos = mc.end()
    return pos


def _class_tokens(open_tag: str) -> list[str]:
    m = re.search(r'class\s*=\s*"([^"]*)"', open_tag, re.I)
    return m.group(1).split() if m else []


def _add_tokens(open_tag: str, tokens) -> str:
    """Append class tokens to an element's existing class attribute (idempotent).
    Elements without a class attribute are left untouched (returned unchanged)."""
    m = re.search(r'class\s*=\s*"([^"]*)"', open_tag, re.I)
    if not m:
        return open_tag
    have = m.group(1).split()
    changed = False
    for t in tokens:
        if t not in have:
            have.append(t)
            changed = True
    if not changed:
        return open_tag
    return open_tag[:m.start()] + 'class="' + " ".join(have) + '"' + open_tag[m.end():]


def _skip_reveal(tokens: list[str]) -> bool:
    if not tokens:
        return True  # no class → not a "known block class" → leave alone
    for t in tokens:
        if t in _SKIP_TOKENS:
            return True
        if "foot" in t or "nav" in t:  # defensive: any nav/footer chrome variant
            return True
    return False


# ===========================================================================
#  SECTION pages — tag major content blocks with `.reveal` (+ `.rpt-lift`)
#
#  Some sections author their whole body directly under `.wrap`; others wrap it
#  in a pass-through container (a class-less <div>, or the large `.hero` body
#  wrapper — distinct from the `.hero-img` figure). We descend THROUGH those
#  transparent wrappers (bounded depth) and tag the real block children, so the
#  reveal lands on the same "major content block" layer either way.
# ===========================================================================
_WRAP_OPEN_RE = re.compile(r'<div\b[^>]*class="[^"]*\bwrap\b[^"]*"[^>]*>', re.I)
_TAG_OPEN_RE = re.compile(r"<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>", re.S)

# Class-less <div>/<section> or these body-wrapper classes are transparent: we
# reveal their children, not the wrapper itself.
_WRAPPER_TOKENS = {"hero", "body", "content", "inner", "container", "secbody", "sec-body"}
_MAX_DEPTH = 2  # wrap → wrapper → (nested wrapper) → blocks


def _is_passthrough(tag: str, tokens: list[str]) -> bool:
    if tag not in ("div", "section", "main", "article"):
        return False
    if not tokens:  # class-less structural wrapper
        return True
    if "hero" in tokens and "hero-img" not in tokens:  # the body wrapper, not the figure
        return True
    return any(t in _WRAPPER_TOKENS for t in tokens)


def _tag_edit(open_tag: str, start: int, open_end: int, tokens: list[str], edits: list) -> None:
    add = ["reveal"]
    if any(t in _LIFT_TOKENS for t in tokens):
        add.append("rpt-lift")
    new_open = _add_tokens(open_tag, add)
    if new_open != open_tag:
        edits.append((start, open_end, new_open))


def _collect_edits(html: str, inner_start: int, inner_end: int, edits: list, depth: int) -> int:
    """Tag block children in [inner_start, inner_end); returns the number of
    element children seen (so an empty wrapper can be tagged directly instead)."""
    seen = 0
    pos = inner_start
    while pos < inner_end:
        mo = _TAG_OPEN_RE.search(html, pos)
        if not mo or mo.start() >= inner_end:
            break
        tag = mo.group(1).lower()
        open_tag = mo.group(0)
        open_end = mo.end()
        if tag in _VOID:
            pos = open_end
            continue
        end = _find_block_end(html, mo.start(), tag)
        if end is None or end > inner_end:
            break  # malformed / spills past parent — stop rather than mis-tag
        seen += 1
        tokens = _class_tokens(open_tag)
        if depth < _MAX_DEPTH and _is_passthrough(tag, tokens):
            child_inner_start = open_end
            child_inner_end = html.rfind("</" + tag + ">", mo.start(), end)
            child_seen = _collect_edits(html, child_inner_start, child_inner_end, edits, depth + 1)
            if child_seen == 0 and not _skip_reveal(tokens):
                # genuinely empty transparent wrapper — tag it directly
                _tag_edit(open_tag, mo.start(), open_end, tokens, edits)
        elif not _skip_reveal(tokens):
            _tag_edit(open_tag, mo.start(), open_end, tokens, edits)
        pos = end
    return seen


def _inject_reveals(html: str) -> str:
    """Add `reveal` (and `rpt-lift` on card-like tiles) to the major content
    blocks inside the first `.wrap`, descending through transparent wrappers."""
    wm = _WRAP_OPEN_RE.search(html)
    if not wm:
        return html
    wrap_start = wm.start()
    wrap_end = _find_block_end(html, wrap_start, "div")
    if wrap_end is None:
        return html
    inner_start = html.index(">", wrap_start) + 1
    inner_end = html.rfind("</div>", wrap_start, wrap_end)
    if inner_end <= inner_start:
        return html

    edits: list[tuple[int, int, str]] = []  # (open_start, open_end, new_open_tag)
    _collect_edits(html, inner_start, inner_end, edits, 0)

    # apply last→first so earlier offsets stay valid
    edits.sort(key=lambda e: e[0])
    for start, o_end, new_open in reversed(edits):
        html = html[:start] + new_open + html[o_end:]
    return html


# ===========================================================================
#  COVER — replace the v1 text TOC (.part/.toc) with a visual section grid
# ===========================================================================
def _cover_grid_html(ctx: dict) -> str:
    sections = ctx.get("sections") or []
    amap = ctx.get("assets_map") or {}
    heroes = amap.get("heroes") or {}
    adir = ctx.get("assets_dir", "assets")

    cards: list[str] = []
    for s in sections:
        num = str(s.get("num", "") or "")
        target = s.get("target", "#") or "#"
        title = _html.escape(str(s.get("title", "") or ""))
        hero = heroes.get(num)
        if hero:
            thumb = (
                f'<span class="cv-thumb">'
                f'<img src="{adir}/{hero}.webp" alt="" loading="lazy" '
                f'data-n="{num}" onerror="{_THUMB_ONERROR}"></span>'
            )
        else:
            thumb = f'<span class="cv-thumb cv-thumb--ph" data-n="{num}" aria-hidden="true"></span>'
        cards.append(
            f'<a class="cv-card reveal" href="{target}">'
            f'{thumb}'
            f'<span class="cv-meta">'
            f'<span class="cv-num">{num}</span>'
            f'<span class="cv-ttl">{title}</span>'
            f'</span></a>'
        )
    if not cards:
        return ""
    return (
        '<nav class="cv-grid" aria-label="Report sections">\n'
        + "\n".join(cards)
        + "\n</nav>"
    )


def _remove_parts_capture(html: str) -> tuple[str, int | None]:
    """Remove every `<div class="part">…</div>` block (the v1 TOC groups) and
    return (new_html, index_of_first_removed_start)."""
    open_re = re.compile(r"<div\b[^>]*>", re.I)
    first_start: int | None = None
    pos = 0
    while True:
        m = open_re.search(html, pos)
        if not m:
            return html, first_start
        if "part" not in _class_tokens(m.group(0)):
            pos = m.end()
            continue
        end = _find_block_end(html, m.start(), "div")
        if end is None:
            pos = m.end()
            continue
        if first_start is None:
            first_start = m.start()
        html = html[:m.start()] + html[end:]
        pos = m.start()


def _inject_cover(html: str, ctx: dict) -> str:
    if 'class="cv-grid"' in html or "cv-grid" in html:
        return html  # already upgraded — idempotent no-op

    grid = _cover_grid_html(ctx)
    if not grid:
        return html  # no sections in ctx → inject nothing (defensive)

    # subtle cover hero treatment — add a marker class to the .cover block
    if "cv-immersive" not in html:
        html = re.sub(
            r'(<div\b[^>]*class=")([^"]*\bcover\b[^"]*)(")',
            lambda m: m.group(1) + m.group(2) + " cv-immersive" + m.group(3),
            html, count=1, flags=re.I,
        )

    new_html, first_start = _remove_parts_capture(html)
    if first_start is not None:
        html = new_html[:first_start] + grid + "\n" + new_html[first_start:]
        html = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", html)  # tidy blank runs
        return html

    # No .part blocks found (structure drift). Fall back to inserting the grid
    # before the cover's data note / footer, still without touching them.
    for anchor in ('<div class="pvnote"', '<div class="foot"', "</div>\n\n</body>", "</body>"):
        idx = html.find(anchor)
        if idx != -1:
            return html[:idx] + grid + "\n" + html[idx:]
    return html


# ===========================================================================
#  Public entry point
# ===========================================================================
def inject_section(html: str, ctx: dict) -> str:
    """Add the immersion layer to one emitted page.

    Cover (ctx['is_cover'] truthy): replace the v1 text TOC with a visual grid.
    Section pages: tag top-level `.wrap` blocks with `.reveal` (+ `.rpt-lift`).
    Pure / defensive / idempotent. Returns `html` unchanged on any anomaly.
    """
    if not isinstance(html, str) or not html:
        return html
    ctx = ctx or {}
    try:
        if ctx.get("is_cover"):
            return _inject_cover(html, ctx)
        return _inject_reveals(html)
    except Exception:  # pragma: no cover — never break the bundle over polish
        return html


__all__ = ["inject_section"]
