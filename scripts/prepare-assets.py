#!/usr/bin/env python3
"""
prepare-assets.py — RSPL Baby-Diapers report v2, Agent 1 (ASSETS).

Converts the supplied source PNGs into optimized WebP derivatives under
scripts/report-assets/assets/ using Pillow only (no cwebp/ImageMagick).

Rules (per CONTRACT.md "Optimization budget"):
  * A-series (A01..A16)  -> WebP q80, max 1600w (keep aspect, never upscale)
  * B-series (B01..B07)  -> WebP, longest side <= 640px (alpha preserved)
  * C-series (C01..C09)  -> WebP, longest side <= 640px (alpha preserved)
  * P-series (P01..P05)  -> WebP q80, 900w (never upscale)
  * Logos (7 real files) -> WebP LOSSLESS, alpha preserved (RGBA)
  * assets/ total must be <= 8MB. If over, step A-series quality
    80 -> 72 -> 65 until under budget, and report it.

Idempotent / re-runnable: outputs are overwritten each run.
Missing logos (superbottoms/himalaya/bumtum/babyhug/supples) are skipped silently.
Prints a size table (filename, dimensions, KB) + total at the end.
"""

import os
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required (pip install Pillow).")

# ----------------------------------------------------------------------------
# Paths
# ----------------------------------------------------------------------------
SRC_DIR = "/Users/mbpro16/Downloads/Images for Report"
_HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(_HERE, "report-assets", "assets")

BUDGET_BYTES = 8 * 1024 * 1024  # 8 MB

# A-series quality ladder used only if we blow the byte budget.
A_QUALITY_LADDER = [80, 72, 65]

# ----------------------------------------------------------------------------
# Job definitions
# ----------------------------------------------------------------------------
A_CODES = [f"A{i:02d}" for i in range(1, 17)]   # A01..A16
B_CODES = [f"B{i:02d}" for i in range(1, 8)]    # B01..B07
C_CODES = [f"C{i:02d}" for i in range(1, 10)]   # C01..C09
P_CODES = [f"P{i:02d}" for i in range(1, 6)]    # P01..P05

# Real logos: source stem (lowercase .png) -> output stem (.webp). Same names.
LOGO_STEMS = [
    "pampers", "huggies", "mamypoko", "little-angels",
    "lovingle", "rspl", "blustream",
]


def _fit_within(size, max_w=None, max_dim=None):
    """Return a target (w, h) that fits the constraint, never upscaling."""
    w, h = size
    scale = 1.0
    if max_w is not None and w > max_w:
        scale = min(scale, max_w / w)
    if max_dim is not None:
        longest = max(w, h)
        if longest > max_dim:
            scale = min(scale, max_dim / longest)
    if scale >= 1.0:
        return w, h  # never upscale
    return max(1, round(w * scale)), max(1, round(h * scale))


def _load(src_path):
    im = Image.open(src_path)
    im.load()
    return im


def _save_photo(src_path, out_path, max_w=None, max_dim=None, quality=80):
    """Lossy WebP for photographic/illustration assets. Alpha preserved."""
    im = _load(src_path)
    target = _fit_within(im.size, max_w=max_w, max_dim=max_dim)
    if target != im.size:
        im = im.resize(target, Image.LANCZOS)
    # Preserve alpha where present; flatten palette to a real mode.
    if im.mode == "P":
        im = im.convert("RGBA" if "transparency" in im.info else "RGB")
    elif im.mode not in ("RGB", "RGBA", "L"):
        im = im.convert("RGBA")
    im.save(out_path, "WEBP", quality=quality, method=6)
    return im.size


def _save_logo(src_path, out_path):
    """Lossless WebP for logos, RGBA (alpha preserved), no resize."""
    im = _load(src_path)
    if im.mode != "RGBA":
        im = im.convert("RGBA")  # palette/RGB -> RGBA so alpha survives
    im.save(out_path, "WEBP", lossless=True, method=6)
    return im.size


def _kb(path):
    return os.path.getsize(path) / 1024.0


