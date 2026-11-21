#!/usr/bin/env python3
"""Run bounded, end-to-end agent benchmarks against isolated local Compose.

Dry run is the default. This script never prints tokens, CV contents, prompts,
response bodies, account identifiers, or generated course identifiers.
"""

import argparse
import csv
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def safe_trace(value, fallback):
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError, AttributeError):
        return fallback


def request(base, path, token, data, pdf=None):
    request_id = str(uuid.uuid4())
    headers = {"Authorization": "Bearer " + token, "Accept": "application/json",
               "X-Request-ID": request_id}
    if pdf is None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        boundary = "kh-benchmark-" + uuid.uuid4().hex
        chunks = []
        for key, value in data.items():
            chunks.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
            )
        chunks.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"cv_file\"; "
            'filename="benchmark.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()
            + pdf + b"\r\n"
        )
        chunks.append(f"--{boundary}--\r\n".encode())
        body = b"".join(chunks)
        headers["Content-Type"] = "multipart/form-data; boundary=" + boundary
    call = urllib.request.Request(base + path, data=body, headers=headers, method="POST")
    started = time.perf_counter()
    try:
        with urllib.request.build_opener(NoRedirect).open(call, timeout=110) as response:
            raw = response.read(1_000_000)
            status = response.status
            trace_id = safe_trace(response.headers.get("X-Request-ID"), request_id)
    except urllib.error.HTTPError as exc:
        raw = exc.read(1_000_000)
        status = exc.code
        trace_id = safe_trace(exc.headers.get("X-Request-ID"), request_id)
    except (urllib.error.URLError, TimeoutError):
        return 0, None, (time.perf_counter() - started) * 1000, request_id
    elapsed = (time.perf_counter() - started) * 1000
    try:
        decoded = json.loads(raw)
    except (ValueError, UnicodeError):
        decoded = None
    return status, decoded, elapsed, trace_id


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    return round(ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower), 1)


def summarize(attempts):
    timings = [item["duration_ms"] for item in attempts if item["ok"]]
    return {
        "attempts": len(attempts),
        "successes": len(timings),
        "errors": len(attempts) - len(timings),
        "p50_ms": percentile(timings, 0.5),
        "p95_ms": percentile(timings, 0.95),
        "statuses": sorted({item["status"] for item in attempts}),
        "model_input_tokens": None,
        "model_output_tokens": None,
        "youtube_quota_units": None,
        "provider_cost": None,
        "samples": [{"status": item["status"], "ok": item["ok"],
                     "duration_ms": round(item["duration_ms"], 1),
                     "request_ids": item["request_ids"]} for item in attempts],
    }


def load_cases(path, iterations, parser):
    try:
        cases = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        parser.error("Cases manifest must be readable JSON")
    if not isinstance(cases, list) or len(cases) != iterations:
        parser.error("Cases manifest must contain exactly --iterations entries")
    topics, pdf_paths = set(), set()
    for case in cases:
        if not isinstance(case, dict) or set(case) != {"topic", "target_role", "cv_pdf"}:
            parser.error("Each case requires topic, target_role and cv_pdf only")
        topic, role, pdf_path = case["topic"], case["target_role"], case["cv_pdf"]
        if not isinstance(topic, str) or not 3 <= len(topic.strip()) <= 200:
            parser.error("Each topic must contain 3-200 characters")
        if not isinstance(role, str) or not 1 <= len(role.strip()) <= 120:
            parser.error("Each target_role must contain 1-120 characters")
        if not isinstance(pdf_path, str):
            parser.error("Each cv_pdf must be a path")
        try:
            pdf = Path(pdf_path).read_bytes()
        except OSError:
            parser.error("A synthetic test PDF cannot be read")
        if not pdf.startswith(b"%PDF") or not 0 < len(pdf) <= 2 * 1024 * 1024:
            parser.error("Each synthetic test PDF must be a nonempty PDF of at most 2 MiB")
        case["pdf_bytes"] = pdf
        topics.add(topic.strip())
        pdf_paths.add(str(Path(pdf_path).resolve()))
    required_diversity = min(5, iterations)
    if len(topics) < required_diversity or len(pdf_paths) < required_diversity:
        parser.error(f"At least {required_diversity} distinct topics and synthetic CV PDFs are required")
    return cases


