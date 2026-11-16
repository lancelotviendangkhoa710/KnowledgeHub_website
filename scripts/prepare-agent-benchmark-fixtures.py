#!/usr/bin/env python3
"""Create synthetic PDF CVs and a diverse benchmark manifest outside the repo."""

import json
import os
import tempfile
from pathlib import Path


TOPICS = [
    "Python foundations", "SQL joins and indexes", "Laravel REST APIs",
    "React component basics", "Docker fundamentals", "PostgreSQL transactions",
    "TypeScript types", "Web accessibility", "Git collaboration",
    "HTTP and networking", "FastAPI basics", "Data structures",
    "Linux command line", "Software testing", "Security fundamentals",
    "System design basics", "CSS layout", "JavaScript async programming",
    "API authentication", "Cloud deployment basics",
]
ROLES = ["Backend Developer", "Data Analyst", "Frontend Developer",
         "QA Engineer", "DevOps Engineer"]
CV_TEXTS = [
    "Synthetic candidate A. Python and REST API projects. Built two sample services.",
    "Synthetic candidate B. SQL queries and dashboard examples. Practiced data analysis.",
    "Synthetic candidate C. React and TypeScript projects. Built accessible pages.",
    "Synthetic candidate D. Wrote automated tests and bug reports for sample apps.",
    "Synthetic candidate E. Docker and Linux practice with local deployments.",
]


def make_pdf(text):
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET".encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, body in enumerate(objects, 1):
        offsets.append(len(output))
        output += f"{index} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(output)
    output += f"xref\n0 {len(offsets)}\n".encode()
    output += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        output += f"{offset:010d} 00000 n \n".encode()
    output += (f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
               f"startxref\n{xref}\n%%EOF\n").encode()
    return bytes(output)


def main():
    folder = Path(tempfile.mkdtemp(prefix="knowledgehub-agent-benchmark-"))
    try:
        os.chmod(folder, 0o700)
    except OSError:
        pass
    pdfs = []
    for index, text in enumerate(CV_TEXTS, 1):
        path = folder / f"synthetic-cv-{index}.pdf"
        path.write_bytes(make_pdf(text))
        pdfs.append(path)
    cases = [
        {"topic": topic, "target_role": ROLES[index % len(ROLES)],
         "cv_pdf": str(pdfs[index % len(pdfs)])}
        for index, topic in enumerate(TOPICS)
    ]
    manifest = folder / "cases.json"
    manifest.write_text(json.dumps(cases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"fixture_directory={folder}")
    print("synthetic_pdfs=5 cases=20 topics=20")


if __name__ == "__main__":
    main()
