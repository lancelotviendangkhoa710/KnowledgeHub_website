"""
watchdog_runner.py - UI Alignment Execution Watchdog

Monitors PROGRESS_UI_ALIGNMENT.md and ensures continuous progress
for up to 8 hours (28,800 seconds).
"""

import os
import sys
import time
from typing import Optional

MAX_DURATION_SECONDS = 28800  # 8 hours
CHECK_INTERVAL_SECONDS = 15
PROGRESS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PROGRESS_UI_ALIGNMENT.md")


def get_pending_tasks(filepath: str) -> Optional[list[str]]:
    if not os.path.exists(filepath):
        return None
    pending = []
    checkbox_count = 0
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith(("- [ ]", "- [x]")):
                    checkbox_count += 1
                if stripped.startswith("- [ ]"):
                    pending.append(stripped[5:].strip())
    except (OSError, UnicodeDecodeError):
        return None

    if checkbox_count == 0:
        return None

    return pending


def main():
    start_time = time.monotonic()
    print(f"[WATCHDOG] Started at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[WATCHDOG] Max duration: {MAX_DURATION_SECONDS} seconds (8 hours)")
    print(f"[WATCHDOG] Monitoring file: {PROGRESS_FILE}")

    iteration = 0
    reported_unreadable = False
    while True:
        elapsed = time.monotonic() - start_time
        if elapsed >= MAX_DURATION_SECONDS:
            print("[WATCHDOG] 8-hour time limit reached. Stopping watchdog.")
            break

        pending = get_pending_tasks(PROGRESS_FILE)
        if pending is None:
            if not reported_unreadable:
                print(f"[WATCHDOG] Cannot read tasks from {PROGRESS_FILE}. Retrying every {CHECK_INTERVAL_SECONDS}s.")
                reported_unreadable = True
            time.sleep(CHECK_INTERVAL_SECONDS)
            continue

        reported_unreadable = False

        if not pending:
            print("[WATCHDOG] All tasks in PROGRESS_UI_ALIGNMENT.md are complete! [x]")
            break

        iteration += 1
        if iteration % 4 == 0 or iteration == 1:
            print(
                f"[WATCHDOG] Elapsed: {int(elapsed)}s / {MAX_DURATION_SECONDS}s. "
                f"Pending tasks ({len(pending)}): {pending[0]}"
            )

        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
