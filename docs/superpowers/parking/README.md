# Parking

Body files for arcs that are not started (future arcs) and the cold-start anchors of paused ones, indexed from the root `HANDOVER.md`. The shape is harness-lab `DOC-WRITING.md`'s "Parking doc" entry: why this is arc-shaped, scope sketch, open questions for the design passes, what is not in scope, operator notes, related pointers, and the trigger that revives it. A park-mode capture may collapse to one paragraph plus the trigger.

A parking doc carries no live status. Coarse status is the `HANDOVER.md` row (`planning` / `running` / `paused -- waiting on <condition>`); live phase state belongs to an arc scaffold's Status block, never here. Dated notes may be appended as design passes land; a ruling recorded here is not in the spec until it is drafted there.

When an arc ships, its row is deleted from `HANDOVER.md`, one retrospective paragraph goes to the owning `arc-history.md`, and the parking file is deleted or kept as a seed-record (operator preference). An unindexed parking file is an orphan to the docs-check walk.

Filename convention: `YYYY-MM-DD-<topic>.md`, the date being when the entry was opened, not last touched.