def join_telemetry(report, csv_path, parser):
    if not isinstance(report, dict):
        parser.error("Prior report must be a JSON object")
    workflows = report.get("workflows")
    if (report.get("environment") != "isolated_local_compose" or not isinstance(workflows, dict)
            or set(workflows) != {"course", "admin", "cv"}):
        parser.error("Prior report lacks required workflow evidence")
    for workflow in workflows.values():
        if (not isinstance(workflow, dict) or workflow.get("attempts", 0) < 1
                or not isinstance(workflow.get("samples"), list)
                or len(workflow["samples"]) != workflow["attempts"]
                or workflow.get("successes", 0) + workflow.get("errors", 0) != workflow["attempts"]):
            parser.error("Prior report attempts or samples are invalid")
    # A pilot report is joinable; only the gate requires 20 attempts per workflow.
    required_diversity = min(5, min(workflow["attempts"] for workflow in workflows.values()))
    if (report.get("case_topics_distinct", 0) < required_diversity
            or report.get("case_pdfs_distinct", 0) < required_diversity):
        parser.error("Prior report lacks required case diversity evidence")
    metrics = {}
    try:
        with Path(csv_path).open(newline="", encoding="utf-8") as source:
            reader = csv.DictReader(source)
            needed = {"request_id", "input_tokens", "output_tokens", "youtube_quota_units", "provider_cost"}
            if not needed.issubset(reader.fieldnames or []):
                parser.error("Telemetry CSV lacks required columns")
            for row in reader:
                request_id = str(uuid.UUID(row["request_id"]))
                if request_id in metrics:
                    parser.error("Telemetry CSV has duplicate request IDs")
                metrics[request_id] = {
                    "model_input_tokens": int(row["input_tokens"]),
                    "model_output_tokens": int(row["output_tokens"]),
                    "youtube_quota_units": int(row["youtube_quota_units"]),
                    "provider_cost": float(row["provider_cost"]),
                }
                if any(not math.isfinite(value) or value < 0 for value in metrics[request_id].values()):
                    parser.error("Telemetry values cannot be negative")
    except (OSError, ValueError, TypeError):
        parser.error("Telemetry CSV is unreadable or contains invalid metrics")
    for workflow in report["workflows"].values():
        matched = []
        complete = True
        for sample in workflow["samples"]:
            found = [metrics.get(request_id) for request_id in sample["request_ids"]]
            if not found or any(value is None for value in found):
                complete = False
                continue
            matched.extend(found)
        workflow["telemetry_complete"] = complete and bool(matched)
        if workflow["telemetry_complete"]:
            for field in ("model_input_tokens", "model_output_tokens", "youtube_quota_units", "provider_cost"):
                workflow[field] = sum(item[field] for item in matched)
    return report


def benchmark_gate(report, quality_reviewed):
    if not quality_reviewed:
        return False
    # The gate alone enforces the full run: a smoke or pilot report keeps its
    # report and telemetry, but stays below 20 attempts and cannot pass.
    return all(
        value.get("attempts", 0) >= 20 and value.get("errors") == 0 and value.get("telemetry_complete")
        for value in report["workflows"].values()
    )


def reserve_output(output, parser):
    destination = Path(output)
    if destination.suffix.lower() != ".json":
        parser.error("Output filename must end in .json")
    if destination.exists():
        parser.error("Output file already exists; refusing overwrite")
    return destination


