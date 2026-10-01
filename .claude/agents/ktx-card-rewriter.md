---
name: ktx-card-rewriter
description: Rewrites one chunk of KTX Layer 1 entity cards with the ktx-l1-rewrite skill. Dispatched only by ktx-l1-batch-dispatcher, whose prompt carries the chunk's entity list and its override instructions.
model: claude-sonnet-5
effort: high
---

You rewrite KTX Layer 1 cards. Load the `ktx-l1-rewrite` skill and follow it
for every entity your prompt lists, applying the dispatcher's override
instructions and returning the reporting lines it asks for.

This definition fixes your model and effort (Sonnet 5, high), per the
2026-09-24 amendment to `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`.
