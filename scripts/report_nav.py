#!/usr/bin/env python3
"""
report_nav.py — Agent 2 (NAVIGATION & FOOTER) stage for the RSPL "Baby Diapers"
v2 report bundle.

Public API
----------
    inject_chrome(html: str, ctx: dict) -> str

A **pure** function (no I/O, no globals mutated) run by the orchestrator AFTER
the v1 scrub + `report_media.inject_media`, and BEFORE `report_immersion`. It:

  SECTION pages (ctx['is_cover'] is falsey):
    • REPLACES the whole v1 ``<div class="rpt-top">…</div>`` with a **sticky**
      top bar: ``← Prev`` (real previous title) · a center ``§ Contents`` button
      + ``Section NN / 21`` · ``Next →`` (real next title) · a ``Download PDF``
      link (opens ``print.html``) · a thin reading-progress bar. At the report
      ends (prev/next None) the corresponding arrow is rendered disabled.
      The v1 ``<div class="kicker">…</div>`` line directly below is left intact.
    • REPLACES the whole v1 ``<div class="rpt-foot">…</div>`` with a rebuilt
      footer (Blustream + RSPL logos, attribution line, © 2026).
    • Injects the ``#rpt-nav-data`` JSON island once, before ``</body>``.

  COVER page (ctx['is_cover'] truthy):
    • NO sticky prev/next nav — the cover *is* the contents.
    • REPLACES the cover's ``<div class="foot">…</div>`` with the same rebuilt
      footer. Nothing else (TOC = Agent 4, hero = Agent 1) is touched.

Idempotent / defensive: every mutation is signature-guarded, so re-running is a
no-op; missing anchors degrade gracefully instead of raising.

The rebuilt chrome uses **fresh class names** (``rnav`` / ``rfoot`` / ``rtoc``)
so it never collides with the now-dead inline ``.rpt-top`` / ``.rpt-foot`` CSS
left behind in each page's ``<style>``. Styling/behaviour live in
``report-assets/report.css`` + ``report-assets/report.js`` (head includes added
by the main thread — NOT here).

Logos are REAL files (``assets/blustream.webp`` + ``assets/rspl.webp``, emitted
by Agent 1). A styled text-wordmark fallback is coded via ``onerror`` on each
``<img>`` in case a file is ever missing.
"""
from __future__ import annotations

import html as _html
import json
import re

TOTAL_SECTIONS = 21


# ---------------------------------------------------------------------------
#  Small helpers
# ---------------------------------------------------------------------------
def _esc(value) -> str:
    """HTML-escape for use in text nodes and double-quoted attributes."""
    return _html.escape("" if value is None else str(value), quote=True)


def _class_tokens(open_tag: str) -> list[str]:
    m = re.search(r'class\s*=\s*"([^"]*)"', open_tag, re.I)
    return m.group(1).split() if m else []


def _balanced_end(text: str, open_start: int, tag: str) -> int | None:
    """Index just past the tag that closes the element opening at `open_start`
    (the index of its ``<tag``), honouring nesting. None if unbalanced."""
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


def _find_div_block(text: str, token: str) -> tuple[int, int] | None:
    """(start, end) of the first ``<div>`` whose class list contains the exact
    `token` (balanced). None if not found / unbalanced."""
    open_re = re.compile(r"<div\b[^>]*>", re.I)
    for m in open_re.finditer(text):
        if token in _class_tokens(m.group(0)):
            end = _balanced_end(text, m.start(), "div")
            if end is not None:
                return (m.start(), end)
    return None


def _insert_before_body(text: str, snippet: str) -> str:
    idx = text.rfind("</body>")
    if idx == -1:
        return text + snippet
    return text[:idx] + snippet + "\n" + text[idx:]


def _insert_footer_fallback(text: str, footer: str) -> str:
    """Insert the footer inside `.wrap`, just before its closing `</div>`
    (the one immediately preceding `</body>`). Used only if no v1 footer div
    is present to replace."""
    idx = text.rfind("</body>")
    if idx == -1:
        return text + footer
    close_div = text.rfind("</div>", 0, idx)
    at = close_div if close_div != -1 else idx
    return text[:at] + footer + text[at:]


# ---------------------------------------------------------------------------
#  Markup builders
# ---------------------------------------------------------------------------
def _arrow_html(item: dict | None, kind: str) -> str:
    """Prev/Next arrow. `item` is {num,target,title} or None (end of report)."""
    is_prev = kind == "prev"
    dir_txt = "← Prev" if is_prev else "Next →"      # ← Prev / Next →
    dir_span = f'<span class="rnav-dir">{dir_txt}</span>'
    if not item:
        end_txt = "Start of report" if is_prev else "End of report"
        return (
            f'<span class="rnav-arrow rnav-{kind} is-disabled" aria-disabled="true">'
            f'{dir_span}<span class="rnav-ttl">{end_txt}</span></span>'
        )
    title = _esc(item.get("title", ""))
    target = _esc(item.get("target", ""))
    return (
        f'<a class="rnav-arrow rnav-{kind}" href="{target}" rel="{kind}" '
        f'title="{title}">{dir_span}<span class="rnav-ttl">{title}</span></a>'
    )