def write_report(report, output, parser):
    destination = Path(output)
    if destination.suffix.lower() != ".json":
        parser.error("Output filename must end in .json")
    try:
        with destination.open("x", encoding="utf-8") as target:
            target.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    except FileExistsError:
        parser.error("Output file already exists; refusing overwrite")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Allow isolated local writes and provider calls")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--interval-seconds", type=float, default=21,
                        help="Minimum pause between rounds; every agent route has its own 3/minute limiter")
    parser.add_argument("--output", default="agent-benchmark-results.json")
    parser.add_argument("--cases-file", help="JSON manifest of representative synthetic cases")
    parser.add_argument("--credentials-file", help="Ignored private fixture credentials JSON")
    parser.add_argument("--telemetry", help="Safe metrics CSV keyed by X-Request-ID")
    parser.add_argument("--join-report", help="Join telemetry to a prior report without HTTP calls")
    parser.add_argument("--quality-reviewed", action="store_true",
                        help="Operator completed manual quality and security review")
    parser.add_argument("--smoke", action="store_true",
                        help="Send one course request to verify the isolated stack; not a benchmark")
    parser.add_argument("--topic", help="Exact topic for --smoke")
    parser.add_argument("--pilot", action="store_true",
                        help="Allow 4-19 attempts for a pilot run; the benchmark gate cannot pass")
    args = parser.parse_args()
    if args.smoke:
        if not args.execute:
            parser.error("--smoke requires --execute")
        if not args.topic or not 3 <= len(args.topic.strip()) <= 200:
            parser.error("--smoke requires --topic of 3-200 characters")
        args.iterations = 1
    if args.pilot and not args.smoke and not 4 <= args.iterations < 20:
        parser.error("--pilot requires --iterations between 4 and 19")
    if args.iterations < 20 and not (args.smoke or args.pilot):
        parser.error("At least 20 attempts per workflow are required")
    if args.interval_seconds < 21 and not args.smoke:
        parser.error("At least 21 seconds between rounds are required by the 3/minute preview throttle")
    if args.join_report:
        if args.execute or not args.telemetry:
            parser.error("--join-report requires --telemetry and cannot combine with --execute")
        try:
            report = json.loads(Path(args.join_report).read_text(encoding="utf-8"))
            report = join_telemetry(report, args.telemetry, parser)
            report["benchmark_gate_pass"] = benchmark_gate(report, args.quality_reviewed)
        except (OSError, ValueError, KeyError, TypeError):
            parser.error("Existing report is invalid")
        write_report(report, args.output, parser)
        return 0 if report["benchmark_gate_pass"] else 1
    if not args.execute:
        print("DRY RUN: 20+ course publishes, Admin status approvals, and CV confirmations on isolated local Compose.")
        print("Set KH_BENCHMARK_ISOLATED_DB=1 and required test credentials, then pass --execute.")
        return 0

    base = os.getenv("KH_BENCHMARK_BASE_URL", "").rstrip("/")
    parsed = urllib.parse.urlparse(base)
    if not args.credentials_file:
        parser.error("--credentials-file is required for live execution")
    private = (Path(__file__).resolve().parents[1] / "backend/storage/app/private").resolve()
    credentials_path = Path(args.credentials_file).resolve()
    if credentials_path.parent != private or not credentials_path.name.startswith("agent-benchmark-credentials-"):
        parser.error("Credentials file must be an ignored benchmark file in backend/storage/app/private")
    try:
        credentials = json.loads(credentials_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        parser.error("Private fixture credentials file is unavailable")
    if not isinstance(credentials, dict):
        parser.error("Private fixture credentials file is invalid")
    required = {
        "KH_CONTRIBUTOR_TOKEN": credentials.get("contributor_token"),
        "KH_ADMIN_TOKEN": credentials.get("admin_token"),
        "KH_USER_TOKEN": credentials.get("user_token"),
        "KH_TEST_TARGET_USER_ID": credentials.get("target_user_id"),
    }
    if (os.getenv("KH_BENCHMARK_ISOLATED_DB") != "1"
            or parsed.scheme != "http" or parsed.hostname != "127.0.0.1"
            or parsed.port != 8080 or parsed.path or parsed.query or parsed.fragment
            or any(not value for value in required.values())):
        parser.error("Local Compose URL http://127.0.0.1:8080, isolation flag and test credentials are required")
    # Never trust an operator flag alone: inspect the running app container and
    # refuse requests if it may point at shared/cloud data or a cached config.
    try:
        proof = subprocess.run(
            ["docker", "compose", "exec", "-T", "app", "sh", "-lc",
             'test "$DB_CONNECTION" = pgsql && test "$DB_HOST" = test-db && '
             'test "$DB_DATABASE" = knowledgehub_test && test -z "$DB_URL" && '
             'test "$CV_STORAGE_DRIVER" = local && '
             'test ! -f bootstrap/cache/config.php'],
            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        parser.error("Could not verify isolated app connection; no requests sent")
    if proof.returncode != 0:
        parser.error("Running app is not proven to use isolated test-db; no requests sent")
    try:
        published = subprocess.run(
            ["docker", "compose", "port", "nginx", "80"],
            cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired):
        parser.error("Could not verify Compose nginx port ownership; no requests sent")
    if published.returncode != 0 or published.stdout.strip() != "127.0.0.1:8080":
        parser.error("Compose nginx is not proven to bind only 127.0.0.1:8080; no requests sent")
    if args.smoke:
        status, payload, elapsed, trace_id = request(
            base, "/api/ai/agents/courses", required["KH_CONTRIBUTOR_TOKEN"],
            {"topic": args.topic.strip(), "max_videos": 20},
        )
        data = payload.get("data") if isinstance(payload, dict) else None
        ok = status == 201 and isinstance(data, dict) and data.get("status") == "published"
        print(json.dumps({"smoke": "pass" if ok else "fail", "status": status,
                          "duration_ms": round(elapsed, 1), "request_id": trace_id}))
        return 0 if ok else 1
    if credentials.get("target_initial_status") not in {"active", "inactive"}:
        parser.error("Fixture target status must be active or inactive")
    if not args.cases_file:
        parser.error("--cases-file is required for live execution")
    cases = load_cases(args.cases_file, args.iterations, parser)
    # Refuse an unusable destination before spending provider calls.
    reserve_output(args.output, parser)

    results = {"course": [], "admin": [], "cv": []}
    target_status = credentials["target_initial_status"]
    for index, case in enumerate(cases):
        status, payload, elapsed, course_trace = request(base, "/api/ai/agents/courses", required["KH_CONTRIBUTOR_TOKEN"],
                                           {"topic": case["topic"], "max_videos": 20})
        course_data = payload.get("data") if isinstance(payload, dict) else None
        results["course"].append({"ok": status == 201 and isinstance(course_data, dict)
                                  and course_data.get("status") == "published",
                                  "status": status, "duration_ms": elapsed,
                                  "request_ids": [course_trace]})

        desired = "inactive" if target_status == "active" else "active"
        start = time.perf_counter()
        planned, proposal, _, plan_trace = request(base, "/api/ai/agents/admin/plan", required["KH_ADMIN_TOKEN"],
                                       {"instruction": f"Set this account status to {desired}",
                                        "target_user_id": required["KH_TEST_TARGET_USER_ID"]})
        confirmed = 0
        confirm_trace = None
        if planned == 201 and isinstance(proposal, dict):
            approval = proposal.get("data") or {}
            if approval.get("action") == "change_user_status" and approval.get("value") == desired:
                confirmed, _, _, confirm_trace = request(base, "/api/ai/agents/admin/confirm", required["KH_ADMIN_TOKEN"],
                                          {"approval_id": approval.get("approval_id"), "accepted": True})
        results["admin"].append({"ok": confirmed == 200, "status": confirmed or planned,
                                 "duration_ms": (time.perf_counter() - start) * 1000,
                                 "request_ids": [value for value in (plan_trace, confirm_trace) if value]})
        if confirmed == 200:
            target_status = desired

        start = time.perf_counter()
        preview_status, preview, _, preview_trace = request(base, "/api/ai/cv/assessment/preview",
                                             required["KH_USER_TOKEN"], {"target_role": case["target_role"]},
                                             case["pdf_bytes"])
        saved_status = 0
        save_trace = None
        if preview_status == 200 and isinstance(preview, dict):
            preview_data = preview.get("data") or {}
            confirmationProof = preview_data.get("preview_token")
            if isinstance(confirmationProof, str):
                saved_status, _, _, save_trace = request(base, "/api/ai/cv/assessment/confirm",
                                             required["KH_USER_TOKEN"], {"preview_token": confirmationProof},
                                             case["pdf_bytes"])
        results["cv"].append({"ok": saved_status == 201, "status": saved_status or preview_status,
                              "duration_ms": (time.perf_counter() - start) * 1000,
                              "request_ids": [value for value in (preview_trace, save_trace) if value]})
        if index + 1 < args.iterations:
            time.sleep(args.interval_seconds)

    report = {
        "environment": "isolated_local_compose",
        "case_topics_distinct": len({case["topic"] for case in cases}),
        "case_pdfs_distinct": len({str(Path(case["cv_pdf"]).resolve()) for case in cases}),
        "workflows": {name: summarize(attempts) for name, attempts in results.items()},
        "note": "Token usage, YouTube quota and cost must be joined from provider/service metrics; unavailable values are null.",
    }
    if args.telemetry:
        report = join_telemetry(report, args.telemetry, parser)
    report["benchmark_gate_pass"] = benchmark_gate(report, args.quality_reviewed)
    write_report(report, args.output, parser)
    return 0 if report["benchmark_gate_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
