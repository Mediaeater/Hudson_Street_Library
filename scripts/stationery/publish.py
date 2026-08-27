#!/usr/bin/env python3
"""
Stage 5 of the stationery artwork pipeline: publish the artwork to the website.

The printer is given a URL, not an email attachment, so the six PDFs are copied out
of the gitignored build output into src/assets/stationery/, where Eleventy passes
them through to /assets/stationery/. A zip of all six sits alongside them for
whoever would rather take the lot in one go.

Everything written here is deterministic — the same artwork produces the same bytes,
including inside the zip, whose entries are dated from the source page rather than
from the clock. That is the point: these are 2.7 MB binaries living in git, and a
rebuild must not put a fresh copy of each into history when nothing has moved.

The manifest goes to src/_data/stationery.json so the download list on the page is
generated from the files that actually exist, with real sizes. Hand-typed file sizes
go stale the first time the artwork is rebuilt.

Run:  python publish.py --dist dist/stationery --to src/assets/stationery --date <iso>
"""
import argparse, datetime, json, os, shutil, zipfile

from build_artwork import DELIVERABLES, ARTWORK_DATE

ZIP_NAME = "hudson-street-library-stationery.zip"
MANIFEST = "src/_data/stationery.json"


def human(n):
    """Size as a printer would read it off a link, not as a computer would."""
    mb = n / 1_000_000
    return f"{mb:.1f} MB" if mb >= 1 else f"{n / 1000:.0f} kB"


def write_if_changed(path, data):
    """Only touch the file when its content differs, so git sees nothing to commit."""
    if os.path.exists(path) and open(path, "rb").read() == data:
        return False
    with open(path, "wb") as f:
        f.write(data)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", default="dist/stationery")
    ap.add_argument("--to", default="src/assets/stationery")
    ap.add_argument("--date", default=ARTWORK_DATE, help="ISO 8601; dates the zip entries")
    ap.add_argument("--manifest", default=MANIFEST)
    a = ap.parse_args()

    stamp = datetime.datetime.fromisoformat(a.date)
    os.makedirs(a.to, exist_ok=True)
    was = json.load(open(a.manifest)) if os.path.exists(a.manifest) else {}

    entries, changed, artwork_changed = [], 0, False
    for key, title, pieces in DELIVERABLES:
        name = key + ".pdf"
        src = os.path.join(a.dist, name)
        if not os.path.exists(src):
            raise SystemExit(f"! {src} missing — run the artwork stage first")
        blob = open(src, "rb").read()
        if write_if_changed(os.path.join(a.to, name), blob):
            changed += 1
            artwork_changed = True
        # the PDF's own dc:title stays ASCII; the page is typeset properly
        entries.append({"file": name, "title": title.replace(" x ", " \u00d7 "),
                        "pages": len(pieces),
                        "bytes": len(blob), "size": human(len(blob))})

    # A zip written the ordinary way carries the moment it was written in every
    # entry header, which would make it a new 16 MB object on every build.
    import io
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for e in entries:
            info = zipfile.ZipInfo(e["file"], date_time=stamp.timetuple()[:6])
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, open(os.path.join(a.dist, e["file"]), "rb").read())
    zip_blob = buf.getvalue()
    if write_if_changed(os.path.join(a.to, ZIP_NAME), zip_blob):
        changed += 1

    manifest = json.dumps({
        "generated": a.date,
        "dated": f"{stamp.day} {stamp:%B %Y}",
        "base": "/assets/stationery/",
        "zip": {"file": ZIP_NAME, "size": human(len(zip_blob)), "bytes": len(zip_blob)},
        "files": entries,
    }, indent=1).encode() + b"\n"
    if write_if_changed(a.manifest, manifest):
        changed += 1

    for e in entries:
        print(f"  {e['file']:26} {e['pages']} page(s)  {e['size']:>8}")
    print(f"  {ZIP_NAME:26} {len(entries)} files   {human(len(zip_blob)):>8}")
    print(f"  dated {a.date} — {changed or 'no'} file(s) changed")

    # The date is pinned by hand precisely so a rebuild is a no-op. The cost of that
    # is that it can be left behind: if the drawn artwork moved and the date did not,
    # the files now claim a date older than the design they carry.
    if artwork_changed and was.get("generated") == a.date:
        print(f"  ! the artwork changed but ARTWORK_DATE is still {a.date} —"
              f" bump it in build_artwork.py and rebuild")


if __name__ == "__main__":
    main()