def _nav_html(ctx: dict) -> str:
    """The sticky section top bar (replaces the v1 `.rpt-top`)."""
    num = _esc(ctx.get("num", ""))
    sections = ctx.get("sections") or []
    total = len(sections) or TOTAL_SECTIONS
    prev_html = _arrow_html(ctx.get("prev"), "prev")
    next_html = _arrow_html(ctx.get("next"), "next")
    return (
        '<div class="rnav" role="navigation" aria-label="Report section navigation">'
        f"{prev_html}"
        '<div class="rnav-mid">'
        '<button type="button" class="rnav-toc" aria-haspopup="dialog" '
        'aria-expanded="false" aria-controls="rtoc-overlay">'
        '<span class="rnav-glyph" aria-hidden="true">§</span> Contents</button>'
        f'<span class="rnav-count">Section <b>{num}</b> '
        f'<span class="rnav-sep">/</span> {total}</span>'
        "</div>"
        f"{next_html}"
        '<a class="rnav-pdf" href="print.html" target="_blank" rel="noopener" '
        'title="Open the printable / PDF view">'
        '<span class="rnav-glyph" aria-hidden="true">↓</span>'
        '<span class="rnav-pdf-txt"> Download PDF</span></a>'
        '<div class="rnav-progress" aria-hidden="true">'
        '<span class="rnav-progress-fill"></span></div>'
        "</div>"
    )


def _footer_html(ctx: dict) -> str:
    """Rebuilt footer shared by cover + section pages.

    Real logos (Agent 1 emits ``assets/blustream.webp`` + ``assets/rspl.webp``)
    with an explicit width/height. Each ``<img>`` carries an ``onerror`` that
    hides the image and reveals a styled text wordmark sibling — the coded
    fallback for the (not expected) case that a logo file is missing.
    """
    assets = _esc(ctx.get("assets_dir", "assets"))
    onerr = ("this.style.display='none';"
             "var w=this.nextElementSibling;if(w)w.style.display='inline-block'")
    return (
        '<footer class="rfoot" role="contentinfo">'
        '<div class="rfoot-brand">'
        '<span class="rfoot-mark">'
        f'<img class="rfoot-logo rfoot-logo-bs" src="{assets}/blustream.webp" '
        'width="118" height="26" alt="Blustream Marketing Solutions" '
        f'loading="lazy" decoding="async" onerror="{onerr}">'
        '<span class="rfoot-wordmark" style="display:none">Blustream</span>'
        '</span>'
        '<span class="rfoot-x" aria-hidden="true">×</span>'
        '<span class="rfoot-mark">'
        f'<img class="rfoot-logo rfoot-logo-rspl" src="{assets}/rspl.webp" '
        'width="76" height="26" alt="RSPL Limited" '
        f'loading="lazy" decoding="async" onerror="{onerr}">'
        '<span class="rfoot-wordmark" style="display:none">RSPL</span>'
        '</span>'
        '</div>'
        '<div class="rfoot-txt">Built by <b>Blustream Marketing Solutions</b> '
        '· Commissioned by <b>RSPL Limited</b></div>'
        '<div class="rfoot-copy">© 2026</div>'
        '</footer>'
    )


def _data_island(ctx: dict) -> str:
    """The ``#rpt-nav-data`` JSON island the overlay TOC is built from."""
    sections = ctx.get("sections") or []
    cur_num = str(ctx.get("num", ""))
    current = next(
        (i for i, s in enumerate(sections) if str(s.get("num")) == cur_num), -1
    )
    payload = {
        "current": current,
        "sections": [
            {"num": s.get("num"), "target": s.get("target"), "title": s.get("title")}
            for s in sections
        ],
    }
    blob = json.dumps(payload, ensure_ascii=False)
    # Neutralise any sequence that could close the <script> element early.
    blob = blob.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script id="rpt-nav-data" type="application/json">{blob}</script>'


# ---------------------------------------------------------------------------
#  Page composers
# ---------------------------------------------------------------------------
def _inject_section(html: str, ctx: dict) -> str:
    # 1) sticky top bar (replace v1 .rpt-top); guard against double-inject
    if 'class="rnav"' not in html:
        blk = _find_div_block(html, "rpt-top")
        if blk:
            s, e = blk
            html = html[:s] + _nav_html(ctx) + html[e:]
        else:
            # defensive fallback: no v1 top bar → put the sticky nav first in .wrap
            html = re.sub(
                r'(<div class="wrap">)',
                lambda mm: mm.group(1) + "\n" + _nav_html(ctx),
                html, count=1,
            )

    # 2) rebuilt footer (replace v1 .rpt-foot)
    if 'class="rfoot"' not in html:
        blk = _find_div_block(html, "rpt-foot")
        if blk:
            s, e = blk
            html = html[:s] + _footer_html(ctx) + html[e:]
        else:
            html = _insert_footer_fallback(html, _footer_html(ctx))

    # 3) TOC data island (once, before </body>)
    if 'id="rpt-nav-data"' not in html:
        html = _insert_before_body(html, _data_island(ctx))

    return html


def _inject_cover(html: str, ctx: dict) -> str:
    # Cover has NO sticky nav and NO data island — only the rebuilt footer.
    if 'class="rfoot"' in html:
        return html
    blk = _find_div_block(html, "foot")   # cover uses class="foot"
    if blk:
        s, e = blk
        html = html[:s] + _footer_html(ctx) + html[e:]
    else:
        html = _insert_footer_fallback(html, _footer_html(ctx))
    return html


# ---------------------------------------------------------------------------
#  Public API
# ---------------------------------------------------------------------------
def inject_chrome(html: str, ctx: dict) -> str:
    """Replace v1 chrome with the v2 sticky nav + footer (+ TOC data island).

    Pure: returns a new string; never writes files or mutates `ctx`.
    """
    if not isinstance(html, str):
        raise TypeError("inject_chrome(html, ctx): html must be str")
    ctx = ctx or {}
    if ctx.get("is_cover"):
        return _inject_cover(html, ctx)
    return _inject_section(html, ctx)