def _encode_a_series(quality, results):
    """(Re)encode every A-series file at the given quality. Updates results."""
    for code in A_CODES:
        src = os.path.join(SRC_DIR, f"{code}.png")
        if not os.path.isfile(src):
            print(f"  ! missing source {code}.png — skipped", file=sys.stderr)
            continue
        out = os.path.join(OUT_DIR, f"{code}.webp")
        dims = _save_photo(src, out, max_w=1600, quality=quality)
        results[f"{code}.webp"] = (dims, _kb(out))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # filename -> ((w, h), kb)
    results = {}

    # --- A-series (photographic heroes) : start at top of quality ladder ----
    a_quality = A_QUALITY_LADDER[0]
    _encode_a_series(a_quality, results)

    # --- B & C series (icons, <=640px longest side, alpha) ------------------
    for code in B_CODES + C_CODES:
        src = os.path.join(SRC_DIR, f"{code}.png")
        if not os.path.isfile(src):
            print(f"  ! missing source {code}.png — skipped", file=sys.stderr)
            continue
        out = os.path.join(OUT_DIR, f"{code}.webp")
        dims = _save_photo(src, out, max_dim=640, quality=80)
        results[f"{code}.webp"] = (dims, _kb(out))

    # --- P-series (persona portraits, q80, 900w) ----------------------------
    for code in P_CODES:
        src = os.path.join(SRC_DIR, f"{code}.png")
        if not os.path.isfile(src):
            print(f"  ! missing source {code}.png — skipped", file=sys.stderr)
            continue
        out = os.path.join(OUT_DIR, f"{code}.webp")
        dims = _save_photo(src, out, max_w=900, quality=80)
        results[f"{code}.webp"] = (dims, _kb(out))

    # --- Logos (lossless, RGBA). Skip the 5 unsupplied brands silently. -----
    for stem in LOGO_STEMS:
        src = os.path.join(SRC_DIR, f"{stem}.png")
        if not os.path.isfile(src):
            continue  # silently skip missing logos
        out = os.path.join(OUT_DIR, f"{stem}.webp")
        dims = _save_logo(src, out)
        results[f"{stem}.webp"] = (dims, _kb(out))

    # --- Enforce 8MB budget by stepping A-series quality down ---------------
    def total_bytes():
        return sum(
            os.path.getsize(os.path.join(OUT_DIR, f))
            for f in os.listdir(OUT_DIR)
            if f.lower().endswith(".webp")
        )

    budget_notes = []
    ladder_idx = 0
    while total_bytes() > BUDGET_BYTES and ladder_idx < len(A_QUALITY_LADDER) - 1:
        ladder_idx += 1
        a_quality = A_QUALITY_LADDER[ladder_idx]
        budget_notes.append(
            f"over 8MB — re-encoded A-series at q{a_quality}"
        )
        _encode_a_series(a_quality, results)

    total = total_bytes()

    # --- Size table ---------------------------------------------------------
    print("\n=== RSPL Baby-Diapers — optimized assets ===")
    print(f"output: {OUT_DIR}")
    print(f"A-series quality: q{a_quality}\n")
    print(f"{'filename':<20} {'dimensions':>12} {'size':>10}")
    print("-" * 46)

    def sort_key(name):
        # group A, B, C, P, logos; numeric within group
        stem = name.rsplit(".", 1)[0]
        series = stem[0] if stem[:1] in "ABCP" and stem[1:].isdigit() else "Z"
        return (series, name)

    for name in sorted(results, key=sort_key):
        (w, h), kb = results[name]
        print(f"{name:<20} {f'{w}x{h}':>12} {f'{kb:.1f} KB':>10}")

    print("-" * 46)
    print(f"{'TOTAL':<20} {len(results):>9} files {f'{total/1024:.1f} KB':>10}")
    print(f"{'':<20} {'':>9}       {f'{total/1024/1024:.2f} MB':>10}")
    print(f"\nbudget: {total/1024/1024:.2f} MB / 8.00 MB  "
          f"({'OK — under' if total <= BUDGET_BYTES else 'OVER'} budget)")
    for note in budget_notes:
        print(f"  note: {note}")
    if total > BUDGET_BYTES:
        print("  WARNING: still over budget after lowest A-series quality.")


if __name__ == "__main__":
    main()
