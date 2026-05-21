# B5 format-unify ledger -- batch 30

**Batch:** 30 (2 rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---

B5-RESULT | ktx:command:next_map | FORMAT-UNIFIED | rev=1 | from-shape: 17-char bare verb phrase | to-shape: D20-template

### ktx:command:next_map

- canonical_id: `ktx:command:next_map`
- prior length: 17 chars
- new length: 251 chars

- OLD description:
  > vote for next map

- NEW description:
  > Casts a vote to end the current map and cycle to the next one. Call again to withdraw your vote. Blocked if the server has disabled map voting (k_no_vote_map). Available before, during, and after a live match.
  >
  > Set by: any player ('next_map' in-game).

---

B5-RESULT | ktx:command:no | FORMAT-UNIFIED | rev=1 | from-shape: 14-char bare verb phrase | to-shape: D20-template

### ktx:command:no

- canonical_id: `ktx:command:no`
- prior length: 14 chars
- new length: 247 chars

- OLD description:
  > withdraws vote

- NEW description:
  > Withdraws your previously-cast vote. Applies to generic votes and admin elections started with /elect. Does nothing if you have no active vote or no vote is currently in progress. Companion to the 'yes' command.
  >
  > Set by: any player ('no' in-game).

---
