"""report_print — Agent 3 (PDF) stage for the RSPL Baby Diapers v2 bundle.

Builds ONE real, text-selectable ``print.html`` document from the final,
post-stage HTML of the cover + all 21 sections. This is NOT html2canvas: the
output is genuine HTML/CSS, so every word stays selectable and every image is
referenced (never re-encoded) from the shared ``assets/`` folder.

Public API (see CONTRACT.md §45):

    generate_print_html(emitted: list, base_ctx: dict) -> str

``emitted`` is ``[{num, target, title, html}, ...]`` for the cover followed by
the 21 sections in TOC order — each ``html`` is the FINAL emitted document
(after media / nav / immersion stages ran). We:

  * pull every section's inline ``<style>`` and **scope** it under a unique
    per-section wrapper id (``#pg-secN``) so 22 sets of generic class names
    (``.card``, ``.band``, ``.grid`` …) cannot clash in one cascade;
  * extract each ``<body>`` inner HTML, strip the sticky nav / reading-progress
    bar / TOC data island / all ``<script>`` tags and neutralise immersion
    reveal hooks that would otherwise hide content;
  * concatenate a print cover page first, then one ``<section class="pg">`` per
    section with ``page-break-before`` between them;
  * link the shared ``print.css`` (relative — print.html sits in the bundle
    root) and auto-open the print dialog on load.

Everything here is stdlib-only and defensive: malformed section HTML degrades
gracefully rather than raising.
"""

from __future__ import annotations

import html as _html
import re

__all__ = ["generate_print_html"]

# --------------------------------------------------------------------------- #
#  Chrome we remove from each section body (nav / progress / data islands).
#  Agent 2 replaces the v1 .rpt-top/.rpt-foot; we strip the nav but KEEP the
#  footer. Names we cannot know for certain are additionally hidden with
#  !important in print.css as a backstop.
# --------------------------------------------------------------------------- #
_STRIP_CLASSES = (
    "rnav",          # Agent-2 v2 sticky nav bar (contains rnav-progress) — integration reconcile
    "rpt-top",
    "rpt-progress",
    "reading-progress",
    "progress-bar",
    "rpt-nav",
    "site-nav",
    "rpt-topbar",
    "rpt-overlay",
    "toc-overlay",
    "nav-overlay",
    "rpt-toc-overlay",
    "rpt-scrollbar",
)

_STYLE_RE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.I | re.S)
_SCRIPT_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)
_SCRIPT_OPEN_RE = re.compile(r"<script\b[^>]*/?>", re.I)
_BODY_RE = re.compile(r"<body\b[^>]*>(.*?)</body>", re.I | re.S)
_HEAD_RE = re.compile(r"</head\s*>", re.I)
_COMMENT_CSS_RE = re.compile(r"/\*.*?\*/", re.S)


# =========================================================================== #
#  CSS scoping — prefix every selector in a <style> block with a wrapper id so
#  section styles cannot collide across the 22 concatenated blocks.
# =========================================================================== #
def _read_block(css: str, j: int) -> tuple[str, int]:
    """css[j] == '{'. Return (inner_without_braces, index_after_closing_brace).

    Quote-aware so ``content:"}"`` and friends do not close the block early.
    Falls back to end-of-string on unbalanced input.
    """
    depth = 0
    k = j
    n = len(css)
    q = None
    while k < n:
        c = css[k]
        if q is not None:
            if c == q and css[k - 1] != "\\":
                q = None
        elif c in "\"'":
            q = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return css[j + 1:k], k + 1
        k += 1
    return css[j + 1:], n


def _split_top_commas(sel: str) -> list[str]:
    """Split a selector list on top-level commas (respect (), [] and quotes)."""
    parts: list[str] = []
    depth = 0
    buf = []
    q = None
    for ch in sel:
        if q is not None:
            buf.append(ch)
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
            buf.append(ch)
        elif ch in "([":
            depth += 1
            buf.append(ch)
        elif ch in ")]":
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    tail = "".join(buf)
    if tail.strip():
        parts.append(tail)
    return parts


def _prefix_selector(selector: str, scope: str) -> str:
    """Prefix each comma-separated selector so it only matches inside ``scope``.

    ``:root`` / ``html`` / ``body`` collapse onto the wrapper itself so that
    ``:root{--x}`` variables and ``body{background}`` land on the section box
    (and thus inherit to its descendants).
    """
    out = []
    for raw in _split_top_commas(selector):
        p = raw.strip()
        if not p:
            continue
        low = p.lower()
        if low in (":root", "html", "body", "html body", ":where(html)", ":where(:root)"):
            out.append(scope)
        elif low == "*":
            out.append(f"{scope} *")
        elif low in (":root *", "html *", "body *"):
            out.append(f"{scope} *")
        elif low.startswith(("html ", "body ")):
            out.append(f"{scope} {p.split(None, 1)[1]}")
        elif low[:4] in ("html", "body") and len(p) > 4 and p[4] in ">~+":
            # leading html/body directly followed by a combinator (both 4 chars)
            out.append(scope + p[4:])
        else:
            out.append(f"{scope} {p}")
    return ", ".join(out) if out else scope


