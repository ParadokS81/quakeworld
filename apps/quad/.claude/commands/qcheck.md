---
description: Verify implementation against phase spec and cross-project contracts
argument-hint: <phase-id> (e.g., A5, A6 — checks most recent changes if omitted)
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Verify Implementation — quad

Review the implementation for phase $ARGUMENTS against quad patterns, the phase spec, and cross-project contracts.

## Strategy: Compile First, Then Spec Check

TypeScript compilation catches type errors, missing imports, and wrong signatures. The agent handles the semantic checks that the compiler can't catch: spec compliance, custom ID consistency, Firestore schema alignment, and Discord API constraints.

## Phase 1: Compile

Run the TypeScript compiler first — no point checking semantics if it doesn't compile:

```
wsl bash -ic "cd /home/paradoks/projects/quake/quad && npx tsc --noEmit 2>&1"
```

If compilation fails, report the errors and stop. Fix those first.

## Phase 2: Launch Verification Agent

```
Task(Explore, thoroughness="very thorough"): "
Verify the implementation for quad phase $ARGUMENTS.

CHECK THESE FILES:
1. Read the phase spec: docs/multi-clan/phase-$ARGUMENTS-*.md (glob for it)
2. Find all files mentioned in the phase spec
3. Read each implemented/modified file
4. If the spec references a cross-project contract, read AVAILABILITY-ENHANCEMENT-CONTRACT.md (or the relevant contract) at /home/paradoks/projects/quake/

VERIFY THESE PATTERNS:

1. Custom ID Consistency:
   - Every customId string set in a builder (buttons, select menus) must have a matching
     startsWith() route in the handleButton() or handleSelectMenu() router
   - Format should follow existing convention: 'avail:{action}:{teamId}:{...params}'
   - Check: builder IDs in message.ts or interaction builders match routes in interactions.ts

2. Firestore Schema Alignment:
   - Every Firestore field read/written must match the contract schema
   - Check field names: 'template.slots', 'template.recurring', 'template.lastAppliedWeekId'
   - Check collection paths: 'users/{uid}', 'availability/{teamId}_{weekId}'
   - Verify that FieldValue.arrayUnion/arrayRemove usage matches existing patterns
   - If both quad and a Cloud Function write the same field, verify they use identical structure

3. Discord API Constraints:
   - Max 5 action rows per message
   - Max 5 buttons per action row
   - Select menu must be alone in its row (no buttons alongside)
   - Custom ID max 100 characters
   - Button labels max 80 characters
   - Ephemeral messages: must use MessageFlags.Ephemeral
   - deferReply vs deferUpdate used correctly (reply = new message, update = edit existing)

4. Module Boundaries:
   - Availability module code stays in src/modules/availability/
   - Shared Firebase access via getDb() from standin/firestore.ts (existing pattern)
   - No direct imports between unrelated modules
   - Logger usage: import { logger } from '../../core/logger.js'

5. Error Handling:
   - Every Firestore operation in a try/catch
   - User-facing errors via editReply (not throwing)
   - Logger.error for backend failures
   - Graceful fallbacks (e.g., button disabled vs crash)

6. User Resolution:
   - resolveUser() called before any user-specific Firestore operation
   - replyNotLinked() called when resolveUser returns null
   - user.uid (Firebase UID) used for Firestore, NOT interaction.user.id (Discord ID)

7. Spec Compliance (behavioral):
   - For each feature in the phase spec, verify the implementation matches the described behavior
   - Check edge cases mentioned in the spec are handled
   - Verify the exact button labels, styles, and disabled states match the spec

RETURN A STRUCTURED REPORT:
- Compilation: PASS/FAIL
- Files checked (list with line counts)
- Pattern compliance (what's correct)
- Issues found (categorized: CRITICAL / IMPORTANT / MINOR)
- Cross-project alignment: any schema mismatches with MatchScheduler
- Specific fixes needed with code examples
- Ready for testing: YES/NO
"
```

## Phase 3: Review Findings

The agent returns a focused report. Review it and:

1. **If compilation failed**: List specific type errors to fix
2. **If CRITICAL issues**: List specific fixes needed
3. **If IMPORTANT issues**: Note them for this iteration
4. **If MINOR only**: Ready for deploy

## Phase 4: Generate Fix List

```
IMPLEMENTATION REVIEW — Phase $ARGUMENTS

Compilation: [PASS/FAIL]

✅ Working Correctly:
- [List what follows patterns]
- [Custom IDs that match]
- [Schema fields that align]

⚠️ Issues Found:

CRITICAL (must fix before deploy):
- [Issue]: [File:line] - [What's wrong]
  Fix: [Specific code change]

IMPORTANT (should fix):
- [Issue]: [Description]
  Fix: [How to fix]

MINOR (cosmetic):
- [Issue]

Cross-Project Alignment:
- [Any Firestore field mismatches between quad and MatchScheduler]
- [Any custom ID format inconsistencies]

Ready for Deploy: [YES/NO]
```

## What This Catches That the Compiler Doesn't

- Custom ID strings mismatched between builders and handlers (just strings, no types)
- Firestore field names mismatched between quad and Cloud Functions (both write strings)
- Discord component limits exceeded (runtime error, not compile error)
- Using Discord user ID instead of Firebase UID for Firestore operations
- Spec behavioral requirements not implemented (edge cases, disabled states)
- deferReply vs deferUpdate confusion (both compile fine, different runtime behavior)
