#!/usr/bin/env python3
"""
prepare-report.py — Scrub + rename the RSPL "Baby Diapers — Category Report"
prototype HTMLs into a clean, client-facing static bundle.

Source  : a folder of ~25 prototype HTML files (21 sections + cover + 3 dupes).
Output  : public/reports/baby-diapers/  (index.html + 21 numbered sections).

Design notes
------------
The prototypes are hand-authored, occasionally malformed HTML. Re-serialising
them through BeautifulSoup mangles indentation and can drop malformed subtrees
(pure BS4 failed on these files before), so the transforms here are marker-slice
string surgery on the raw text (byte-preserving), driven by a small balanced-tag
scanner. BeautifulSoup is used only as a *verification* aid (parse the OUTPUT and
cross-check residual scaffold classes / links / images); if bs4 is unavailable it
degrades to regex and says so — the scrub never depends on bs4.

Two before/after prototype scaffolds exist and are handled differently:
  • div.two > div.mini.before/.mini.after  — both panels are META-DESCRIPTIONS of
    the redesign; the real content lives elsewhere in the body → remove the whole
    div.two block.
  • div.grid2 > div.cmp.before + div.cmp.after > div.bd — the AFTER .bd CONTAINS
    the real section content → drop .cmp.before, drop the .cmp.after .hd label, and
    unwrap grid2/cmp.after/bd so the after-body becomes the plain section body.

The transform is idempotent: on an already-clean file every step is a signature-
guarded no-op, so the 4 already-reframed files (01, 03, 09-s15, 20) are not
re-scrubbed blindly.

Usage
-----
    python3 scripts/prepare-report.py \
        --src "~/Downloads/RSPL HTMLs" \
        --out public/reports/baby-diapers
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup  # type: ignore
    HAVE_BS4 = True
except Exception:  # pragma: no cover - bs4 optional
    BeautifulSoup = None  # type: ignore
    HAVE_BS4 = False


# ---------------------------------------------------------------------------
#  FILE MAP  — extracted from index.html's 21 TOC hrefs (the single source of
#  truth). (source basename, target basename, section number, TOC title).
#  Duplicates NOT listed here are ignored:
#    - "index (1).html"                (divergent stale cover; index.html wins)
#    - "s11-channel-dynamics (1).html" (byte-identical to s11-channel-dynamics)
#    - "s15-parenting-rituals.html"    (raw; superseded by 09-s15, the reframed one)
# ---------------------------------------------------------------------------
COVER = ("index.html", "index.html", None, "Cover")

SECTIONS = [
    ("01-exec-summary.html",            "01-exec-summary.html",             "01", "Executive Summary"),
    ("s12-data-foundation.html",        "02-s12-data-foundation.html",      "02", "Data Foundation & Methodology"),
    ("03-babycare-needs.html",          "03-babycare-needs.html",           "03", "Category Needs — Babycare (F/E/S)"),
    ("s05-diaper-needs-fes.html",       "04-diaper.html",                   "04", "Diaper Needs (F/E/S)"),
    ("s14-needs-by-lifestage.html",     "05-s14-needs-by-lifestage.html",   "05", "Needs by Lifestage"),
    ("s19-consumer-personas-v2.html",   "06-s19-consumer-personas-v2.html", "06", "Consumer Personas"),
    ("first-vs-second-time-moms.html",  "07-first-vs-second-time-moms.html","07", "First-Time vs Second-Time Moms"),
    ("s11-consumer-vocabulary.html",    "08-s11-consumer-vocabulary.html",  "08", "Consumer Vocabulary"),
    ("09-s15-parenting-rituals.html",   "09-s15-parenting-rituals.html",    "09", "Parenting Rituals"),
    ("s07-usage-occasions.html",        "10-usage.html",                    "10", "Usage Occasions"),
    ("family-roles-babycare.html",      "11-family-roles-babycare.html",    "11", "Family Roles — Babycare"),
    ("s16-family-roles-diapering.html", "12-s16-family-roles-diapering.html","12", "Family Roles — Diapering"),
    ("shopper-roles.html",              "13-shopper-roles.html",            "13", "Shopper Roles — Who Buys"),
    ("s06-decision-journey.html",       "14-journey.html",                  "14", "Decision Journey"),
    ("s13-shopping-search-terms.html",  "15-s13-shopping-search-terms.html","15", "Shopping Search Terms"),
    ("s11-channel-dynamics.html",       "16-channel.html",                  "16", "Channel Dynamics"),
    ("s10-pricing-dynamics.html",       "17-s10-pricing-dynamics.html",     "17", "Pricing Dynamics"),
    ("s-competitive-landscape.html",    "18-competitive-landscape.html",    "18", "Competitive Landscape"),
    ("s09-features-benefits (1).html",  "19-features.html",                 "19", "Features & Benefits"),
    ("20-regional-differences.html",    "20-regional-differences.html",     "20", "Regional Differences"),
    ("lovingle-journey.html",           "21-lovingle-journey.html",         "21", "Brand Spotlight — Lovingle"),
]

TOTAL_SECTIONS = 21
REPORT_LABEL = "Baby Diapers — Category Report"

# Sections whose <h1> must be *replaced* (not just span-stripped) to reframe the
# prototype's brand-journey framing into category-report framing. (Task 1c: §21.)
H1_OVERRIDE = {
    "21": "Brand Spotlight — Lovingle",
}

# ---------------------------------------------------------------------------
#  INLINE SCRUBS  — Nikita / internal-review / redesign-process references
#  embedded in KEPT prose (ledes, framings, coverage notes) that survive block
#  removal. Keyed by section number so a scrub only ever touches its own file
#  (no cross-file collision on short strings like "The redesign"). Each is an
#  EXACT verbatim substring -> replacement. Sourced from the parallel survey;
#  the driver reports any exact string that fails to match so drift is caught.
#  Precedent from the known-good raw->clean transform: "The redesign" -> "This section".
# ---------------------------------------------------------------------------
INLINE_SCRUBS: dict[str, list[tuple[str, str]]] = {
    "02": [
        ("The redesign turns a wall of caveats", "It turns a wall of caveats"),
        # div.rebuild is KEPT (legit provenance); only strip its "(for Nikita)" label.
        ("Read-across note (for Nikita):", "Read-across note:"),
    ],
    "04": [
        ("Same F/E/S grammar as §03 — reused deliberately, that's the design system working — but tuned to <b>diaper-specific</b> needs and a much sharper commercial whitespace: the mid-premium ₹399–₹699 corridor where <b>no brand owns rash-free skin</b>. Satisfies Nikita item 12 (unmet needs F/E/S) — likely the \"page 5\" she flagged.",
         "Diaper needs read through a functional, emotional, and social lens, with a sharp commercial whitespace: the mid-premium ₹399–₹699 corridor where <b>no brand owns rash-free skin</b>."),
    ],
    "05": [
        ("The redesign makes that reset the hero", "This section makes that reset the hero"),
    ],
    "06": [
        ('v1 (the 2×2 map + count cards) was locked. This v2 pass adds the three things asked for: a <b>portrait per persona</b> (generated on-brand via the image pipeline, filenames <b>P01–P05</b>), <b>percentages instead of raw counts</b>, and a <b>per-persona graph</b>',
         'Each of the five personas is presented with a <b>portrait</b>, its <b>percentage share of persona-coded voices</b>, and a <b>per-persona graph</b>'),
        (" All numbers are the frozen graph; nothing fabricated.", ""),
        (" (method note retained)", ""),
        ("/* persona cards v2 */", "/* persona cards */"),
    ],
    "07": [
        ("so the redesign is a straight side-by-side", "so this section is a straight side-by-side"),
        ("not the personas (those live in §19)", "not the personas (covered separately)"),
        ("explicit parity signal per §12)", "explicit parity signal)"),
    ],
    "08": [
        (" Nikita's three edits are applied: the separate Language column is gone (vernacular folded into the term), frequency is shown as %, and the Trade Vocabulary block is dropped.", ""),
        (" per Nikita", ""),
    ],
    "10": [
        ("splits (items 14–16).", "splits."),
        ("The <b>seasonality graph gets the honest fix</b> Nikita asked for (item 17): it's re-labelled as",
         "The <b>seasonality graph is labelled honestly</b>: it's shown as"),
        ("Region lens — occasion texture by geography (item 16)", "Region lens — occasion texture by geography"),
    ],
    "11": [
        ("The redesign", "This section"),
    ],
    "12": [
        ("The redesign shows", "This section shows"),
        ("then replaces a list of tensions with a", "then presents the household tensions as a"),
    ],
    "13": [
        ("The redesign", "This section"),
    ],
    "14": [
        ('and a size table — currently five prose piles with no visual journey. The model gives it a <b>4-stage spine with vector icons</b> (the rendered C-series), a trust-ranked discovery ladder, and fixes the invisible "SIZE" header (item 13).',
         'and size selection come together in a <b>4-stage journey spine</b>, a trust-ranked discovery ladder, and a per-lifestage size table.'),
        (' <span style="color:var(--good);font-weight:700;text-transform:none;letter-spacing:0">✓ header now legible (was invisible)</span>', ""),
        (" Journey-stage icons = rendered C-series vectors.", ""),
        ("/* size table — SIZE header FIXED (was invisible white-on-blue) */", "/* size table */"),
    ],
    "15": [
        ("Per Nikita, the ~12% long-tail (seasonal, daycare, occasion)", "The ~12% long-tail (seasonal, daycare, occasion)"),
        ("Per Nikita, the ~12% long-tail (seasonal breathability, monsoon rash, daycare, occasion-linked)", "The ~12% long-tail (seasonal breathability, monsoon rash, daycare, occasion-linked)"),
        ("from §10 in search form", "in search form"),
    ],
    "16": [
        ("Nikita asked for channel rank/%, urgency-vs-planned per channel,", "This section maps channel rank/%, urgency-vs-planned per channel,"),
        ("so the model marks them honestly as insufficient signal rather than inventing them", "so they are marked honestly as insufficient signal rather than invented"),
        ("Showing Nikita where the evidence ends is the professional answer.", "Showing where the evidence ends is the professional answer."),
    ],
    "17": [
        ("The redesign leads with a price-ceiling ladder (the one visual the client will look for), ranks", "This section leads with a price-ceiling ladder, ranks"),
        ("not scraped transaction prices (N-47/N-48 had insufficient direct price data). Nothing fabricated.", "not scraped transaction prices (direct price data was insufficient)."),
        ("pack-band token analysis (N-37) &amp; per-piece review language", "pack-band token analysis &amp; per-piece review language"),
        (" &nbsp;·&nbsp; real brand logos composited (◆ Lovingle = own; competitors shown for identification only, never generated). Lovingle mark cropped from the Pro-ease/lovingle lockup to the lovingle wordmark.", ""),
        ("pack-band tokens (N-37) &amp; per-piece review language, calibrated against N-47/N-48 which returned insufficient direct price-field data. Stated thin honestly: zero priced tape records (N-47), consumer-level pack-band laddering blocked by the missing SKU key (N-37/N-49),",
         "pack-band tokens &amp; per-piece review language, calibrated against sources which returned insufficient direct price-field data. Stated thin honestly: zero priced tape records, consumer-level pack-band laddering blocked by the missing SKU key,"),
    ],
    "18": [
        ("The ultimate density test — 11 brands", "Eleven brands"),
        ('This is where your <b>"restructure the dense matrix, keep it always-visible"</b> decision gets proven: the 7-driver grid becomes a <b>colour heatmap</b> readable in one glance, not shrunk prose.',
         'The 7-driver grid is presented as a <b>colour heatmap</b> readable in one glance, not shrunk prose.'),
        (" Also lands Nikita items 20 (logos), 22 (SOV%/stars upfront), 40 (cues as signal), 43 (declutter driver chart).", ""),
        (" Logos = real files (composited).", ""),
    ],
    "19": [
        ("The current render stacks ~13 feature blocks as prose; the one insight (<i>two things are non-negotiable, everything else is earned</i>) drowns. The model turns it into a ranked ladder.",
         "Two things are non-negotiable; everything else is earned."),
        ("2 of 5 draft verbatims were unverified and excluded", "2 of 5 verbatims were unverified and excluded"),
    ],
    "21": [
        ("The redesign draws it as one funnel with a gate", "This section draws it as one funnel with a gate"),
        ("per §12 confidence", "per the Data Foundation confidence"),
    ],
}

# Graceful image degrade: hide the broken <img> AND drop its figure wrapper if
# present. Covers .hero-img (sections) and the cover's unclassed div (display:none
# alone collapses it). Data-URI images never 404, so onerror is harmless there.
# Task 1e — never fabricate placeholders.
ONERROR = ("this.onerror=null;this.style.display='none';"
           "this.closest('.hero-img,.hero,figure,.rpt-hero,.rpt-cover-img')?.remove()")

# Shared chrome (matches the already-reframed reference files byte-for-byte).
CSS_CHROME = (
    ".rpt-top{display:flex;justify-content:space-between;align-items:center;"
    "border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:8px;font-size:11px}"
    ".rpt-home{color:var(--brand2);font-weight:800;text-decoration:none;letter-spacing:-.01em}"
    ".rpt-sec{color:var(--muted);font-weight:700}"
    ".rpt-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"
    "border-top:1px solid var(--line);margin-top:26px;padding-top:14px;font-size:11px;color:var(--muted)}"
    ".rpt-foot b{color:var(--ink2)}.rpt-foot a{color:var(--brand);text-decoration:none;font-weight:700}"
)


# ===========================================================================
#  Balanced-tag scanner (marker-slice engine)
# ===========================================================================
def find_block_end(text: str, open_start: int, tag: str) -> int | None:
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


def _first_block_where(text: str, tag: str, pred, start: int = 0):
    """(match_start, block_end, inner_html) of the first <tag> whose class tokens
    satisfy pred(tokens). None if not found / unbalanced."""
    open_re = re.compile(r"<" + tag + r"\b[^>]*>", re.I)
    for m in open_re.finditer(text, start):
        if pred(_class_tokens(m.group(0))):
            end = find_block_end(text, m.start(), tag)
            if end is None:
                return None
            open_end = text.index(">", m.start()) + 1
            inner = re.sub(r"</" + tag + r"\s*>$", "", text[open_end:end], count=1, flags=re.I)
            return (m.start(), end, inner)
    return None


def remove_elements_with_class(text: str, tag: str, token: str, keep_if=None) -> str:
    """Remove every <tag> whose class list contains `token` (balanced).
    keep_if(block_html)->bool spares a matching element."""
    open_re = re.compile(r"<" + tag + r"\b[^>]*>", re.I)
    search_from = 0
    while True:
        m = open_re.search(text, search_from)
        if not m:
            return text
        if token not in _class_tokens(m.group(0)):
            search_from = m.end()
            continue
        end = find_block_end(text, m.start(), tag)
        if end is None:
            search_from = m.end()
            continue
        if keep_if and keep_if(text[m.start():end]):
            search_from = end
            continue
        text = text[:m.start()] + text[end:]
        search_from = m.start()


def remove_all_tags(text: str, tag: str) -> str:
    """Remove every <tag>...</tag> (balanced). Used for <button> (no legit buttons
    in a static report)."""
    open_re = re.compile(r"<" + tag + r"\b[^>]*>", re.I)
    search_from = 0
    while True:
        m = open_re.search(text, search_from)
        if not m:
            return text
        end = find_block_end(text, m.start(), tag)
        if end is None:
            search_from = m.end()
            continue
        text = text[:m.start()] + text[end:]
        search_from = m.start()


def unwrap_cmp_before_after(text: str) -> str:
    """div.grid2 wrapping a before/after cmp comparison -> its .cmp.after > .bd
    inner content (drops .cmp.before and the .cmp.after .hd label, unwraps grid2).
    A div.grid2 that is NOT a before/after comparison is left untouched."""
    open_re = re.compile(r"<div\b[^>]*>", re.I)
    search_from = 0
    while True:
        m = open_re.search(text, search_from)
        if not m:
            return text
        if "grid2" not in _class_tokens(m.group(0)):
            search_from = m.end()
            continue
        end = find_block_end(text, m.start(), "div")
        if end is None:
            search_from = m.end()
            continue
        block = text[m.start():end]
        if "cmp after" not in block and 'class="cmp after"' not in block and "after" not in block:
            search_from = end
            continue
        after = _first_block_where(block, "div", lambda t: "cmp" in t and "after" in t)
        if after is None:
            search_from = end
            continue
        after_inner = after[2]
        bd = _first_block_where(after_inner, "div", lambda t: "bd" in t)
        promoted = bd[2] if bd else after_inner
        text = text[:m.start()] + promoted + text[end:]
        search_from = m.start() + len(promoted)


def strip_html_comments(text: str) -> str:
    """Remove HTML comments (<!-- ... -->). They are inert and here are all
    prototype/process markers (<!-- BEFORE -->, <!-- v1 recap -->, page-breaks)."""
    return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)


def strip_section_xrefs(text: str) -> str:
    """Remove STALE prototype section cross-references in body prose — "(§NN)",
    "(§NN/§NN)", "(that's §NN)", "(Section NN)" — which use the old prototype
    numbering that no longer matches the renumbered final TOC. The section's own
    "· §NN" self-label in <title> has no surrounding parens, so it is untouched.
    "(§NN — data…)" keeps the data: only the "§NN — " is dropped."""
    text = re.sub(r"\(§\d+\s*—\s*", "(", text)                                # "(§11 — Flipkart" -> "(Flipkart"
    text = re.sub(r"\s*\((?:that.s\s+)?§\d+(?:\s*/\s*§\d+)*\)", "", text)      # "(§03)","(§02/§08)","(that's §08)"
    text = re.sub(r"\s*\(Section \d+\)", "", text)                            # "(Section 12)"
    return text


# ===========================================================================
#  Per-file transforms
# ===========================================================================
def rewrite_title(text: str, num: str, toc_title: str) -> str:
    """Rewrite <title> to category framing UNLESS it already is. Idempotent."""
    def repl(m: re.Match) -> str:
        if m.group(1).startswith(REPORT_LABEL):
            return m.group(0)
        return f"<title>{REPORT_LABEL} · §{num} {toc_title}</title>"
    return re.sub(r"<title>(.*?)</title>", repl, text, count=1, flags=re.DOTALL)


def replace_kicker(text: str, num: str) -> str:
    """Replace the prototype kicker (RSPL · Lovingle · Phase 1 Section Prototype[…])
    with the category kicker. Signature-guarded, so a correct kicker is untouched."""
    new = (f'<div class="kicker">{REPORT_LABEL} &nbsp;·&nbsp; '
           f'Section {num} of {TOTAL_SECTIONS}</div>')
    return re.sub(
        r'<div class="kicker">[^<]*Phase 1 Section Prototype[^<]*</div>',
        new, text, flags=re.I,
    )


def clean_h1(text: str, num: str) -> str:
    """Strip ALL annotation spans + a leading '§NN — ' prefix from the first <h1>
    (every section h1's spans are density/LOCKED/§-ref annotations — verified).
    If the section has an H1 override, replace the whole title text."""
    m = re.search(r"(<h1\b[^>]*>)(.*?)(</h1>)", text, re.DOTALL)
    if not m:
        return text
    open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)
    if num in H1_OVERRIDE:
        new_inner = H1_OVERRIDE[num]
    else:
        new_inner = re.sub(r"<span\b[^>]*>.*?</span>", "", inner, flags=re.DOTALL)
        new_inner = re.sub(r"^\s*§\s*\d+\s*[—–-]\s*", "", new_inner)      # drop "§NN — "
        new_inner = re.sub(r"(&nbsp;|\s)+", " ", new_inner).strip()        # collapse ws/&nbsp;
    return text[:m.start()] + open_tag + new_inner + close_tag + text[m.end():]


def relabel_callbox(text: str) -> str:
    """'Lovingle read →' callbox label -> 'Brand implication →' (label only;
    body prose, including Lovingle mentions, is left untouched)."""
    return re.sub(r"(<b>)\s*Lovingle read\s*→", r"\1Brand implication →", text)


def apply_inline_scrubs(text: str, num: str, unmatched: list) -> str:
    for exact, replacement in INLINE_SCRUBS.get(num, []):
        if exact in text:
            text = text.replace(exact, replacement)
        else:
            unmatched.append((num, exact[:70]))
    return text


def add_img_onerror(text: str) -> str:
    """Add graceful onerror to every <img> lacking one. Never fabricates images."""
    def repl(m: re.Match) -> str:
        tag = m.group(0)
        if re.search(r"onerror\s*=", tag, re.I):
            return tag
        return re.sub(r"\s*/?>$", f' onerror="{ONERROR}">', tag, count=1)
    return re.sub(r"<img\b[^>]*?/?>", repl, text)


def inject_chrome(text: str, num: str) -> str:
    """Ensure rpt-top nav, rpt-foot, and their CSS exist. Idempotent."""
    if ".rpt-top{" not in text:
        text = text.replace("</style>", CSS_CHROME + "</style>", 1)
    if 'class="rpt-top"' not in text:
        nav = (f'\n<div class="rpt-top"><a href="index.html" class="rpt-home">{REPORT_LABEL}</a>'
               f'<span class="rpt-sec">Section {num} / {TOTAL_SECTIONS}</span></div>')
        text = re.sub(r'(<div class="wrap">)', lambda mm: mm.group(1) + nav, text, count=1)
    if 'class="rpt-foot"' not in text:
        foot = (f'<div class="rpt-foot"><span>{REPORT_LABEL}</span>'
                f'<span>Built by <b>Blustream Marketing Solutions</b> &nbsp;·&nbsp; '
                f'Commissioned by <b>RSPL Limited</b></span>'
                f'<a href="index.html">← Contents</a></div>\n')
        idx = text.rfind("</body>")
        if idx != -1:
            close_div = text.rfind("</div>", 0, idx)
            insert_at = close_div if close_div != -1 else idx
            text = text[:insert_at] + foot + text[insert_at:]
    return text


def collapse_blank_runs(text: str) -> str:
    """Tidy runs of blank lines left by block removal (cosmetic only)."""
    return re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", text)


def scrub_section(text: str, num: str, toc_title: str, unmatched: list) -> str:
    text = rewrite_title(text, num, toc_title)
    text = replace_kicker(text, num)
    text = clean_h1(text, num)
    # before/after: promote the .cmp.after body, then drop the .two/.mini meta panels
    text = unwrap_cmp_before_after(text)
    text = remove_elements_with_class(
        text, "div", "two",
        keep_if=lambda b: "mini before" not in b and "mini after" not in b,  # spare content .two
    )
    # scaffold block removals (general rules cover every surveyed bespoke block).
    # NOTE: div.rebuild is intentionally NOT removed — in §02 it carries legit
    # data-build provenance; only its internal "(for Nikita)" label is scrubbed
    # (see INLINE_SCRUBS["02"]).
    for cls in ("analysis", "nk", "imgnote", "slot", "flag"):
        text = remove_elements_with_class(text, "div", cls)
    text = remove_elements_with_class(text, "p", "strike")
    text = remove_all_tags(text, "button")
    text = strip_html_comments(text)
    # inline prose scrubs (per-file) + callbox relabel
    text = apply_inline_scrubs(text, num, unmatched)
    # "always-visible" is prototype interactive-UI vocab (an affordance that does
    # not exist in the static export); it recurs in 5 coverage notes and is never
    # a CSS class (verified), so strip the prefix globally in every section.
    text = text.replace("always-visible ", "")
    text = strip_section_xrefs(text)  # drop stale prototype "(§NN)"/"(Section NN)" cross-refs
    text = relabel_callbox(text)
    # v1 chrome (rpt-top/rpt-foot) — kept as the anchor the v2 nav stage replaces.
    # The v1 onerror image-degrade hack is intentionally gone (v2 images exist and
    # are injected by report_media with explicit dimensions).
    text = inject_chrome(text, num)
    text = collapse_blank_runs(text)
    return text


def scrub_cover(text: str) -> str:
    """The cover has no section scaffold, but its .pvnote banner carries internal
    build-status language ("Complete build … wired per the asset inventory …
    composited …"). Keep only the legit data caveat; add graceful image degrade."""
    text = text.replace(
        "<b>Complete build — all 21 sections live.</b> Section illustrations are "
        "wired per the asset inventory; competitor logos are composited from real "
        "brand files (never generated). Data is frozen;",
        "<b>Note on the data.</b> Data is frozen;")
    return text  # v2: the divider image is swapped to a real asset by report_media


# ===========================================================================
#  Verification
# ===========================================================================
# Markers that must be ZERO in output. Word-boundaried / case-aware to avoid
# false positives (e.g. "Locked by no rash", "unlocked", "blocked", "13 blocks").
MARKER_PATTERNS = {
    "LOCKED-badge": re.compile(r"\bLOCKED\b"),        # uppercase badge only
    "Nikita": re.compile(r"Nikita", re.I),
    "Phase 1": re.compile(r"Phase\s*1\b"),
    "mini before/after": re.compile(r"mini (before|after)", re.I),
    "cmp before/after": re.compile(r"cmp (before|after)", re.I),
    "prototype": re.compile(r"prototype", re.I),
    "redesign": re.compile(r"redesign", re.I),
    "density#": re.compile(r"density\s*#", re.I),
    # dead scaffold download buttons only — the v2 nav Contents toggle
    # (<button class="rnav-toc">) is legitimate chrome and allowlisted.
    "download-btn": re.compile(r"<button(?![^>]*\brnav-)", re.I),
    "Balanced model": re.compile(r"Balanced model", re.I),
    "always-visible": re.compile(r"always-visible", re.I),
    "draft verbatim": re.compile(r"draft verbatim", re.I),
    "proto-comment": re.compile(r"/\*[^*]*\b(v1|v2|FIXED|redesign|prototype|Nikita)\b[^*]*\*/"),
}


def scan_markers(text: str) -> dict[str, int]:
    return {name: len(p.findall(text)) for name, p in MARKER_PATTERNS.items()}


def internal_links(text: str) -> list[str]:
    out = []
    for h in re.findall(r'href="([^"]+)"', text):
        if h.startswith(("http://", "https://", "#", "mailto:", "//", "data:")):
            continue
        h = h.split("#")[0]
        if h:
            out.append(h)
    return out


def image_srcs(text: str) -> list[tuple[str, bool]]:
    out = []
    for tag in re.findall(r"<img\b[^>]*>", text, re.I):
        sm = re.search(r'src="([^"]+)"', tag, re.I)
        if sm:
            out.append((sm.group(1)[:40], bool(re.search(r"onerror\s*=", tag, re.I))))
    return out


def local_refs(text: str) -> list[str]:
    """Every local (non-remote, non-data) src/href — images, css, js, html — for
    resolution against the emitted bundle."""
    out = []
    for r in re.findall(r'(?:src|href)="([^"]+)"', text, re.I):
        if r.startswith(("http://", "https://", "//", "#", "mailto:", "data:")):
            continue
        r = r.split("#")[0].split("?")[0]
        if r:
            out.append(r)
    return out


def bs4_residual_scaffold(text: str) -> list[str]:
    """bs4 cross-check: any residual scaffold class / element in the DOM."""
    if not HAVE_BS4:
        return []
    soup = BeautifulSoup(text, "html.parser")
    hits = []
    # NB: .rebuild is intentionally kept (relabeled provenance note in §02), so it
    # is not a residual-scaffold class.
    for cls in ("analysis", "nk", "imgnote", "slot", "flag", "densewall"):
        if soup.select(f".{cls}"):
            hits.append(f".{cls}")
    if soup.select(".cmp.before, .cmp.after, .mini.before, .mini.after"):
        hits.append("before/after panel")
    dead_btns = [b for b in soup.find_all("button")
                 if not any(c.startswith("rnav") for c in (b.get("class") or []))]
    if dead_btns:
        hits.append("<button>")
    return hits


# ===========================================================================
#  v2 orchestration — media / nav / immersion / print stages live in sub-agent
#  modules loaded defensively so this orchestrator still runs the v1 scrub if a
#  module is absent. Each stage is a pure fn(html, ctx) -> html. See CONTRACT.md.
# ===========================================================================
SCRIPT_DIR = Path(__file__).resolve().parent
REPORT_ASSETS = SCRIPT_DIR / "report-assets"
ASSETS_MAP_PATH = SCRIPT_DIR / "assets-map.json"
SHARED_INCLUDES = ("report.css", "report.js", "print.css", "immersion.css", "immersion.js")
HEAD_TAGS = (
    '<link rel="stylesheet" href="report.css"/>'
    '<link rel="stylesheet" href="immersion.css"/>'
    '<link rel="stylesheet" href="print.css" media="print"/>'
    '<script src="report.js" defer></script>'
    '<script src="immersion.js" defer></script>'
)
_STAGE_ORDER = (
    ("report_media", "inject_media"),
    ("report_nav", "inject_chrome"),
    ("report_immersion", "inject_section"),
)
_stage_cache: dict = {}


def _load_stage(modname: str, fnname: str):
    key = (modname, fnname)
    if key in _stage_cache:
        return _stage_cache[key]
    fn = None
    try:
        if str(SCRIPT_DIR) not in sys.path:
            sys.path.insert(0, str(SCRIPT_DIR))
        m = importlib.import_module(modname)
        importlib.reload(m)  # pick up sub-agent edits between runs
        fn = getattr(m, fnname, None)
    except Exception as e:  # module not written yet / import error
        print(f"  (v2 stage {modname}.{fnname} unavailable: {e})", file=sys.stderr)
    _stage_cache[key] = fn
    return fn


def inject_head_includes(text: str) -> str:
    if 'href="report.css"' in text:
        return text
    return text.replace("</head>", HEAD_TAGS + "</head>", 1)


def apply_v2_stages(text: str, ctx: dict, warns: list) -> str:
    for modname, fnname in _STAGE_ORDER:
        fn = _load_stage(modname, fnname)
        if not fn:
            continue
        try:
            out = fn(text, ctx)
            if isinstance(out, str) and out:
                text = out
            else:
                warns.append(f"{modname}.{fnname} returned non-str on {ctx['target']}")
        except Exception as e:
            warns.append(f"{modname}.{fnname} FAILED on {ctx['target']}: {e}")
    return inject_head_includes(text)


def load_assets_map() -> dict:
    if ASSETS_MAP_PATH.exists():
        try:
            return json.loads(ASSETS_MAP_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  WARN: assets-map.json unreadable: {e}", file=sys.stderr)
    return {}


def _sanitize_shared(text: str) -> str:
    """Strip internal multi-agent build authorship from shipped css/js comments so
    the client bundle's view-source carries no "Agent N (ROLE)" process leak.
    Agent source files under report-assets/ are left untouched."""
    text = re.sub(r"\s*—\s*Agent \d+ \([^)]*\)", "", text)   # "report.css — Agent 2 (NAV & FOOTER)" -> "report.css"
    text = re.sub(r"\(Agent \d+'s ", "(", text)               # "(Agent 3's print.html…" -> "(print.html…"
    text = re.sub(r"\bAgent \d+\b", "the report build", text)  # any remaining "Agent N"
    return text


def copy_shared_assets(out: Path) -> int:
    for f in SHARED_INCLUDES:
        p = REPORT_ASSETS / f
        if p.exists():
            (out / f).write_text(_sanitize_shared(p.read_text(encoding="utf-8")), encoding="utf-8")
    src_assets = REPORT_ASSETS / "assets"
    n = 0
    if src_assets.is_dir():
        (out / "assets").mkdir(exist_ok=True)
        for a in sorted(src_assets.iterdir()):
            if a.is_file() and not a.name.startswith("."):
                shutil.copy2(a, out / "assets" / a.name)
                n += 1
    return n


def dir_size_bytes(d: Path) -> int:
    return sum(f.stat().st_size for f in d.rglob("*") if f.is_file())


def section_meta() -> list[dict]:
    return [{"num": num, "target": tgt, "title": toc} for (_s, tgt, num, toc) in SECTIONS]


COVER_META = {"num": "cover", "target": COVER[1], "title": "Contents"}


def build_ctx(num, target, toc_title, is_cover, sec_meta, prev, nxt, assets_map) -> dict:
    return {
        "num": num, "target": target, "toc_title": toc_title, "is_cover": is_cover,
        "sections": sec_meta, "prev": prev, "next": nxt,
        "assets_map": assets_map, "assets_dir": "assets",
    }


# ===========================================================================
#  Driver
# ===========================================================================
def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description="Scrub + rename RSPL Baby Diapers report HTMLs.")
    ap.add_argument("--src", default=os.path.expanduser("~/Downloads/RSPL HTMLs"))
    ap.add_argument("--out", default=str(repo_root / "public" / "reports" / "baby-diapers"))
    args = ap.parse_args()

    src = Path(os.path.expanduser(args.src))
    out = Path(args.out)
    if not src.is_dir():
        print(f"ERROR: source folder not found: {src}", file=sys.stderr)
        return 2
    out.mkdir(parents=True, exist_ok=True)

    assets_map = load_assets_map()
    sec_meta = section_meta()
    warns: list = []
    unmatched_scrubs: list = []
    written: list[tuple[str, str, str]] = []      # (target, title, num)
    emitted_for_print: list[dict] = []

    # cover
    cover_text = scrub_cover((src / COVER[0]).read_text(encoding="utf-8"))
    cover_ctx = build_ctx("cover", COVER[1], REPORT_LABEL, True, sec_meta,
                          None, (sec_meta[0] if sec_meta else None), assets_map)
    cover_final = apply_v2_stages(cover_text, cover_ctx, warns)
    (out / COVER[1]).write_text(cover_final, encoding="utf-8")
    written.append((COVER[1], "Cover", "—"))
    emitted_for_print.append({"num": "cover", "target": COVER[1], "title": "Cover", "html": cover_final})

    # sections
    for i, (src_name, tgt_name, num, toc) in enumerate(SECTIONS):
        p = src / src_name
        if not p.exists():
            print(f"ERROR: missing source: {src_name}", file=sys.stderr)
            return 2
        scrubbed = scrub_section(p.read_text(encoding="utf-8"), num, toc, unmatched_scrubs)
        prev = COVER_META if i == 0 else sec_meta[i - 1]
        nxt = sec_meta[i + 1] if i + 1 < len(sec_meta) else None
        ctx = build_ctx(num, tgt_name, toc, False, sec_meta, prev, nxt, assets_map)
        final = apply_v2_stages(scrubbed, ctx, warns)
        (out / tgt_name).write_text(final, encoding="utf-8")
        tm = re.search(r"<title>(.*?)</title>", final, re.DOTALL)
        written.append((tgt_name, tm.group(1) if tm else "", num))
        emitted_for_print.append({"num": num, "target": tgt_name, "title": toc, "html": final})

    # shared includes (css/js) + optimized assets → bundle
    n_assets = copy_shared_assets(out)

    # print.html (Agent 3 generator)
    ptext = ""
    gen = _load_stage("report_print", "generate_print_html")
    if gen:
        try:
            ph = gen(emitted_for_print, {"sections": sec_meta, "assets_map": assets_map})
            if isinstance(ph, str) and ph:
                (out / "print.html").write_text(ph, encoding="utf-8")
                ptext = ph
            else:
                warns.append("generate_print_html returned empty")
        except Exception as e:
            warns.append(f"generate_print_html FAILED: {e}")

    # ---- verification -----------------------------------------------------
    existing = {p.name for p in out.glob("*.html")}
    total_markers = total_broken = total_unresolved = total_bs4 = 0

    print("\n" + "=" * 112)
    print(f"VERIFICATION — {out}")
    print("=" * 112)
    print(f"{'file':38} {'mark':5} {'html':5} {'refs':5} {'bs4':4} title")
    print("-" * 112)
    for tgt_name, title, num in written:
        text = (out / tgt_name).read_text(encoding="utf-8")
        markers = scan_markers(text)
        body_nt = re.sub(r"<title>.*?</title>", "", text, flags=re.DOTALL)
        markers["section-xref"] = len(re.findall(r"§\d+", body_nt)) + len(re.findall(r"\(Section \d+\)", body_nt))
        mcount = sum(markers.values())
        broken = [h for h in internal_links(text) if h.endswith(".html") and h not in existing]
        unresolved = [r for r in local_refs(text) if not (out / r).exists()]
        bs4hits = bs4_residual_scaffold(text)
        total_markers += mcount; total_broken += len(broken)
        total_unresolved += len(unresolved); total_bs4 += len(bs4hits)
        flag = "" if (mcount == 0 and not broken and not unresolved and not bs4hits) else "  <-- CHECK"
        print(f"{tgt_name:38} {mcount:<5} {len(broken):<5} {len(unresolved):<5} {len(bs4hits):<4} {title[:34]}{flag}")
        if mcount:
            print(f"{'':38} markers: { {k: v for k, v in markers.items() if v} }")
        if broken:
            print(f"{'':38} broken-html: {broken}")
        if unresolved:
            print(f"{'':38} unresolved-ref: {sorted(set(unresolved))[:8]}")
        if bs4hits:
            print(f"{'':38} bs4-residual: {bs4hits}")

    cover_links = set(h for h in internal_links(cover_final) if h.endswith(".html"))
    expected_targets = {tgt for (_s, tgt, _n, _t) in SECTIONS}
    toc_missing = sorted(expected_targets - cover_links)

    assets_dir = out / "assets"
    assets_mb = dir_size_bytes(assets_dir) / (1024 * 1024) if assets_dir.is_dir() else 0.0
    css_js_ok = sum(1 for f in SHARED_INCLUDES if (out / f).exists())
    print_h1 = ptext.count("<h1") if ptext else 0

    print("-" * 112)
    if warns:
        print("STAGE WARNINGS (must be 0):")
        for w in warns:
            print(f"   ⚠ {w}")
    if unmatched_scrubs:
        print("UNMATCHED INLINE SCRUBS:")
        for num, frag in unmatched_scrubs:
            print(f"   §{num}: {frag}…")

    print("-" * 112)
    print(f"files written          : {len(written)} html (1 cover + {len(SECTIONS)} sections)"
          f" + {'print.html' if ptext else 'NO print.html ❌'}")
    print(f"shared bundle assets   : {n_assets} in assets/  ·  {css_js_ok}/{len(SHARED_INCLUDES)} css/js present")
    print(f"total scaffold markers : {total_markers}  (must be 0)")
    print(f"broken html links      : {total_broken}  (must be 0)")
    print(f"unresolved img/css/js  : {total_unresolved}  (must be 0)")
    print(f"bs4 residual scaffold  : {total_bs4}  (must be 0)")
    print(f"cover → all 21 sections: {'yes' if not toc_missing else 'MISSING ' + str(toc_missing)}")
    print(f"assets/ size           : {assets_mb:.2f} MB  (must be ≤ 8.0)")
    print(f"print.html h1 blocks   : {print_h1}  (expect ≥ {TOTAL_SECTIONS})")
    print(f"stage warnings         : {len(warns)}  (must be 0)")
    ok = (total_markers == 0 and total_broken == 0 and total_unresolved == 0 and total_bs4 == 0
          and not toc_missing and not unmatched_scrubs and not warns
          and assets_mb <= 8.0 and bool(ptext) and print_h1 >= TOTAL_SECTIONS)
    print(f"RESULT                 : {'PASS ✅' if ok else 'FAIL ❌'}")
    print("=" * 112)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
