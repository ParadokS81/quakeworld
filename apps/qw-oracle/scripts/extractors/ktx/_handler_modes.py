"""Modes handler for the KTX AST extractor.

Emits the KTX game_mode catalog (27 rows) plus mode_default per-line
overlays (~309 rows) into one ktx-modes-ast.json payload.

Source-file scope (allowlisted at start_file; any other file returns
immediately): commands.c, world.c, race.c.

Pattern classes consumed:
  - Pattern 15 (STRING_LITERAL-array walker): the 17 _<mode>_um_init[]
    declarations + common_um_init[] are const char[] arrays whose
    initializer is a sequence of adjacent string literals (one cvar
    line per literal). We walk the post-`=` token stream, capturing
    per-literal source lines.
  - Pattern 6 (depth-1 #include macro lift, D4): common_um_init[]
    contains LGCMODE_VARIABLE / TOT_MODE_VARIABLE which are #defined
    in include/g_local.h. We consult self.file_macros (populated by
    walk_tu_dispatch via extractor_lib._source.collect_file_macros)
    to resolve them at extraction time.

CROSS-CODEBASE PORT (D3). Inherits from Visitor only -- NO subclass
of any parent-project handler. KTX's mode taxonomy (UserModes_t enum
+ um_list[] dispatch + per-mode initstring arrays) has no analog in
ezQuake / FTE / QWCL / MVDSV; subclassing would tie KTX-specific
extraction to a parent's API surface that does not apply.

Output entity shape (one finalize dict, not per-file rows):

    {
      "groups":        {"game_mode": "catalog", "mode_default": "overlay"},
      "game_modes":    [27 catalog rows],
      "mode_defaults": [~309 overlay rows],
      "_stats":        {...}
    }

Catalog row discriminator (D11) -- two-axis + one bool:
  init_mechanism in {um_init_string, cvar_toggle_with_init_string,
                     cvar_toggle_only}
  mode_class     in {standalone, mutator}
  auto_reset_on_match: bool

Final distribution: 17 um_init_string|standalone (the um_list peers)
+ 1 cvar_toggle_with_init_string|standalone (race)
+ 1 cvar_toggle_only|standalone (bloodfest)
+ 8 cvar_toggle_only|mutator
= 27.

Overlay rows gate via D8's single-key form: ruleset_gate_json =
{"mode": "<token>"} where the token is "common" for common_um_init
baseline and the user-facing token for per-mode overlays. Catalog
rows DEFINE modes and are not gated -- ruleset_gate_json = {}.

Per-line granularity (D12): one mode_default row per cvar-set line in
the source. Trailing `// comment` text on the same line is harvested
into props_json.comment; comments on a separate line are NOT harvested.

Source-fidelity tokens (D9): "ca" not "clan_arena", "tot" not
"tribe_of_tjernobyl", "lgc" not "LGC Mode". Source enum spellings
(umCA, um2on2, umLGCMODE) live in value_text for traceability.

F25 resolution: all cross-file state previously kept on self.*
accumulators is now emitted as typed pseudo-rows from end_file(),
then re-assembled inside finalize(all_rows=..., repo_root=...) from
the all_rows PARAMETER (not from self). This makes the handler
parallel-safe under multiprocessing.Pool fork-pool execution.

Pseudo-row _kind values:
  _mode_default          -- real mode_default row (carries name, kind,
                            value_text, ruleset_gate_json, props_json)
  _meta_activation_cvar  -- {"cvar_name": str, "source_ref": str}
  _meta_toggle_cmd       -- {"mutator_key": str, "source_ref": str,
                            "priority": int}  (0=cmds fallback, 1=authoritative)
  _meta_auto_reset       -- {"mutator_key": str, "source_ref": str}
  _meta_um_list_row      -- {"token": str, "source_ref": str}
  _meta_um_list_label_raw -- {"token": str, "label_raw": str}
  _meta_um_init_decl     -- {"array_name": str, "decl_line": int}
  _meta_race_ref         -- {"ref_kind": "toggle"|"apply"|"settings_decl",
                            "source_ref": str}
  _meta_unresolved_macro_line -- stats payload dict (append-only)
  _meta_skipped_line     -- stats payload dict (append-only)
  _meta_by_array_stat    -- {"array_name": str, "line_count": int,
                            "macros_resolved": int, "macros_unresolved": int}
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind, TokenKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string, read_extent  # noqa: E402


HANDLER_NAME = "modes"
OUTPUT_FILENAME = "ktx-modes-ast.json"

# Source-file allowlist. Anything NOT in this set is ignored at start_file
# (returns immediately). Keeps the handler bounded; mirrors MVDSV's
# protocol-handler shape (one source-set, no whole-tree walk).
RELEVANT_FILES: frozenset = frozenset({
    "commands.c",   # um_list[] + 17 _um_init[] + common_um_init[] + mutator/race auto-reset sites
    "world.c",      # mutator + race + bloodfest activation cvar registration sites
    "race.c",       # ToggleRace + apply_race_settings + race_settings[]
})

# The 17 user-facing user-mode tokens (col 1 of um_list[]). Source-fidelity
# spelling per D9. Keys match the literal C strings; values map to the
# source enum spelling for value_text.
UM_LIST_ENUMS: dict = {
    "1on1":      "um1ON1",
    "2on2":      "um2ON2",
    "3on3":      "um3ON3",
    "4on4":      "um4ON4",
    "10on10":    "um10ON10",
    "ffa":       "umFFA",
    "ctf":       "umCTF",
    "hoonymode": "umHOONYMODE",
    "blitz2v2":  "umBLITZ2v2",
    "blitz4v4":  "umBLITZ4v4",
    "2on2on2":   "um2ON2ON2",
    "3on3on3":   "um3ON3ON3",
    "4on4on4":   "um4ON4ON4",
    "XonX":      "umXONX",
    "wipeout":   "umWIPEOUT",
    "ca":        "umCA",
    "tot":       "umTOT",
}

# Source-fidelity team_structure (col 4 of um_list[]) per Pass 4.2 source-walk.
# Multiple user-facing modes can share a team_structure (3 modes share
# UM_4ON4: 4on4 + wipeout + ca; 3 share UM_1ON1HM: hoonymode + blitz2v2 +
# blitz4v4; 2 share UM_FFA: ffa + tot).
UM_LIST_TEAM_STRUCTURES: dict = {
    "1on1":      "UM_1ON1",
    "2on2":      "UM_2ON2",
    "3on3":      "UM_3ON3",
    "4on4":      "UM_4ON4",
    "10on10":    "UM_10ON10",
    "ffa":       "UM_FFA",
    "ctf":       "UM_CTF",
    "hoonymode": "UM_1ON1HM",
    "blitz2v2":  "UM_1ON1HM",
    "blitz4v4":  "UM_1ON1HM",
    "2on2on2":   "UM_2ON2ON2",
    "3on3on3":   "UM_3ON3ON3",
    "4on4on4":   "UM_4ON4ON4",
    "XonX":      "UM_XONX",
    "wipeout":   "UM_4ON4",
    "ca":        "UM_4ON4",
    "tot":       "UM_FFA",
}

# Per-mode game_type bucket per Pass 4.3 + 5.1 extension.
# Final bucket set: Duel | Team | FFA | CTF | Race | Survival | Mutator | Unknown.
UM_LIST_GAME_TYPES: dict = {
    "1on1":      "Duel",
    "2on2":      "Team",
    "3on3":      "Team",
    "4on4":      "Team",
    "10on10":    "Team",
    "ffa":       "FFA",
    "ctf":       "CTF",
    "hoonymode": "Duel",
    "blitz2v2":  "Team",
    "blitz4v4":  "Team",
    "2on2on2":   "Team",
    "3on3on3":   "Team",
    "4on4on4":   "Team",
    "XonX":      "Team",
    "wipeout":   "Team",
    "ca":        "Team",
    "tot":       "FFA",
}

# Display labels. The col-2 strings in um_list[] contain \223 / \224 / \225 /
# \226 conchar codes for digit glyphs (e.g. "\223 on \223" for "1 on 1").
# Layer 1 captures the human-readable label here; the raw col-2 string is
# captured separately in props_json.um_list_label_raw for traceability.
UM_LIST_USER_FACING_LABELS: dict = {
    "1on1":      "1 on 1",
    "2on2":      "2 on 2",
    "3on3":      "3 on 3",
    "4on4":      "4 on 4",
    "10on10":    "10 on 10",
    "ffa":       "FFA",
    "ctf":       "CTF",
    "hoonymode": "HoonyMode",
    "blitz2v2":  "Blitz (2v2)",
    "blitz4v4":  "Blitz (4v4)",
    "2on2on2":   "2 on 2 on 2",
    "3on3on3":   "3 on 3 on 3",
    "4on4on4":   "4 on 4 on 4",
    "XonX":      "X on X",
    "wipeout":   "Wipeout",
    "ca":        "Clan Arena",
    "tot":       "Tribe of Tjernobyl",
}

# The 17 const char[] initstring array names corresponding to um_list[] col 3.
UM_INIT_ARRAY_NAMES: dict = {
    "1on1":      "_1on1_um_init",
    "2on2":      "_2on2_um_init",
    "3on3":      "_3on3_um_init",
    "4on4":      "_4on4_um_init",
    "10on10":    "_10on10_um_init",
    "ffa":       "ffa_um_init",
    "ctf":       "ctf_um_init",
    "hoonymode": "_1on1hm_um_init",
    "blitz2v2":  "_2on2hm_um_init",
    "blitz4v4":  "_4on4hm_um_init",
    "2on2on2":   "_2on2on2_um_init",
    "3on3on3":   "_3on3on3_um_init",
    "4on4on4":   "_4on4on4_um_init",
    "XonX":      "_XonX_um_init",
    "wipeout":   "wipeout_um_init",
    "ca":        "carena_um_init",
    "tot":       "tot_um_init",
}

# Inverse lookup: array_name -> mode_token. Built once at module load so
# _extract_um_init_array can derive the mode_token gate from the array
# name without re-scanning UM_INIT_ARRAY_NAMES per row.
_UM_ARRAY_TO_TOKEN: dict = {v: k for k, v in UM_INIT_ARRAY_NAMES.items()}

# Per-mode race_plrs_per_team values (col 5 of um_list[]). Captures the
# integer literal per row; -1 for ffa, 0 for non-team modes.
UM_LIST_RACE_PLRS: dict = {
    "1on1":      1,
    "2on2":      2,
    "3on3":      3,
    "4on4":      4,
    "10on10":   10,
    "ffa":      -1,
    "ctf":       0,
    "hoonymode": 0,
    "blitz2v2":  0,
    "blitz4v4":  0,
    "2on2on2":   0,
    "3on3on3":   0,
    "4on4on4":   0,
    "XonX":      0,
    "wipeout":   0,
    "ca":        0,
    "tot":       0,
}

# The 8 KTX mutators per F5 / Pass 5.1 amendment + Pass 5.4.1.
# Mutator key -> activation_cvar (the cvar that enables the mutator).
# Source: world.c registration sites (recorded in source_xrefs at finalize).
MUTATORS: dict = {
    "lgc":        "k_lgcmode",      # world.c:1083  RegisterCvar
    "instagib":   "k_instagib",     # world.c:975   RegisterCvarEx
    "midair":     "k_midair",       # world.c:966   RegisterCvar
    "berzerk":    "k_bzk",          # world.c:930   RegisterCvar (k_bzk is the *enable*; k_berzerk is runtime state)
    "yawnmode":   "k_yawnmode",     # world.c:1011  RegisterCvar
    "killquad":   "k_killquad",     # world.c:969   RegisterCvarEx
    "freshteams": "k_freshteams",   # world.c:894   RegisterCvarEx (sub-flags captured via sub_flags_json)
    "nosweep":    "k_nosweep",      # world.c:909   RegisterCvarEx
}

# Mutator auto_reset_on_match per Pass 5.4.1 grid (LOCKED):
#   LGC, instagib, midair  -> auto-reset (cvar_set("X","0") at match-end sites)
#   berzerk, yawnmode, killquad, freshteams, nosweep -> persist
MUTATOR_AUTO_RESET: dict = {
    "lgc":        True,
    "instagib":   True,
    "midair":     True,
    "berzerk":    False,
    "yawnmode":   False,
    "killquad":   False,
    "freshteams": False,
    "nosweep":    False,
}

# Inverse activation-cvar -> mutator key. Used by both the world.c
# registration walker (record self._activation_cvar_refs) and the
# commands.c cvar_toggle_msg walker (map back to mutator key).
_ACTIVATION_CVAR_TO_MUTATOR: dict = {v: k for k, v in MUTATORS.items()}

# Mutator labels for the user_facing_label field. Operator-locked defaults
# in the seed YAML can override these, but the handler ships baseline
# values so output is non-NULL even with seed absent.
_MUTATOR_LABELS: dict = {
    "lgc":        "LGC Mode",
    "instagib":   "Instagib",
    "midair":     "Midair",
    "berzerk":    "Berzerk",
    "yawnmode":   "Yawnmode",
    "killquad":   "KillQuad",
    "freshteams": "FreshTeams",
    "nosweep":    "NoSweep",
}

# Activation cvars whose RegisterCvar / RegisterCvarEx call sites in
# world.c should be captured as source_refs. Includes the 8 mutators
# plus race + bloodfest.
_TRACKED_ACTIVATION_CVARS: frozenset = frozenset({
    "k_lgcmode", "k_instagib", "k_midair", "k_bzk",
    "k_yawnmode", "k_killquad", "k_freshteams", "k_nosweep",
    "k_race", "k_bloodfest",
})

# cmds[] toggle command name -> mutator key. Used by the commands.c
# cmds[] scan to seed _toggle_cmd_refs as the lower-authority fallback.
# The cvar_toggle_msg walker overwrites these with the more authoritative
# call-site location when one exists.
_CMDS_TOGGLE_TO_MUTATOR: dict = {
    "race":     "race",
    "killquad": "killquad",
    "midair":   "midair",
    "nosweep":  "nosweep",
    "instagib": "instagib",
    "berzerk":  "berzerk",
    "lgcmode":  "lgc",
    "totmode":  "tot",
    "fresh":    "freshteams",
    "yawnmode": "yawnmode",
}

# Mutator cvars whose cvar_set("X", "0") call sites in commands.c are
# auto-reset markers. Used by the auto-reset walker to populate
# self._auto_reset_call_sites for the 3 auto-reset mutators (lgc /
# instagib / midair). LGCMODE_VARIABLE resolves via self.file_macros.
_AUTO_RESET_CVARS: dict = {
    "k_lgcmode": "lgc",
    "k_instagib": "instagib",
    "k_midair":   "midair",
}


def _harvest_trailing_comment(source_bytes: bytes, after_offset: int) -> Optional[str]:
    """Walk source_bytes from after_offset forward to the next newline; if
    a `// ...` comment body appears on the same line (D12 convention),
    strip the leading `//` + whitespace and return the body. Comments on
    a separate line are not harvested. Returns None when no inline
    comment is present or on decode failure.
    """
    try:
        end = source_bytes.index(b"\n", after_offset)
    except ValueError:
        end = len(source_bytes)
    rest = source_bytes[after_offset:end].decode("utf-8", errors="replace")
    idx = rest.find("//")
    if idx < 0:
        return None
    body = rest[idx + 2:].strip()
    return body or None


def _split_kv(line: str) -> Optional[tuple]:
    """Split a cvar-init line on the first run of whitespace into
    (name, value). Returns None when name is empty or the line is
    all-whitespace. Empty string value is admitted (the source uses
    `k_noitems ""` to reset to default).
    """
    s = line.strip()
    if not s:
        return None
    parts = s.split(None, 1)
    if len(parts) == 0 or not parts[0]:
        return None
    name = parts[0]
    value = parts[1].strip() if len(parts) > 1 else ""
    # Strip surrounding double-quotes from the value (the source uses
    # `"\"\""` to express empty-string default).
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        value = value[1:-1]
    return (name, value)


def _strip_concat_string_literal(spelling: str) -> str:
    """Strip C string-literal quoting + a single trailing newline escape
    from a libclang LITERAL token spelling. The token form is `"...\\n"`
    where the backslash-n is a two-char escape (NOT a real newline). We
    strip the outer quotes, then strip a trailing `\\n` escape sequence
    if present, then strip surrounding whitespace defensively.
    """
    s = spelling.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        s = s[1:-1]
    # Strip a trailing two-char `\n` escape (not a real newline).
    if s.endswith("\\n"):
        s = s[:-2]
    return s.strip()


class KtxModesHandler(Visitor):
    """KTX modes handler -- 27 game_mode catalog rows + ~309 mode_default
    overlay rows.

    Cross-codebase port (D3) -- inherits from Visitor only. No parent-
    project subclass.

    F25 design: all cross-file state is emitted as typed pseudo-rows
    from end_file() so the driver merges them into all_rows. finalize()
    reads from the all_rows parameter, not from self. This makes the
    handler parallel-safe under multiprocessing.Pool fork-pool execution.
    """
    name = HANDLER_NAME
    output_filename = OUTPUT_FILENAME

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        """One-time init. Fires in the parent process pre-fork.

        Stores repo paths only. No cross-file accumulators on self --
        all cross-file state travels through end_file() pseudo-rows
        and is re-assembled in finalize() from all_rows.
        """
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._source_basename = source_path.name
        # Per-file dedup safeguard against cursor-traversal re-emission.
        self._seen_arrays_this_file: set = set()
        # Per-file row accumulator. Cleared and returned by end_file().
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        # Source-file allowlist. The driver hands us every src/*.c .
        if self._source_basename not in RELEVANT_FILES:
            return
        if self._source_basename == "commands.c":
            self._visit_commands_c(cursor)
        elif self._source_basename == "world.c":
            self._visit_world_c(cursor)
        elif self._source_basename == "race.c":
            self._visit_race_c(cursor)

    # ---- per-file dispatch -------------------------------------------------

    def _visit_commands_c(self, cursor) -> None:
        kind = cursor.kind

        if kind == CursorKind.VAR_DECL:
            spelling = cursor.spelling
            # Initstring arrays (the 17 _<mode>_um_init + common_um_init).
            if (spelling in _UM_ARRAY_TO_TOKEN
                    or spelling == "common_um_init"):
                if spelling in self._seen_arrays_this_file:
                    return
                self._seen_arrays_this_file.add(spelling)
                self._extract_um_init_array(cursor, spelling)
                return
            # um_list[] -- per-row source_ref + raw col-2 label.
            if spelling == "um_list":
                self._extract_um_list(cursor)
                return
            # cmds[] -- per-row toggle-command -> mutator-key fallback.
            if spelling == "cmds":
                self._extract_cmds_table(cursor)
                return
            return

        if kind == CursorKind.CALL_EXPR:
            call_spelling = cursor.spelling
            if call_spelling == "cvar_toggle_msg":
                self._extract_cvar_toggle_msg(cursor)
                return
            if call_spelling == "cvar_set":
                self._extract_cvar_set_zero(cursor)
                return

    def _visit_world_c(self, cursor) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in ("RegisterCvar", "RegisterCvarEx"):
            return
        args = list(cursor.get_arguments())
        if len(args) < 1:
            return
        cvar_name = literal_string(args[0], self.source_bytes)
        if cvar_name not in _TRACKED_ACTIVATION_CVARS:
            return
        loc = cursor.location
        if loc.file is None:
            return
        # Emit pseudo-row for this activation cvar registration site.
        # finalize() applies first-wins per cvar_name.
        self._rows.append({
            "_kind": "_meta_activation_cvar",
            "cvar_name": cvar_name,
            "source_ref": f"world.c:{loc.line}",
        })

    def _visit_race_c(self, cursor) -> None:
        kind = cursor.kind
        if kind == CursorKind.FUNCTION_DECL:
            if not cursor.is_definition():
                return
            spelling = cursor.spelling
            loc = cursor.location
            if loc.file is None:
                return
            if spelling == "ToggleRace":
                self._rows.append({
                    "_kind": "_meta_race_ref",
                    "ref_kind": "toggle",
                    "source_ref": f"race.c:{loc.line}",
                })
            elif spelling == "apply_race_settings":
                self._rows.append({
                    "_kind": "_meta_race_ref",
                    "ref_kind": "apply",
                    "source_ref": f"race.c:{loc.line}",
                })
            return
        if kind == CursorKind.VAR_DECL:
            if cursor.spelling == "race_settings":
                loc = cursor.location
                if loc.file is None:
                    return
                self._rows.append({
                    "_kind": "_meta_race_ref",
                    "ref_kind": "settings_decl",
                    "source_ref": f"race.c:{loc.line}",
                })

    # ---- commands.c specific extractors ------------------------------------

    def _extract_um_init_array(self, cursor, array_name: str) -> None:
        """Walk the post-`=` token stream of a const char[] declaration,
        emitting one _mode_default pseudo-row per parsed cvar-set line
        and one _meta_um_init_decl pseudo-row for the array's declaration
        line.

        Two token shapes are admitted:
          - LITERAL `"k_pow_pickup 0\\n"` (single token, parse the whole
            payload).
          - IDENTIFIER LITERAL pair (`LGCMODE_VARIABLE " 0\\n"`):
            identifier resolves via self.file_macros (Pattern 6 lift);
            macro body + literal payload concat to the full line.

        Source line per row is the LITERAL token's location.line --
        libclang tracks per-literal line numbers across the C-string
        concat sequence; this is the load-bearing primitive that makes
        per-line source_ref possible without manual byte re-tokenization.
        """
        loc = cursor.location
        if loc.file is None:
            return
        # Emit declaration-line pseudo-row for source_xrefs lookup in finalize.
        self._rows.append({
            "_kind": "_meta_um_init_decl",
            "array_name": array_name,
            "decl_line": loc.line,
        })

        # Mode token gate: "common" for common_um_init; user-facing token
        # for per-mode arrays via inverse lookup of UM_INIT_ARRAY_NAMES.
        if array_name == "common_um_init":
            mode_token = "common"
        else:
            mode_token = _UM_ARRAY_TO_TOKEN.get(array_name, "?")
        is_baseline = (array_name == "common_um_init")
        apply_order = 1 if is_baseline else 2

        # Walk tokens; skip until we see `=`; then collect literal
        # tokens (and IDENTIFIER+LITERAL pairs) until `;`.
        tokens = list(cursor.get_tokens())
        line_count = 0
        macros_resolved = 0
        macros_unresolved = 0
        in_init = False
        i = 0
        while i < len(tokens):
            tok = tokens[i]
            if not in_init:
                if tok.kind == TokenKind.PUNCTUATION and tok.spelling == "=":
                    in_init = True
                i += 1
                continue
            if tok.kind == TokenKind.PUNCTUATION and tok.spelling == ";":
                break

            # Macro-prefixed shape: IDENTIFIER followed by LITERAL.
            if tok.kind == TokenKind.IDENTIFIER:
                ident = tok.spelling
                ident_line = tok.location.line
                # Look ahead for the trailing literal.
                next_tok = tokens[i + 1] if i + 1 < len(tokens) else None
                if (next_tok is not None
                        and next_tok.kind == TokenKind.LITERAL
                        and next_tok.spelling.startswith('"')):
                    macro_body = self.file_macros.get(ident)
                    if macro_body is None:
                        # Macro lookup failed -- defensive marker for
                        # rot detection per Phase 7's F1 quality probe.
                        self._rows.append({
                            "_kind": "_meta_unresolved_macro_line",
                            "source_ref": f"commands.c:{ident_line}",
                            "identifier": ident,
                            "reason": "macro lookup failed",
                            "array": array_name,
                        })
                        macros_unresolved += 1
                        i += 2
                        continue
                    macros_resolved += 1
                    literal_payload = _strip_concat_string_literal(next_tok.spelling)
                    # _strip_concat_string_literal trims surrounding
                    # whitespace from the literal payload, which would
                    # otherwise eat the cvar-name/value field separator
                    # when concatenated against the macro body (e.g.
                    # macro_body="k_lgcmode" + payload="0" -> "k_lgcmode0").
                    # Inject a space so _split_kv finds the whitespace gap.
                    line_text = macro_body + " " + literal_payload
                    parsed = _split_kv(line_text)
                    if parsed is None:
                        self._rows.append({
                            "_kind": "_meta_skipped_line",
                            "source_ref": f"commands.c:{ident_line}",
                            "raw": line_text,
                            "reason": "kv split failed (macro+literal)",
                            "array": array_name,
                        })
                        i += 2
                        continue
                    name_val, value_val = parsed
                    # Trailing-comment harvest from after the literal token.
                    comment = _harvest_trailing_comment(
                        self.source_bytes,
                        next_tok.extent.end.offset,
                    )
                    self._rows.append(self._make_mode_default_row(
                        name=name_val,
                        value=value_val,
                        line_number=next_tok.location.line,
                        mode_token=mode_token,
                        is_baseline=is_baseline,
                        apply_order=apply_order,
                        array_name=array_name,
                        comment=comment,
                    ))
                    line_count += 1
                    i += 2
                    continue
                # Stray identifier (no following literal) -- skip but
                # log to stats for audit.
                self._rows.append({
                    "_kind": "_meta_skipped_line",
                    "source_ref": f"commands.c:{ident_line}",
                    "raw": ident,
                    "reason": "identifier without trailing literal",
                    "array": array_name,
                })
                i += 1
                continue

            # Pure literal shape.
            if tok.kind == TokenKind.LITERAL and tok.spelling.startswith('"'):
                line_text = _strip_concat_string_literal(tok.spelling)
                parsed = _split_kv(line_text)
                if parsed is None:
                    # All-whitespace or empty literal -- skipped per spec.
                    self._rows.append({
                        "_kind": "_meta_skipped_line",
                        "source_ref": f"commands.c:{tok.location.line}",
                        "raw": line_text,
                        "reason": "kv split failed (literal)",
                        "array": array_name,
                    })
                    i += 1
                    continue
                name_val, value_val = parsed
                comment = _harvest_trailing_comment(
                    self.source_bytes,
                    tok.extent.end.offset,
                )
                self._rows.append(self._make_mode_default_row(
                    name=name_val,
                    value=value_val,
                    line_number=tok.location.line,
                    mode_token=mode_token,
                    is_baseline=is_baseline,
                    apply_order=apply_order,
                    array_name=array_name,
                    comment=comment,
                ))
                line_count += 1
                i += 1
                continue

            i += 1

        # Emit per-array stats pseudo-row.
        self._rows.append({
            "_kind": "_meta_by_array_stat",
            "array_name": array_name,
            "line_count": line_count,
            "macros_resolved": macros_resolved,
            "macros_unresolved": macros_unresolved,
        })

    def _make_mode_default_row(
        self,
        *,
        name: str,
        value: str,
        line_number: int,
        mode_token: str,
        is_baseline: bool,
        apply_order: int,
        array_name: str,
        comment: Optional[str],
    ) -> dict:
        """Build one _mode_default pseudo-row. Numeric coercion: int(value)
        when value parses as a (possibly-negative) integer literal, else None.
        Floats are not coerced (the source uses bare ints in cvar_init
        lines almost exclusively; the few floats live as text)."""
        value_numeric: Optional[int] = None
        v = value.strip()
        if v and (v.lstrip("-").isdigit()):
            try:
                value_numeric = int(v)
            except ValueError:
                value_numeric = None
        return {
            "_kind": "_mode_default",
            "name": name,
            "kind": "mode_default",
            "value_text": value,
            "value_numeric": value_numeric,
            "source_ref": f"commands.c:{line_number}",
            "ruleset_gate_json": {"mode": mode_token},
            "props_json": {
                "comment": comment,
                "apply_order": apply_order,
                "initstring_array": array_name,
                "is_baseline": is_baseline,
            },
        }

    def _extract_um_list(self, cursor) -> None:
        """Walk um_list[] = { {<token>, <label>, <init_arr>, ...}, ... }.
        For each row, emit a _meta_um_list_row pseudo-row (source line) and
        a _meta_um_list_label_raw pseudo-row (raw col-2 label string)."""
        outer = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                outer = child
                break
        if outer is None:
            return
        for elem in outer.get_children():
            init = elem
            if elem.kind != CursorKind.INIT_LIST_EXPR:
                # Designated-init or wrapped expression; descend.
                for ch in elem.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        init = ch
                        break
            if init.kind != CursorKind.INIT_LIST_EXPR:
                continue
            fields = list(init.get_children())
            if len(fields) < 2:
                continue
            token = literal_string(fields[0], self.source_bytes)
            if not token or token not in UM_LIST_ENUMS:
                continue
            label_raw = literal_string(fields[1], self.source_bytes)
            row_line = init.location.line
            self._rows.append({
                "_kind": "_meta_um_list_row",
                "token": token,
                "source_ref": f"commands.c:{row_line}",
            })
            self._rows.append({
                "_kind": "_meta_um_list_label_raw",
                "token": token,
                "label_raw": label_raw,
            })

    def _extract_cmds_table(self, cursor) -> None:
        """Walk cmds[] for toggle-command rows; emit _meta_toggle_cmd
        pseudo-rows with priority=0 (cmds[] fallback). The cvar_toggle_msg
        walker emits priority=1 rows (authoritative). finalize() keeps the
        highest priority per mutator_key, first-wins within same priority."""
        outer = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                outer = child
                break
        if outer is None:
            return
        for elem in outer.get_children():
            init = elem
            if elem.kind != CursorKind.INIT_LIST_EXPR:
                for ch in elem.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        init = ch
                        break
            if init.kind != CursorKind.INIT_LIST_EXPR:
                continue
            fields = list(init.get_children())
            if len(fields) < 1:
                continue
            cmd_name = literal_string(fields[0], self.source_bytes)
            if not cmd_name:
                continue
            mutator_key = _CMDS_TOGGLE_TO_MUTATOR.get(cmd_name)
            if mutator_key is None:
                continue
            row_line = init.location.line
            self._rows.append({
                "_kind": "_meta_toggle_cmd",
                "mutator_key": mutator_key,
                "source_ref": f"commands.c:{row_line}",
                "priority": 0,
            })

    def _extract_cvar_toggle_msg(self, cursor) -> None:
        """Inspect arg[1] of cvar_toggle_msg(self, <cvar>, <label>):
        if it's a STRING_LITERAL whose value matches a tracked activation
        cvar, or a DECL_REF_EXPR pointing at LGCMODE_VARIABLE /
        TOT_MODE_VARIABLE (resolves via self.file_macros), emit a
        _meta_toggle_cmd pseudo-row with priority=1 (authoritative,
        overwrites the cmds[] fallback in finalize)."""
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        # Try literal first.
        cvar_name = literal_string(args[1], self.source_bytes)
        if not cvar_name:
            # Macro-identifier shape: read raw extent and consult
            # self.file_macros (Pattern 6 cross-header lift).
            raw = read_extent(self.source_bytes, args[1].extent).strip()
            if raw:
                cvar_name = self.file_macros.get(raw)
        if not cvar_name:
            return
        # Map cvar_name back to mutator key (or "tot" for k_tot_mode --
        # tot is a um_list peer, not a mutator, so no dispatch). The
        # MUTATORS table covers the 8 mutators + race via k_race.
        mutator_key = _ACTIVATION_CVAR_TO_MUTATOR.get(cvar_name)
        if mutator_key is None and cvar_name == "k_race":
            mutator_key = "race"
        if mutator_key is None:
            return
        loc = cursor.location
        if loc.file is None:
            return
        # priority=1: authoritative cvar_toggle_msg call site.
        self._rows.append({
            "_kind": "_meta_toggle_cmd",
            "mutator_key": mutator_key,
            "source_ref": f"commands.c:{loc.line}",
            "priority": 1,
        })

    def _extract_cvar_set_zero(self, cursor) -> None:
        """Match cvar_set(<cvar>, "0") calls in commands.c. arg[0] may be
        a STRING_LITERAL (e.g. "k_midair") or a DECL_REF_EXPR pointing at
        LGCMODE_VARIABLE (resolves via self.file_macros). When the cvar
        is one of the auto-reset markers (k_lgcmode / k_instagib /
        k_midair), emit a _meta_auto_reset pseudo-row for the mutator key."""
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        # arg[1] must be the literal "0".
        value = literal_string(args[1], self.source_bytes)
        if value != "0":
            return
        # arg[0]: literal or macro-identifier.
        cvar_name = literal_string(args[0], self.source_bytes)
        if not cvar_name:
            raw = read_extent(self.source_bytes, args[0].extent).strip()
            if raw:
                cvar_name = self.file_macros.get(raw)
        if not cvar_name:
            return
        mutator_key = _AUTO_RESET_CVARS.get(cvar_name)
        if mutator_key is None:
            return
        loc = cursor.location
        if loc.file is None:
            return
        self._rows.append({
            "_kind": "_meta_auto_reset",
            "mutator_key": mutator_key,
            "source_ref": f"commands.c:{loc.line}",
        })

    # ---- end_file + finalize -----------------------------------------------

    def end_file(self) -> list[dict]:
        """Return per-file pseudo-rows and real mode_default rows, then reset.

        All cross-file state travels through these rows into all_rows so
        finalize() can re-assemble it from the parameter rather than from
        self. This is the F25 fix: workers emit, parent assembles.
        """
        rows = self._rows
        self._rows = []
        self._seen_arrays_this_file = set()
        return rows

    def finalize(self, *, all_rows, repo_root: Path) -> dict:
        """Assemble and return the final modes payload.

        all_rows is the driver-merged collection of all rows returned by
        end_file() across all files. If the driver passes a dict keyed by
        handler name (test fixture shape), extract the relevant slice.

        Steps:
          1. Partition all_rows by _kind.
          2. Re-assemble cross-file ref dicts from pseudo-rows
             (first-wins / priority / append semantics per kind).
          3. Build catalog rows from module constants + re-assembled refs.
          4. Apply optional seed overrides.
          5. Dedup checks (catalog name uniqueness, overlay (name,mode) uniqueness).
          6. Return final payload dict.

        F25 design note: reads all_rows from the parameter, not from self,
        so parallel and serial extraction produce identical output.
        """
        # Defensive: handle both flat-list (driver shape) and dict (test
        # fixture shape). Mirrors gameplay_tables' finalize() pattern.
        if isinstance(all_rows, dict):
            rows: list[dict] = all_rows.get(self.name, [])
        else:
            rows = list(all_rows)

        # ---- partition pseudo-rows by _kind --------------------------------

        mode_default_rows: list[dict] = []

        # Cross-file ref dicts (first-wins semantics unless noted).
        activation_cvar_refs: dict[str, str] = {}     # cvar_name -> source_ref
        toggle_cmd_refs: dict[str, tuple[str, int]] = {}  # mutator_key -> (source_ref, priority)
        auto_reset_call_sites: dict[str, list[str]] = {}  # mutator_key -> [source_ref, ...]
        um_list_row_refs: dict[str, str] = {}          # token -> source_ref (first-wins)
        um_list_label_raw: dict[str, str] = {}         # token -> label_raw (first-non-None-wins)
        um_init_decl_lines: dict[str, int] = {}        # array_name -> decl_line (first-wins)
        race_refs: dict[str, str] = {}                 # ref_kind -> source_ref (first-wins)
        unresolved_macro_lines: list[dict] = []        # append-only
        skipped_lines: list[dict] = []                 # append-only
        by_array: dict[str, dict] = {}                 # array_name -> stats (first-wins)

        for r in rows:
            k = r.get("_kind")

            if k == "_mode_default":
                # Strip the internal _kind key before adding to the output list.
                mode_default_rows.append({
                    key: val for key, val in r.items() if key != "_kind"
                })

            elif k == "_meta_activation_cvar":
                cvar_name = r["cvar_name"]
                if cvar_name not in activation_cvar_refs:
                    activation_cvar_refs[cvar_name] = r["source_ref"]

            elif k == "_meta_toggle_cmd":
                mkey = r["mutator_key"]
                prio = r["priority"]
                existing = toggle_cmd_refs.get(mkey)
                if existing is None:
                    toggle_cmd_refs[mkey] = (r["source_ref"], prio)
                else:
                    # Keep highest priority; first-wins within same priority.
                    if prio > existing[1]:
                        toggle_cmd_refs[mkey] = (r["source_ref"], prio)

            elif k == "_meta_auto_reset":
                mkey = r["mutator_key"]
                ref = r["source_ref"]
                bucket = auto_reset_call_sites.setdefault(mkey, [])
                if ref not in bucket:
                    bucket.append(ref)

            elif k == "_meta_um_list_row":
                token = r["token"]
                if token not in um_list_row_refs:
                    um_list_row_refs[token] = r["source_ref"]

            elif k == "_meta_um_list_label_raw":
                token = r["token"]
                label_raw = r.get("label_raw")
                if token not in um_list_label_raw and label_raw is not None:
                    um_list_label_raw[token] = label_raw

            elif k == "_meta_um_init_decl":
                array_name = r["array_name"]
                if array_name not in um_init_decl_lines:
                    um_init_decl_lines[array_name] = r["decl_line"]

            elif k == "_meta_race_ref":
                ref_kind = r["ref_kind"]
                if ref_kind not in race_refs:
                    race_refs[ref_kind] = r["source_ref"]

            elif k == "_meta_unresolved_macro_line":
                unresolved_macro_lines.append({
                    key: val for key, val in r.items() if key != "_kind"
                })

            elif k == "_meta_skipped_line":
                skipped_lines.append({
                    key: val for key, val in r.items() if key != "_kind"
                })

            elif k == "_meta_by_array_stat":
                array_name = r["array_name"]
                if array_name not in by_array:
                    by_array[array_name] = {
                        "line_count":        r["line_count"],
                        "macros_resolved":   r["macros_resolved"],
                        "macros_unresolved": r["macros_unresolved"],
                    }

        # Flatten toggle_cmd_refs to source_ref only (drop the priority sentinel).
        toggle_cmd_ref_strs: dict[str, str] = {
            mkey: ref_prio[0] for mkey, ref_prio in toggle_cmd_refs.items()
        }

        # Race ref convenience aliases.
        race_toggle   = race_refs.get("toggle", "")
        race_apply    = race_refs.get("apply", "")
        race_settings = race_refs.get("settings_decl", "")

        # ---- build catalog rows ----------------------------------------

        catalog_um_rows: list[dict] = []
        catalog_extra_rows: list[dict] = []

        # 17 um_list peers (um_init_string | standalone).
        for token in UM_LIST_ENUMS:
            array_name = UM_INIT_ARRAY_NAMES[token]
            decl_line = um_init_decl_lines.get(array_name)
            initstring_ref = (
                f"commands.c:{decl_line}" if decl_line is not None else ""
            )
            row_ref   = um_list_row_refs.get(token, "")
            label_raw = um_list_label_raw.get(token, "")
            catalog_um_rows.append({
                "name": token,
                "kind": "game_mode",
                "value_text": UM_LIST_ENUMS[token],
                "source_ref": row_ref or "commands.c:?",
                "ruleset_gate_json": {},
                "props_json": {
                    "init_mechanism": "um_init_string",
                    "mode_class": "standalone",
                    "auto_reset_on_match": False,
                    "activation_cvar": None,
                    "initstring_ref": initstring_ref,
                    "init_function": None,
                    "team_structure": UM_LIST_TEAM_STRUCTURES[token],
                    "race_plrs_per_team": UM_LIST_RACE_PLRS[token],
                    "user_facing_label": UM_LIST_USER_FACING_LABELS[token],
                    "um_list_label_raw": label_raw,
                    "community_name": None,
                    "wiki_ref": None,
                    "game_type": UM_LIST_GAME_TYPES[token],
                    "playable_solo": False,
                    "auto_reset_call_sites": [],
                    "source_xrefs": [
                        ref for ref in (row_ref, initstring_ref) if ref
                    ],
                },
            })

        # race -- cvar_toggle_with_init_string | standalone
        race_act = activation_cvar_refs.get("k_race", "")
        race_cmd = toggle_cmd_ref_strs.get("race", "")
        catalog_extra_rows.append({
            "name": "race",
            "kind": "game_mode",
            "value_text": None,
            "source_ref": race_toggle,
            "ruleset_gate_json": {},
            "props_json": {
                "init_mechanism": "cvar_toggle_with_init_string",
                "mode_class": "standalone",
                "auto_reset_on_match": False,
                "activation_cvar": "k_race",
                "initstring_ref": race_settings,
                "init_function": "apply_race_settings",
                "team_structure": "UM_RACEMODE",
                "race_plrs_per_team": None,
                "user_facing_label": "Race",
                "community_name": None,
                "wiki_ref": None,
                "game_type": "Race",
                "playable_solo": True,
                "auto_reset_call_sites": [],
                "source_xrefs": [
                    ref for ref in (race_cmd, race_toggle, race_settings,
                                    race_apply, race_act) if ref
                ],
            },
        })

        # bloodfest -- cvar_toggle_only | standalone
        bf_act = activation_cvar_refs.get("k_bloodfest", "")
        catalog_extra_rows.append({
            "name": "bloodfest",
            "kind": "game_mode",
            "value_text": None,
            "source_ref": bf_act,
            "ruleset_gate_json": {},
            "props_json": {
                "init_mechanism": "cvar_toggle_only",
                "mode_class": "standalone",
                "auto_reset_on_match": False,
                "activation_cvar": "k_bloodfest",
                "initstring_ref": None,
                "init_function": None,
                "team_structure": None,
                "race_plrs_per_team": None,
                "user_facing_label": "Bloodfest",
                "community_name": None,
                "wiki_ref": None,
                "game_type": "Survival",
                "playable_solo": True,
                "auto_reset_call_sites": [],
                "source_xrefs": [
                    ref for ref in (bf_act, "sp_monsters.c:35-41") if ref
                ],
            },
        })

        # 8 mutators -- cvar_toggle_only | mutator
        for mutator_key, activation_cvar in MUTATORS.items():
            act_ref  = activation_cvar_refs.get(activation_cvar, "")
            cmd_ref  = toggle_cmd_ref_strs.get(mutator_key, "")
            auto_reset = MUTATOR_AUTO_RESET[mutator_key]
            sub_flags = None
            if mutator_key == "freshteams":
                sub_flags = [
                    "k_freshteams_limit_packs",
                    "k_freshteams_limit_sweep_ammo",
                    "k_freshteams_fast_ammo",
                    "k_freshteams_weapon_time",
                ]
            catalog_extra_rows.append({
                "name": mutator_key,
                "kind": "game_mode",
                "value_text": None,
                "source_ref": act_ref,
                "ruleset_gate_json": {},
                "props_json": {
                    "init_mechanism": "cvar_toggle_only",
                    "mode_class": "mutator",
                    "auto_reset_on_match": auto_reset,
                    "activation_cvar": activation_cvar,
                    "initstring_ref": None,
                    "init_function": None,
                    "team_structure": None,
                    "race_plrs_per_team": None,
                    "user_facing_label": _MUTATOR_LABELS.get(
                        mutator_key, mutator_key
                    ),
                    "community_name": None,
                    "wiki_ref": None,
                    "game_type": "Mutator",
                    "playable_solo": False,
                    "auto_reset_call_sites": (
                        auto_reset_call_sites.get(mutator_key, [])
                    ),
                    "sub_flags_json": sub_flags,
                    "source_xrefs": [
                        ref for ref in (cmd_ref, act_ref) if ref
                    ],
                },
            })

        # ---- optional seed-augmentation merge ------------------------------

        seed_count = self._apply_seed_overrides(
            repo_root, catalog_um_rows, catalog_extra_rows
        )

        # ---- dedup checks (load-bearing safety; raises on violation) -------

        # Catalog: name uniqueness (RuntimeError on duplicate -- preserves
        # original strict semantics).
        catalog_seen: set = set()
        for row in catalog_um_rows + catalog_extra_rows:
            n = row["name"]
            if n in catalog_seen:
                raise RuntimeError(
                    f"KtxModesHandler: duplicate catalog row name {n!r}; "
                    "the source-walk is producing more than one row per "
                    "mode -- investigate before shipping."
                )
            catalog_seen.add(n)

        # Overlay: (name, mode-gate) uniqueness (RuntimeError on duplicate).
        overlay_seen: set = set()
        for row in mode_default_rows:
            key = (row["name"], row["ruleset_gate_json"].get("mode"))
            if key in overlay_seen:
                raise RuntimeError(
                    f"KtxModesHandler: duplicate mode_default row "
                    f"{key!r}; one mode's overlay is registering the "
                    "same cvar twice -- investigate before shipping."
                )
            overlay_seen.add(key)

        return {
            "groups": {"game_mode": "catalog", "mode_default": "overlay"},
            "game_modes": catalog_um_rows + catalog_extra_rows,
            "mode_defaults": mode_default_rows,
            "_stats": {
                "catalog_count": (
                    len(catalog_um_rows) + len(catalog_extra_rows)
                ),
                "mode_default_count": len(mode_default_rows),
                "by_array": by_array,
                "unresolved_macro_lines": unresolved_macro_lines,
                "skipped_lines": skipped_lines,
                "auto_reset_call_sites_used": {
                    k: len(v) for k, v in auto_reset_call_sites.items()
                },
                "seed_augmentations_applied": seed_count,
            },
        }

    def _apply_seed_overrides(
        self,
        repo_root: Path,
        catalog_um_rows: list[dict],
        catalog_extra_rows: list[dict],
    ) -> int:
        """Read the optional modes-augment.yaml seed and overlay
        community_name / wiki_ref / user_facing_label / playable_solo
        onto matching catalog rows. Seed file is optional; absent file
        leaves handler defaults intact (return 0). Bad YAML raises so
        the run fails loudly rather than silently dropping seed data.

        Takes the two catalog lists as parameters (not self attributes)
        so this method works correctly in finalize() where the lists are
        local variables rather than instance state.
        """
        # The seed lives under apps/qw-oracle/scripts/extractors/ktx/
        # seeds/. The handler itself is at .../ktx/_handler_modes.py,
        # so HERE is .../ktx and seeds is HERE/seeds.
        seed_path = HERE / "seeds" / "modes-augment.yaml"
        if not seed_path.is_file():
            return 0
        try:
            import yaml  # type: ignore
        except ImportError:
            print(
                "KtxModesHandler: PyYAML not installed; skipping seed "
                "overrides. Install pyyaml to enable.",
                file=sys.stderr,
            )
            return 0
        try:
            data = yaml.safe_load(seed_path.read_text(encoding="utf-8"))
        except Exception as e:
            raise RuntimeError(
                f"KtxModesHandler: failed to parse {seed_path}: {e}"
            ) from e
        if not isinstance(data, dict):
            return 0
        modes_list = data.get("modes")
        if not isinstance(modes_list, list):
            return 0
        # Build catalog index by name for O(1) lookup.
        by_name: dict = {}
        for row in catalog_um_rows + catalog_extra_rows:
            by_name[row["name"]] = row
        applied = 0
        for entry in modes_list:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            row = by_name.get(name)
            if row is None:
                continue
            props = row["props_json"]
            touched = False
            for key in ("community_name", "wiki_ref", "user_facing_label"):
                if key in entry and entry[key] is not None:
                    props[key] = entry[key]
                    touched = True
            if "playable_solo" in entry and isinstance(entry["playable_solo"], bool):
                props["playable_solo"] = entry["playable_solo"]
                touched = True
            if touched:
                applied += 1
        return applied
