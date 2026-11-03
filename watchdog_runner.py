"""
watchdog_runner.py - UI Alignment Execution Watchdog

Monitors PROGRESS_UI_ALIGNMENT.md and ensures continuous progress
for up to 8 hours (28,800 seconds).
"""

import os
import sys
import time

MAX_DURATION_SECONDS = 28800  # 8 hours
CHECK_INTERVAL_SECONDS = 15
PROGRESS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PROGRESS_UI_ALIGNMENT.md")


def get_pending_tasks(filepath: str) -> list[str]:
    if not os.path.exists(filepath):
        return []
    pending = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith("- [ ]"):
                pending.append(line.strip()[5:].strip())
    return pending


def main():
    start_time = time.time()
    print(f"[WATCHDOG] Started at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[WATCHDOG] Max duration: {MAX_DURATION_SECONDS} seconds (8 hours)")
    print(f"[WATCHDOG] Monitoring file: {PROGRESS_FILE}")

    iteration = 0
    while True:
        elapsed = time.time() - start_time
        if elapsed >= MAX_DURATION_SECONDS:
            print(f"[WATCHDOG] 8-hour time limit reached. Stopping watchdog.")
            break

        pending = get_pending_tasks(PROGRESS_FILE)
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
