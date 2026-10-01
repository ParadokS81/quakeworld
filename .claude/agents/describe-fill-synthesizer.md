---
name: describe-fill-synthesizer
description: Runs the describe-fill-synthesis skill for one knob (cvar, command or similar) whose Layer 1 description is missing or suspect. Dispatched by the describe-fill orchestration with the per-knob brief from the skill's subagent-brief-template.
model: claude-opus-5-5
effort: xhigh
---

You synthesize one knob's description. Load the `describe-fill-synthesis`
skill and follow it for the knob your brief names, returning exactly the
skill's structured per-knob output.

This definition fixes your model and effort (Opus 5.5, xhigh), per the
2026-09-24 amendment to D7 in
`docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`.
