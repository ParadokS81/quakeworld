#!/usr/bin/env python3
"""Scan an MVD demo file to check which client indices receive Stats frames.
This answers: does MVD record stats for ALL players or just the POV player?

MVD Frame Header format:
  - u8:  duration_ms
  - u8:  message_type_byte (lower 3 bits = type, upper 5 bits = client index for Stats/Single)
  - u32: last_to (ONLY if type == Multiple/3)
  - u32: body_size

Message types:
  0=Cmd, 1=Read, 2=Set, 3=Multiple, 4=Single, 5=Stats, 6=All, 7=Empty
"""

import struct
import sys
from collections import defaultdict

def scan_mvd(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()

    pos = 0
    frame_count = 0
    type_counts = defaultdict(int)
    stats_clients = defaultdict(int)  # client_index -> frame count
    single_clients = defaultdict(int)
    total_time_ms = 0
    hidden_msg_count = 0

    type_names = {0: 'Cmd', 1: 'Read', 2: 'Set', 3: 'Multiple',
                  4: 'Single', 5: 'Stats', 6: 'All', 7: 'Empty'}

    while pos < len(data) - 6:  # minimum header size
        if pos + 2 > len(data):
            break

        duration_ms = data[pos]
        msg_type_byte = data[pos + 1]
        msg_type = msg_type_byte & 0x7
        client_index = msg_type_byte >> 3
        pos += 2

        # Multiple type has extra 4-byte last_to field
        if msg_type == 3:  # Multiple
            if pos + 4 > len(data):
                break
            last_to = struct.unpack_from('<I', data, pos)[0]
            pos += 4

        if pos + 4 > len(data):
            break
        body_size = struct.unpack_from('<I', data, pos)[0]
        pos += 4

        # Sanity check
        if body_size > 1_000_000:
            print(f"WARNING: Suspicious body_size={body_size} at frame {frame_count}, stopping")
            break

        frame_count += 1
        total_time_ms += duration_ms
        type_counts[msg_type] += 1

        if msg_type == 5:  # Stats
            stats_clients[client_index] += 1

        if msg_type == 4:  # Single
            single_clients[client_index] += 1

        # Check for hidden messages (Multiple with last_to == 0)
        if msg_type == 3 and last_to == 0:
            hidden_msg_count += 1

        # Skip body
        if pos + body_size > len(data):
            break
        pos += body_size

    # Report
    print(f"\nFile: {filepath}")
    print(f"Total frames: {frame_count}")
    print(f"Duration: {total_time_ms/1000:.1f} seconds ({total_time_ms/60000:.1f} minutes)")
    print(f"\nFrame type distribution:")
    for t in sorted(type_counts.keys()):
        print(f"  {type_names.get(t, f'Unknown({t})')}: {type_counts[t]}")

    print(f"\nHidden message frames (DamageDone etc): {hidden_msg_count}")

    print(f"\n*** STATS frames by client_index ***")
    if stats_clients:
        for ci in sorted(stats_clients.keys()):
            print(f"  Client {ci}: {stats_clients[ci]} Stats frames")
        print(f"\n  TOTAL unique clients with stats: {len(stats_clients)}")
        if len(stats_clients) >= 8:
            print("  --> YES: Stats are recorded for ALL players!")
        else:
            print(f"  --> Only {len(stats_clients)} client(s) have stats")
    else:
        print("  No Stats frames found!")

    print(f"\nSingle frames by client_index:")
    if single_clients:
        for ci in sorted(single_clients.keys()):
            print(f"  Client {ci}: {single_clients[ci]} Single frames")
    else:
        print("  No Single frames found")

if __name__ == '__main__':
    import glob
    demo_dir = '/home/paradoks/projects/quake/_research/assets/demos/'
    demos = sorted(glob.glob(demo_dir + '*.mvd'))
    for demo in demos:
        scan_mvd(demo)
        print("\n" + "="*60)
