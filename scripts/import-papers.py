"""Populate same-site copies from the reviewed edition and checksum manifest."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = ROOT / "documents"
INDEX = ROOT / "hosted.js"
PREFIX = "const hostedDocuments = "


def import_paper(record):
    destination = (ROOT / record["path"]).resolve()
    if not destination.is_relative_to(DOCUMENTS) or destination.suffix != ".pdf":
        raise ValueError("Invalid document destination")
    digest = record["sha256"]
    if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() == digest:
        return record
    for source in record["sources"]:
        for attempt in range(2):
            try:
                request = urllib.request.Request(source, headers={"User-Agent": "IrishSchoolMaths-PaperArchive/1.0"})
                with urllib.request.urlopen(request, timeout=15) as response:
                    data = response.read(35 * 1024 * 1024)
                if b"%PDF-" not in data[:1024] or hashlib.sha256(data).hexdigest() != digest:
                    break
                destination.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as tmp:
                    tmp.write(data)
                os.replace(tmp.name, destination)
                return record
            except (OSError, ValueError):
                if not attempt:
                    time.sleep(0.3)
    return None


def main():
    records = json.loads((ROOT / "data/import-papers.json").read_text())
    hosted = json.loads(INDEX.read_text().strip().removeprefix(PREFIX).removesuffix(";"))
    verified = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for record, result in zip(records, pool.map(import_paper, records)):
            if result is None:
                print("Copy pending:", record["path"], flush=True)
                continue
            hosted.update(dict.fromkeys(record["aliases"], record["path"]))
            verified += 1
            if verified % 100 == 0:
                print("Verified", verified, "PDFs", flush=True)
    INDEX.write_text(PREFIX + json.dumps(hosted, separators=(",", ":"), sort_keys=True) + ";\n")
    print("Verified", verified, "of", len(records))
    return 0 if verified or not records else 1


if __name__ == "__main__":
    sys.exit(main())
