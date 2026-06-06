# Ledger -- qwfwd `wait` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `Cmd_Wait_f` (src/cmd.c:39-43), registered src/cmd.c:1074
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.40-dev

## Enforce-trace

| Clause | Enforcing line | Snippet | Result |
|---|---|---|---|
| Sets a pending-wait flag on the active command buffer | src/cmd.c:41-42 | `if (cbuf_current) cbuf_current->wait = true;` | MATCH |
| Effect = remaining buffered commands deferred to the next frame | src/cmd.c:216-221 | `if (cbuf->wait) { ... cbuf->wait = false; break; }` (comment "skip out while text still remains in buffer, leaving it for next frame") | MATCH |
| One-shot: the flag is cleared as soon as it fires | src/cmd.c:219 | `cbuf->wait = false;` | MATCH |
| Takes no arguments | src/cmd.c:39-43 | handler body reads no argv | MATCH |

SR-7: the prior `source_inline` stub was the raw C comment block at src/cmd.c:34-36
("Causes execution of the remainder of the command buffer to be delayed until next
frame ... bind g \"impulse 5 ; +attack ; wait ; -attack ...\""). Ignored per SR-7;
synthesized fresh from the handler + its consumer in Cbuf_ExecuteEx. End-state
origin = `synthesized`.

```json
{
  "project": "qwfwd",
  "knob": "wait",
  "type": "command",
  "description": "Pauses the rest of the current command sequence until the next frame. When several commands are queued together (for example chained with semicolons inside a config), everything after wait is held back and run on the following frame instead of immediately. It takes no arguments and inserts a one-frame gap each time it runs.\n\nSet by: proxy server console / qwfwd.cfg.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cmd_Wait_f (src/cmd.c:39-43) sets `cbuf_current->wait = true` (src/cmd.c:42). The flag is consumed in Cbuf_ExecuteEx: src/cmd.c:216 `if (cbuf->wait)` -> src/cmd.c:219 `cbuf->wait = false;` then src/cmd.c:220 `break;`, with the adjacent comment src/cmd.c:217-218 \"skip out while text still remains in buffer, leaving it for next frame\" -- so the remainder of the buffer is deferred to the next frame and the flag is one-shot (cleared on fire). Handler reads no argv -> no arguments. SR-7: prior source_inline stub was the raw dev comment block at src/cmd.c:34-36 (the bind-chain example) -- ignored, synthesized fresh from handler + consumer; end-state origin synthesized. No Default line (command, no value). Set-by: QWFWD has no access tiers / no own rcon (ACCESS MODEL) -- issued from the proxy console or qwfwd.cfg. TRACED-CLEAN.",
  "description_proposed": null
}
```
