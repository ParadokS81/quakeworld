#!/usr/bin/env python3
"""Analyze timing offsets — compare old pipeline vs fixed (hub start → ktxstats end)."""
import json
from datetime import datetime, timedelta
from pathlib import Path

base = Path("/home/paradoks/projects/quake/quad/recordings/2e823379-d61a-4283-ac8a-908f4faf5121/processed")
rec_start_str = "2026-02-10T21:04:16.300Z"
rec_start = datetime.fromisoformat(rec_start_str.replace("Z", "+00:00"))

print(f"Recording start: {rec_start.strftime('%H:%M:%S.%f')[:-3]}")
print()

for meta_path in sorted(base.glob("2026-02-10_*_vs_*/metadata.json")):
    d = json.loads(meta_path.read_text())
    dir_name = meta_path.parent.name

    hub_ts_str = d["matchData"]["timestamp"]
    hub_ts = datetime.fromisoformat(hub_ts_str.replace("Z", "+00:00"))

    ktx = d.get("ktxstats") or {}
    ktx_date_str = ktx.get("date", "")
    ktx_dur = ktx.get("duration", 0)

    old_start = d["startTime"]
    old_end = d["endTime"]

    print(f"=== {dir_name} ===")

    if ktx_date_str and ktx_dur:
        ktx_end = datetime.strptime(ktx_date_str, "%Y-%m-%d %H:%M:%S %z")

        # New logic: demo start (hub ts) → match end (ktxstats date)
        new_start = (hub_ts - rec_start).total_seconds()
        new_end = (ktx_end - rec_start).total_seconds()

        print(f"  OLD: {old_start:.1f}s → {old_end:.1f}s  (span: {old_end-old_start:.1f}s = {(old_end-old_start)/60:.1f}m)")
        print(f"  NEW: {new_start:.1f}s → {new_end:.1f}s  (span: {new_end-new_start:.1f}s = {(new_end-new_start)/60:.1f}m)")
        print(f"  Start shift: {new_start - old_start:+.1f}s, End shift: {new_end - old_end:+.1f}s")
    print()
