# Parking

Per-arc and per-future-arc body files indexed from `HANDOVER.md`. Each file describes one ongoing or future arc using HANDOVER's existing template:

- `**Added:**` — date the entry was opened
- `**Status:**` — one-line current state (ongoing / future / blocked-on-X)
- `**Verification first:**` — the cheap check to run before starting work, in case state has drifted
- Body sections — what's done, what's next, dependencies, sub-threads
- `**Pressure:**` — relative urgency
- `**Related:**` — pointers to specs / plans / memory / source files

When an arc graduates from "future" to "ongoing", update the parking file's `**Status:**`. The HANDOVER index entry moves between sub-sections.

When an arc ships, harvest the parking file's content into the relevant project's `arc-history.md` and either delete or keep the parking file as a seed-record (operator preference). The HANDOVER index entry is removed entirely.

Filename convention: `YYYY-MM-DD-<topic>.md` where the date is when the entry was opened, not last-touched.
