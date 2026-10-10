# Cross-project contracts

Design specs and data contracts for features that span two or more apps. Open cross-app work is tracked in the root `HANDOVER.md`; this folder holds the specs themselves.

Rules in this scope:
- `SCHEMA.md` is the authoritative shape of every shared Firestore collection and Storage path. When a shape changes, update it, the writer and the reader in the same commit.
- A contract starts in `active/` and moves to `completed/` when the feature ships; `README.md` lists both and moves with it (procedure in `README.md`, "Adding a new contract").

## Documentation index

| When you need... | Read... |
|---|---|
| Every contract with a one-line summary, and how to add one | `README.md` |
| Shared Firestore collections and Storage paths (authoritative) | `SCHEMA.md` |
| In-progress cross-app specs | `active/` (listed in `README.md`) |
| Shipped cross-app specs, kept as history | `completed/` (listed in `README.md`) |
| The voice-replay audio sync investigation (crosses quad and matchscheduler) | `AUDIO-SYNC-INVESTIGATION.md` |

## Subsystem scopes

None.
