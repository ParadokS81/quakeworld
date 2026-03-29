# Slipgate Parser: Demo Start Timestamp + PausedDuration in Demos

## MVDSV changes

### 1. New hidden block: demo start timestamp

One hidden block written at the start of every demo recording:

| Type ID | Name | Payload |
|---------|------|---------|
| `0x0009` | demo_start_timestamp_ms | `uint64_le` — Unix timestamp in milliseconds |

This is the wall-clock time when the demo starts recording,
with millisecond precision. Written once, at the very beginning
of the demo stream.

### 2. PausedDuration now written to demo files

The existing `PausedDuration` (type `0x000A`) was already generated
during pauses but only sent to QTV streams. Now also written to
demo files. No format change.

## Parser output

```json
{
  "demo_start_timestamp_ms": 1774519367927,
  "timeline": [
    { "type": "demo_start",      "offset_ms": 0 },
    { "type": "countdown_start", "offset_ms": 3000 },
    { "type": "countdown_end",   "offset_ms": 13000 },
    { "type": "match_start",     "offset_ms": 13000 },
    { "type": "pause_start",     "offset_ms": 360000 },
    { "type": "pause_end",       "offset_ms": 390000 },
    { "type": "overtime",        "offset_ms": 1213000 },
    { "type": "match_end",       "offset_ms": 1273000 },
    { "type": "intermission",    "offset_ms": 1273000 },
    { "type": "demo_end",        "offset_ms": 1278000 }
  ]
}
```

`demo_start_timestamp_ms` comes from the new hidden block (0x0009).
`timeline` is derived by the parser from existing demo data.
`pause_start`/`pause_end` offsets account for real wall-clock time
using the `PausedDuration` blocks now present in demo files.

## What needs to change in slipgate

### 1. Read new hidden block

**File:** `crates/quake/src/protocol/qw/ext/mvd1.rs`

Type 9 is currently mapped to `UserCommandWeaponInstruction`.
Update to read the uint64 timestamp:

```rust
#[brw(magic(9u16))]  DemoStartTimestamp(u64),
```

### 2. PausedDuration already parsed

The existing `PausedDuration` variant (magic 10) already works.
No parser change needed — MVDSV just writes it to demos now.

### 3. Add demo_start_timestamp_ms to output

Read the type 0x0009 block, output as `demo_start_timestamp_ms`
top-level field in the ktxstats JSON.

### 4. Build timeline from existing demo data

The parser already has the information to detect all lifecycle
events from the demo stream. Add `PausedDuration` accumulation
to get accurate wall-clock offsets during pauses.

## Binary format

### Hidden block type 0x0009 — Demo Start Timestamp

```
Offset  Size  Field
0       4     block_length (uint32_le) = 8
4       2     type_id (uint16_le) = 0x0009
6       8     timestamp_ms (uint64_le) — Unix time in milliseconds
```

Total: 14 bytes in the MVD stream. Written once at demo start.
