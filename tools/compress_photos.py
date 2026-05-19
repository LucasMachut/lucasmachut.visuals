"""Compress photos for the web.

Reads JPG/JPEG files from Site/Projets/<sub>/ and writes optimized versions
to Site/Projets-web/<sub>/ — same filenames, but resized to MAX_DIM and
re-encoded at QUALITY. Originals are never touched.

Skips files that already exist in the output (so re-runs only process new
photos). Pass --force to re-encode everything.

Usage (from anywhere):
    python tools/compress_photos.py
    python tools/compress_photos.py --force
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from PIL import Image, ImageOps

MAX_DIM = 2400          # longest edge in pixels
QUALITY = 83            # JPEG quality (0-100)
EXTENSIONS = {".jpg", ".jpeg"}

SITE_DIR = Path(__file__).resolve().parent.parent
SRC_ROOT = SITE_DIR / "Projets"
DST_ROOT = SITE_DIR / "Projets-web"


def human_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def compress_one(src: Path, dst: Path) -> tuple[int, int]:
    """Compress one image. Returns (src_size, dst_size) in bytes."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        # Apply EXIF rotation, then strip metadata on save.
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
        im.save(
            dst,
            format="JPEG",
            quality=QUALITY,
            optimize=True,
            progressive=True,
        )
    return src.stat().st_size, dst.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="re-encode even if destination already exists")
    args = parser.parse_args()

    if not SRC_ROOT.is_dir():
        print(f"[error] source folder not found: {SRC_ROOT}", file=sys.stderr)
        return 1

    photos: list[tuple[Path, Path]] = []
    for src in SRC_ROOT.rglob("*"):
        if src.is_file() and src.suffix.lower() in EXTENSIONS:
            rel = src.relative_to(SRC_ROOT)
            dst = DST_ROOT / rel
            photos.append((src, dst))

    if not photos:
        print(f"No photos found under {SRC_ROOT}")
        return 0

    total = len(photos)
    skipped = 0
    processed = 0
    src_total = 0
    dst_total = 0

    print(f"Found {total} photos. MAX_DIM={MAX_DIM}px, QUALITY={QUALITY}")
    print(f"Source: {SRC_ROOT}")
    print(f"Output: {DST_ROOT}")
    print()

    start = time.time()
    for i, (src, dst) in enumerate(photos, 1):
        if dst.exists() and not args.force:
            skipped += 1
            continue
        try:
            s, d = compress_one(src, dst)
        except Exception as exc:  # noqa: BLE001
            print(f"[{i:>3}/{total}] FAIL {src.name}: {exc}")
            continue
        src_total += s
        dst_total += d
        processed += 1
        ratio = (1 - d / s) * 100 if s else 0
        print(f"[{i:>3}/{total}] {src.parent.name}/{src.name}  "
              f"{human_bytes(s)} -> {human_bytes(d)}  (-{ratio:.0f}%)")

    elapsed = time.time() - start
    print()
    print(f"Done in {elapsed:.1f}s. Processed {processed}, skipped {skipped}.")
    if processed:
        savings = (1 - dst_total / src_total) * 100 if src_total else 0
        print(f"Total: {human_bytes(src_total)} -> {human_bytes(dst_total)}  "
              f"(-{savings:.0f}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
