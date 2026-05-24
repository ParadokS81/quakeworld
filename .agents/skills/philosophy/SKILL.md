---
name: philosophy
description: Core software design principles including "A Philosophy of Software Design" (Ousterhout) and "Grug-Brained Development". Use when making architectural decisions, refactoring, or reviewing code.
---

# Philosophy of Software Design & Grug-Brain

This skill provides foundational principles for software development in this monorepo.

## Key Principles (Ousterhout)
- **Strategic vs. Tactical**: Invest 10-20% of time in design. Leave code better than you found it.
- **Deep Modules**: Simple interfaces hiding complex implementations (e.g., Unix I/O).
- **Information Hiding**: Encapsulate design decisions; avoid information leakage.
- **Pull Complexity Downward**: Handle complexity in the implementation, not the interface.
- **Define Errors out of Existence**: Redesign operations so error cases don't arise.
- **Comments Explain WHY**: Document rationale and intent, not mechanics.

## Grug-Brained Wisdom
- **Complexity is the Enemy**: Say "no" to unnecessary abstractions.
- **80/20 Solution**: 80% of value with 20% of code.
- **Factor Slowly**: Wait for the shape to emerge before abstracting.
- **Logging**: Log generously (major branches, request IDs).
- **Fear Concurrency**: Stick to simple models (stateless handlers, job queues).
- **Don't Over-DRY**: Simple, repeated code is often better than complex abstractions.

## Output Discipline
- **ASCII Only**: No em dashes, smart quotes, or Unicode decorations.
- **Brief & Objective**: No filler, no emotions.
- **Explain WHY**: Comments should clarify rationale, not repeat the code.