def _scope_css(css: str, scope: str) -> str:
    """Rewrite a CSS string so every rule is confined to ``scope``.

    Handles nested ``@media``/``@supports`` (recurses), passes ``@keyframes`` /
    ``@font-face`` through untouched, and drops ``@page`` (it would clobber our
    pagination). Best-effort tokeniser — sufficient for the report's simple
    inline styles; on anything it cannot parse it degrades to passthrough.
    """
    if not css or not css.strip():
        return ""
    css = _COMMENT_CSS_RE.sub("", css)
    result: list[str] = []
    i = 0
    n = len(css)
    guard = 0
    while i < n:
        guard += 1
        if guard > 500000:  # pathological input safety valve
            result.append(css[i:])
            break
        # skip whitespace between rules
        while i < n and css[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        if css[i] == "@":
            # at-rule: scan prelude to '{' or ';'
            j = i
            q = None
            while j < n:
                c = css[j]
                if q is not None:
                    if c == q:
                        q = None
                elif c in "\"'":
                    q = c
                elif c in "{;":
                    break
                j += 1
            prelude = css[i:j].strip()
            if j >= n:
                result.append(prelude)
                break
            if css[j] == ";":
                result.append(prelude + ";")
                i = j + 1
                continue
            inner, end = _read_block(css, j)
            name = prelude.split()[0][1:].lower() if prelude.split() else ""
            simple = re.sub(r"^-[a-z]+-", "", name)
            if simple in ("media", "supports", "document", "layer", "container", "scope"):
                result.append(prelude + "{" + _scope_css(inner, scope) + "}")
            elif simple == "page":
                pass  # drop — our @page owns pagination
            else:  # keyframes / font-face / counter-style / property / unknown
                result.append(prelude + "{" + inner + "}")
            i = end
        else:
            # style rule: scan selector prelude to '{'
            j = i
            q = None
            while j < n:
                c = css[j]
                if q is not None:
                    if c == q:
                        q = None
                elif c in "\"'":
                    q = c
                elif c == "{":
                    break
                j += 1
            if j >= n:
                break
            selector = css[i:j].strip()
            body, end = _read_block(css, j)
            if selector:
                result.append(_prefix_selector(selector, scope) + "{" + body + "}")
            i = end
    return "".join(result)


# =========================================================================== #
#  Body cleaning — strip nav / progress / scripts, keep footer + content.
# =========================================================================== #
def _class_token_re(cls: str) -> re.Pattern:
    """Match an opening tag whose class attribute contains ``cls`` as a whole
    token (so ``rpt-top`` never matches ``rpt-top-bar``)."""
    c = re.escape(cls)
    # token boundary via lookarounds so `rpt-top` never matches `rpt-top-bar`
    # and still matches when it is the first token right after the quote.
    return re.compile(
        r"<([a-zA-Z][\w-]*)\b[^>]*?\bclass\s*=\s*"
        r"(?:\"[^\"]*(?<![\w-])" + c + r"(?![\w-])[^\"]*\""
        r"|'[^']*(?<![\w-])" + c + r"(?![\w-])[^']*')"
        r"[^>]*>",
        re.I,
    )


def _strip_element_by_class(markup: str, cls: str) -> str:
    """Remove every element whose class list contains ``cls`` (balanced)."""
    pat = _class_token_re(cls)
    while True:
        m = pat.search(markup)
        if not m:
            return markup
        tag = m.group(1)
        start = m.start()
        # self-closing / void — just drop the tag itself
        if m.group(0).rstrip().endswith("/>"):
            markup = markup[:start] + markup[m.end():]
            continue
        open_re = re.compile(r"<" + re.escape(tag) + r"\b", re.I)
        close_re = re.compile(r"</" + re.escape(tag) + r"\s*>", re.I)
        pos = m.end()
        depth = 1
        end = len(markup)
        while pos < len(markup):
            om = open_re.search(markup, pos)
            cm = close_re.search(markup, pos)
            if cm is None:
                end = len(markup)
                break
            if om is not None and om.start() < cm.start():
                depth += 1
                pos = om.end()
            else:
                depth -= 1
                pos = cm.end()
                if depth == 0:
                    end = pos
                    break
        markup = markup[:start] + markup[end:]


def _clean_body(body: str) -> str:
    """Strip scripts + known nav/progress chrome from a section body."""
    if not body:
        return ""
    body = _SCRIPT_RE.sub("", body)          # paired <script>…</script>
    body = _SCRIPT_OPEN_RE.sub("", body)     # stray/self-closing <script …>
    body = _STYLE_RE.sub("", body)           # styles already hoisted to <head>
    for cls in _STRIP_CLASSES:
        body = _strip_element_by_class(body, cls)
    return body.strip()


def _extract_body(doc: str) -> str:
    """Return the inner HTML of <body>, or a best-effort fallback."""
    m = _BODY_RE.search(doc)
    if m:
        return m.group(1)
    # no <body>: use everything after </head>, else the whole doc
    hm = _HEAD_RE.search(doc)
    return doc[hm.end():] if hm else doc


def _collect_styles(doc: str) -> str:
    """Concatenate every <style> block found anywhere in the document."""
    return "\n".join(m.group(1) for m in _STYLE_RE.finditer(doc))


# =========================================================================== #
#  Assembly
# =========================================================================== #
_PRINT_TRIGGER = (
    "<script>window.addEventListener('load',function(){"
    "setTimeout(function(){try{window.print();}catch(e){}},400);});</script>"
)

_HEAD_RESET = (
    "*{box-sizing:border-box}"
    "html,body{margin:0;padding:0}"
    "img,svg,video{max-width:100%}"
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,"
    "Helvetica,Arial,sans-serif;color:#0f2440;background:#f6f8fb}"
)


def _esc(s) -> str:
    return _html.escape("" if s is None else str(s))


def _doc_title(base_ctx: dict) -> str:
    if isinstance(base_ctx, dict):
        for k in ("doc_title", "report_title", "toc_title", "title"):
            v = base_ctx.get(k)
            if v:
                return str(v)
    return "Baby Diapers — Category Report"


def _one_section(item: dict, idx: int) -> tuple[str, str]:
    """Return (scoped_css, section_html) for one emitted item.

    On any failure this returns empty CSS and a small placeholder rather than
    raising, so one bad section never sinks the whole document.
    """
    scope = f"#pg-sec{idx}"
    num = _esc((item or {}).get("num", ""))
    title = _esc((item or {}).get("title", ""))
    is_cover = str((item or {}).get("num", "")).lower() in ("cover", "index", "00", "—")
    cls = "pg pg-cover" if is_cover else "pg"

    try:
        doc = (item or {}).get("html") or ""
        scoped = _scope_css(_collect_styles(doc), scope)
        body = _clean_body(_extract_body(doc))
    except Exception as e:  # pragma: no cover — defensive only
        scoped = ""
        body = f"<p class='pg-error'>[section failed to render: {_esc(e)}]</p>"

    runhead = ""
    if not is_cover:
        label = num if not title else (f"{num} · {title}" if num else title)
        runhead = f'<div class="pg-runhead" aria-hidden="true">{label}</div>'

    section = (
        f'<section class="{cls}" id="pg-sec{idx}" data-num="{num}">'
        f"{runhead}{body}</section>"
    )
    return scoped, section


def generate_print_html(emitted: list, base_ctx: dict) -> str:
    """Build the single, text-selectable ``print.html`` document.

    Parameters
    ----------
    emitted : list of ``{num, target, title, html}`` — cover + 21 sections in
        TOC order, each the FINAL post-stage HTML.
    base_ctx : dict — the shared context (used only for a document title here;
        every field is optional/defensive).

    Returns
    -------
    str : a complete ``<!doctype html>`` document.
    """
    items = list(emitted) if emitted else []

    css_blocks: list[str] = []
    section_blocks: list[str] = []
    for idx, item in enumerate(items):
        try:
            scoped, section = _one_section(item, idx)
        except Exception as e:  # pragma: no cover — belt & suspenders
            scoped, section = "", (
                f'<section class="pg" id="pg-sec{idx}">'
                f"<p class='pg-error'>[section failed: {_esc(e)}]</p></section>"
            )
        if scoped:
            css_blocks.append(f"/* --- section {idx} --- */\n{scoped}")
        section_blocks.append(section)

    title = _esc(_doc_title(base_ctx))
    head = (
        "<!doctype html>\n"
        '<html lang="en"><head>'
        '<meta charset="utf-8"/>'
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>'
        f"<title>{title} · Print</title>"
        '<link rel="stylesheet" href="print.css"/>'
        f"<style>{_HEAD_RESET}</style>"
        f"<style>{''.join(css_blocks)}</style>"
        "</head><body>"
    )

    body = "".join(section_blocks) if section_blocks else (
        '<section class="pg"><p class="pg-error">'
        "[no sections were supplied]</p></section>"
    )

    return head + body + _PRINT_TRIGGER + "</body></html>"


# --------------------------------------------------------------------------- #
#  Ad-hoc self-test (never runs on import). Usage:
#    python report_print.py index.html 03-babycare-needs.html … > /tmp/out.html
# --------------------------------------------------------------------------- #
if __name__ == "__main__":  # pragma: no cover
    import sys
    from pathlib import Path

    files = [Path(a) for a in sys.argv[1:]]
    sample = []
    for i, p in enumerate(files):
        sample.append({
            "num": "cover" if i == 0 else f"{i:02d}",
            "target": p.name,
            "title": p.stem,
            "html": p.read_text(encoding="utf-8"),
        })
    sys.stdout.write(generate_print_html(sample, {"doc_title": "Baby Diapers — Category Report"}))
