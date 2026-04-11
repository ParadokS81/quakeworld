> Adapted from vikpe's slipgate web repo at `research/repos/slipgate/llm/skills/`. Source content copied on 2026-04-11 with em dashes and en dashes normalized to ASCII hyphen-minus to match the monorepo's output discipline. Update from upstream rather than editing in place when the source changes.

# A Philosophy of Software Design

Principles from "A Philosophy of Software Design" by John Ousterhout.

The central thesis: **the greatest limitation in software is our ability to understand the systems we create**. Complexity is anything that makes code hard to understand or modify. It manifests as change amplification, cognitive load, and unknown unknowns. Complexity is incremental - it creeps in one shortcut at a time.

## Key Ideas

**Strategic vs. tactical programming.** Tactical programmers focus on getting features working fast. Strategic programmers invest 10-20% of their time improving design. Every commit should leave the codebase a little better.

**Deep modules.** The best modules have simple interfaces that hide complex implementations. A shallow module adds little value and increases system-wide complexity. Think of Unix file I/O: five calls (`open`, `read`, `write`, `lseek`, `close`) hide enormous complexity. Default-heavy APIs are deep APIs.

**Information hiding.** Each module should encapsulate design decisions so other modules don't depend on them. Information leakage - the same knowledge spread across multiple modules - is a major red flag.

**General-purpose modules.** Somewhat general-purpose interfaces tend to be simpler, deeper, and more reusable. Design the interface to serve today's needs in a way that naturally accommodates tomorrow's without over-engineering.

**Different layer, different abstraction.** Each layer should provide a distinctly different abstraction. Pass-through methods and thin decorators are symptoms of adjacent layers at the same abstraction level - merge them or rethink the boundary.

**Pull complexity downward.** When complexity is unavoidable, push it into the implementation rather than the interface. It is better for one module author to suffer than for many callers to deal with the mess.

**Define errors out of existence.** Redefine operations so error cases simply don't exist (e.g., `unset` on a non-existent variable is a no-op). Fewer special cases means less code and fewer bugs.

**Comments explain why.** Good comments capture things the code cannot say: rationale, design decisions, invariants, high-level intent. Comments should describe abstractions, not repeat the code.

**Naming.** Good names are precise, consistent, and create a clear mental image. If a name requires a comment to explain it, pick a better name.

**Consistency.** Once you learn how something is done, you can apply that knowledge everywhere. Never introduce a "better" way unless you're willing to convert all existing uses.

**Obviousness.** Code is obvious when a reader can understand it quickly without much thought. If reviewers find something confusing, it is confusing - fix it.

## Principles (Quick Reference)

1. **Modules should be deep.** Complex implementations behind simple interfaces with sensible defaults.
2. **Minimize cognitive load.** Code should be obvious. If others find it complex, it is complex.
3. **Strategic over tactical.** Don't ship quick hacks that make future changes harder.
4. **Design multiple options.** Consider at least two approaches for major decisions.
5. **Comments explain _why_, not _what_.** Document rationale, not mechanics.
6. **Consistency creates leverage.** Follow existing conventions. Don't reinvent patterns already established in the codebase.
7. **Tests enable refactoring.** Write unit tests that give confidence to make structural improvements.
8. **Measure before optimizing.** Benchmark first, then optimize the critical path.
9. **Pull complexity downward.** Handle it in the implementation, not the interface.
10. **Define errors out of existence.** Redesign operations so error cases don't arise.
11. **Information hiding.** Encapsulate design decisions so they don't leak across module boundaries.
12. **Different layer, different abstraction.** Eliminate pass-through methods and thin decorators.
13. **General-purpose interfaces.** Somewhat general is simpler than overly specific.
14. **Good naming is design.** Precise, consistent names reduce the need for documentation.
