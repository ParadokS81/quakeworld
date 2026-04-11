> Adapted from vikpe's slipgate web repo at `research/repos/slipgate/llm/skills/`. Source content copied on 2026-04-11 with em dashes normalized to ASCII hyphen-minus to match the monorepo's output discipline. Update from upstream rather than editing in place when the source changes.

# Grug-Brained Development

Principles from [grugbrain.dev](https://grugbrain.dev) - a self-aware guide to keeping things simple.

## Complexity is the Enemy

Complexity is the apex predator. It enters codebases through well-meaning developers who don't fear it. You can't fight it with a club - you fight it with the word **"no"**.

- Say **no** to unnecessary features, abstractions, and cleverness.
- When you must say **yes**, find the **80/20 solution**: 80% of the value with 20% of the code. Maybe a little ugly, but it works and keeps complexity at bay.
- Complexity you can't see is worse than a problem you can. Given a choice between complexity and a t-rex, take the t-rex - at least you can see it.

## Factor Code Slowly

Don't factor too early. Early in a project everything is abstract and fluid - wait for the shape to emerge.

- Good cut points have **narrow interfaces** with the rest of the system: a small number of functions that trap complexity inside, like a demon trapped in a crystal.
- Be biased towards **waiting**. Going too early means getting abstractions wrong.
- Big brains invent many abstractions at the start. Counter this by demanding a **working prototype** - it forces contact with reality.

## Testing

- Don't write tests before you understand the domain. Write most tests **after the prototype phase**, when code firms up.
- **Integration tests are the sweet spot.** High-level enough to test correctness, low-level enough to debug when they break.
- Unit tests are fine early on but break as implementation changes. Don't get too attached.
- Keep a **small, curated end-to-end test suite** focused on the most common paths and critical edge cases. Maintain it religiously.
- Avoid mocking. If absolutely necessary, mock at coarse grain (cut points/system boundaries) only.
- **One exception to "no test first":** when a bug is found, always write a regression test _before_ fixing it.

## Don't Over-DRY

DRY is good advice, but balance matters. Repeated code that is **simple and obvious** is often better than a complex DRY abstraction with callbacks, closures, or elaborate object models.

Copy-paste with small variations can be preferable to a hard-to-follow generic solution.

## Chesterton's Fence

Don't tear out code you don't understand. If you don't see the use of it, go away and think. When you can explain _why_ it exists, then you may consider removing it.

Humility before the existing codebase. Code that works today deserves respect, even if it's ugly.

## Expression Complexity

Break complex expressions into named intermediate variables. More lines of code, but **easier to debug and easier to read**.

```rust
// prefer this
let is_inactive = !contact.is_active();
let is_family_or_friend = contact.in_group(FAMILY) || contact.in_group(FRIENDS);
if is_inactive && is_family_or_friend {
    // ...
}

// over this
if !contact.is_active() && (contact.in_group(FAMILY) || contact.in_group(FRIENDS)) {
    // ...
}
```

## Type Systems

The biggest value of a type system: **hit dot, see what you can do**. Autocomplete and discoverability are 90% of the value. Correctness is a bonus, not the main event.

Beware over-abstraction with generics. A small amount goes a long way. Limit generics mostly to container types where they add real value.

## Logging

Log generously.

- Log all major logical branches (if/for).
- Include request IDs so logs can be grouped across a request's lifetime.
- Make log level dynamically controllable so you can turn up verbosity when debugging.
- Per-user log levels are even better for debugging specific issues in production.

## Concurrency

Fear concurrency. Rely on simple models: stateless request handlers, simple job queues with independent jobs. Reach for complexity only when forced.

## Optimizing

Never optimize without a concrete, real-world performance profile showing the specific issue. You will be surprised - it's often not what you think.

Don't focus only on CPU. Network calls cost millions of CPU cycles. Minimize them.

## APIs

Good APIs don't make you think. Design for the simple case first with a simple interface. Make complex cases possible with a more complex layer underneath.

Put the API on the thing, not elsewhere. `list.filter()`, not `stream(list).filter().collect()`.

## Fear of Looking Dumb (FOLD)

It is very good when a senior developer says publicly: "this is too complex for me."

It gives permission for everyone else to admit the same. FOLD is a major source of complexity's power. Take that power away.

## Impostor Syndrome

Feeling like you have no idea what you're doing is the normal state. Everybody is an impostor if everybody is an impostor. Ship anyway.

## Summary

> Complexity _very_, _very_ bad.
