"""QC builtins handler for the MVDSV AST extractor.

Detects MVDSV's builtin-function-pointer tables and emits one row per entry.
Task 1 (notes-pass-1.md) verified the actual table layout; the plan spec's
assumed `pr2_builtin[]` does not exist. The three real tables are:

  std_builtins[]  src/pr_cmds.c:2682  -- 83 entries; index = builtin number;
                                          PF_Fixme fills unused slots
  ext_builtins[]  src/pr_cmds.c:2781  -- sparse {int num, builtin_t func}
                                          pairs; 24 entries at non-contiguous
                                          numbers
  ext_syscalls[]  src/pr2_cmds.c:70   -- {char *extname, ext_syscall_t fun};
                                          string-keyed PR2/QVM extension
                                          dispatch (qualitatively different);
                                          opportunistic capture only

Verified AST shape (libclang 18, MVDSV under server-base variant):
  std_builtins:
    VAR_DECL (type=builtin_t[83])
      INIT_LIST_EXPR (type=builtin_t[83])
        UNEXPOSED_EXPR (per entry, wraps function-ptr decay)
          DECL_REF_EXPR (the PF_* function reference)
  ext_builtins:
    VAR_DECL (type=struct {...}[24])
      INIT_LIST_EXPR
        INIT_LIST_EXPR (per entry, struct-init)
          INTEGER_LITERAL (the builtin number)
          UNEXPOSED_EXPR
            DECL_REF_EXPR (the PF_* function reference)
  ext_syscalls:
    VAR_DECL (type=struct {...}[N])
      INIT_LIST_EXPR
        INIT_LIST_EXPR (per entry)
          UNEXPOSED_EXPR (string init)
            STRING_LITERAL (extname)
          UNEXPOSED_EXPR (function-ptr init)
            DECL_REF_EXPR (the EXT_* function reference)

`resolve_fn_ref` (lifted to extractor_lib/_resolve.py during Phase D Task 9)
recursively walks an entry subtree for the first DECL_REF_EXPR -- robust to
the UNEXPOSED_EXPR wrappers libclang inserts for function-to-pointer decay.
Mirrors the same idiom in mvdsv/_handler_commands.py (now also calling the
shared helper).

Canonical entity name: parsed from the trailing comment (the QC-side
function name, e.g. `makevectors` from `void(entity e) makevectors = #1;`),
falling back to the C handler name with `PF_`/`PR2_`/`EXT_` prefix stripped.

Cross-variant dedup: pr_cmds.c is walked 3x (server-base/win/linux); same
table emits the same rows each time. Per-file dedup absorbs that. Cross-file
dedup in finalize is keyed on (table_name, builtin_index); both std and ext
builtins live in pr_cmds.c so this is largely defensive, but ext_syscalls
lives in pr2_cmds.c -- the (table_name, builtin_index) key keeps them
separate from the numbered tables.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._resolve import resolve_fn_ref  # noqa: E402


_PREFIX_STRIP_RE = re.compile(r"^(PF_|PR2_|EXT_)")

# The three target table names. VAR_DECL.spelling matches exactly; identifiers
# at file scope are unique so a name match is sufficient.
_BUILTIN_TABLES: frozenset = frozenset({
    "std_builtins", "ext_builtins", "ext_syscalls",
})


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
    if not extent or not extent.start or not extent.end:
        return ""
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _trailing_comment_at_line(source_bytes: bytes, line: int) -> Optional[str]:
    """Read a `// ...` or `/* ... */` trailing comment from `line` of
    source_bytes. Format examples (all observed in pr_cmds.c):

        PF_makevectors,	// void(entity e)	makevectors 		= #1;
        {60, PF_sin},			//float(float f) sin = #60;
        {231, PF_calltimeofday},// void() calltimeofday

    A comment is only counted if it comes AFTER the entry separator (`,`)
    so leading-of-line comments don't get attributed. We use FIRST comma
    (find, not rfind) because the QC signature inside the trailing comment
    can itself contain commas: `// void(entity e, vector o) setorigin = #2;`
    has commas inside the parameter list that come AFTER the entry-
    terminating comma. rfind would land on the inner one and the // marker
    would be invisible.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if line - 1 < 0 or line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    # Anchor to the FIRST comma so the QC signature's parameter-list commas
    # (which appear inside the `//` block) don't fool the search.
    sep_idx = raw.find(",")
    tail = raw[sep_idx + 1:] if sep_idx >= 0 else raw
    idx = tail.find("//")
    if idx >= 0:
        return tail[idx + 2:].strip() or None
    bidx = tail.find("/*")
    if bidx >= 0:
        e = tail.find("*/", bidx + 2)
        if e >= 0:
            return tail[bidx + 2:e].strip() or None
    return None


def _qc_name_from_comment(comment: Optional[str]) -> Optional[str]:
    """Pull the QC function name from a comment of the form

        void(vector ang) makevectors = #1
        float(float f) sin = #60
        void() calltimeofday
        float(string model) precache_vwep_model = #532

    Two regex shapes cover both `= #N` and bare-identifier forms.
    """
    if not comment:
        return None
    m = re.search(r"\)\s+(\w+)\s*=", comment)
    if m:
        return m.group(1)
    m = re.search(r"\)\s+(\w+)\s*$", comment)
    if m:
        return m.group(1)
    return None


# `_resolve_fn_ref` was lifted to `extractor_lib/_resolve.py` (Phase D Task 9).
# This handler's prior local copy was the canonical one (permissive: falls back
# to the cursor's own spelling on unresolved decls); commands.py adopted the
# same policy as part of the unification.


def _resolve_string_literal(arg_cursor, source_bytes: bytes) -> Optional[str]:
    """Walk arg subtree for the first STRING_LITERAL and return its decoded
    contents (without surrounding quotes). Used for ext_syscalls' extname
    field which is wrapped in UNEXPOSED_EXPR(char *) decay.
    """
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.STRING_LITERAL:
            text = _read_extent(source_bytes, n.extent).strip()
            if text.startswith('"') and text.endswith('"'):
                return text[1:-1] or None
        stack.extend(list(n.get_children()))
    return None


def _resolve_integer_literal(arg_cursor, source_bytes: bytes) -> Optional[int]:
    """Walk arg subtree for the first INTEGER_LITERAL and return its int
    value. The token text is read from the source extent (libclang's
    get_tokens() of an INTEGER_LITERAL is reliable but extent reading is
    consistent with the rest of the handler).

    Forward-looking: parsing uses ``int(text, 0)`` so any C integer literal
    form (decimal, ``0x1F`` hex, ``0o17`` octal, ``0b11111`` binary, plus
    the C-style ``017`` octal prefix) is auto-detected from the prefix.
    Bare integers without a prefix still parse as decimal. No MVDSV entry
    uses hex/octal/binary today; this is insurance against future revisions.
    """
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.INTEGER_LITERAL:
            text = _read_extent(source_bytes, n.extent).strip().rstrip(",")
            try:
                return int(text, 0)
            except ValueError:
                return None
        stack.extend(list(n.get_children()))
    return None


def _assert_not_designated_init(entry) -> None:
    """Raise AssertionError if `entry` looks like a designated-initializer.

    libclang exposes ``[5] = PF_foo`` as a child whose token stream begins
    with ``[ INT_LITERAL ] =``. Positional init (e.g. ``PF_foo,`` or
    ``{60, PF_sin},``) never has an ``=`` among its first 4 tokens. We
    scan only the head of the token stream so the check is cheap and
    cannot trigger on an unrelated ``=`` deep in a struct sub-init.
    """
    try:
        tokens = list(entry.get_tokens())
    except Exception:
        return
    head = tokens[:4]
    for tok in head:
        if tok.spelling == "=":
            file_name = (
                entry.location.file.name if entry.location.file else "?"
            )
            raise AssertionError(
                f"std_builtins designated initializer at "
                f"{file_name}:{entry.location.line} -- handler assumes "
                f"positional init"
            )


class QcBuiltinsMvdsvHandler(Visitor):
    name = "qc_builtins"
    output_filename = "mvdsv-qc-builtins-ast.json"
    payload_field = "qc_builtins"

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup: the same (table, index) gets visited 3x because
        # the walker dispatches once per platform variant. Same idiom as
        # the cvars/commands/info_keys handlers.
        self._seen_in_file: set[tuple[str, int]] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.VAR_DECL:
            return
        name = cursor.spelling
        if name not in _BUILTIN_TABLES:
            return
        # Find the INIT_LIST_EXPR child (the array initializer).
        init_list = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                init_list = child
                break
        if init_list is None:
            return

        if name == "std_builtins":
            self._extract_std_builtins(init_list)
        elif name == "ext_builtins":
            self._extract_ext_builtins(init_list)
        elif name == "ext_syscalls":
            self._extract_ext_syscalls(init_list)

    def _extract_std_builtins(self, init_list) -> None:
        """std_builtins[] -- index = position in the array (the QC builtin
        number). PF_Fixme entries (placeholder slots) are skipped.

        Defensive guard against designated-initializer syntax. The current
        contract is positional init (entry N at array position N). A future
        MVDSV revision could switch to ``[5] = PF_foo`` form which would
        silently desynchronize positional indices from real builtin numbers.
        We scan each entry's tokens for an early ``=`` -- positional init
        never produces one inside an entry; designated init always does
        (between the bracketed designator and the value). Loud failure
        beats silent index drift.
        """
        for index, entry in enumerate(init_list.get_children()):
            _assert_not_designated_init(entry)
            handler_fn = resolve_fn_ref(entry)
            if not handler_fn:
                continue
            if handler_fn == "PF_Fixme":
                continue
            self._emit_row(
                table_name="std_builtins",
                builtin_index=index,
                handler_fn=handler_fn,
                location=entry.location,
            )

    def _extract_ext_builtins(self, init_list) -> None:
        """ext_builtins[] -- each entry is a struct-init {int num, func ptr}.
        Index comes from the INTEGER_LITERAL sub-element, not the position
        in the array (entries are sparse and non-contiguous)."""
        for entry in init_list.get_children():
            if entry.kind != CursorKind.INIT_LIST_EXPR:
                continue
            sub = list(entry.get_children())
            if len(sub) < 2:
                continue
            builtin_index = _resolve_integer_literal(sub[0], self.source_bytes)
            if builtin_index is None:
                continue
            handler_fn = resolve_fn_ref(sub[1])
            if not handler_fn or handler_fn == "PF_Fixme":
                continue
            self._emit_row(
                table_name="ext_builtins",
                builtin_index=builtin_index,
                handler_fn=handler_fn,
                location=entry.location,
            )

    def _extract_ext_syscalls(self, init_list) -> None:
        """ext_syscalls[] -- string-keyed extension dispatch. Index is the
        position in the array (synthetic 0-based; the real key is the
        extname string). The QC-side name is the string literal itself,
        not the trailing comment (these entries don't have one).
        """
        for index, entry in enumerate(init_list.get_children()):
            if entry.kind != CursorKind.INIT_LIST_EXPR:
                continue
            sub = list(entry.get_children())
            if len(sub) < 2:
                continue
            extname = _resolve_string_literal(sub[0], self.source_bytes)
            if not extname:
                continue
            handler_fn = resolve_fn_ref(sub[1])
            if not handler_fn:
                continue
            self._emit_row(
                table_name="ext_syscalls",
                builtin_index=index,
                handler_fn=handler_fn,
                location=entry.location,
                qc_name_override=extname,
            )

    def _emit_row(
        self,
        *,
        table_name: str,
        builtin_index: int,
        handler_fn: str,
        location,
        qc_name_override: Optional[str] = None,
    ) -> None:
        key = (table_name, builtin_index)
        if key in self._seen_in_file:
            return
        self._seen_in_file.add(key)

        trailing = _trailing_comment_at_line(self.source_bytes, location.line)
        if qc_name_override:
            qc_name = qc_name_override
            qc_signature = trailing  # may be None for ext_syscalls
        else:
            qc_name = (
                _qc_name_from_comment(trailing)
                or _PREFIX_STRIP_RE.sub("", handler_fn)
            )
            qc_signature = trailing

        rel_file = self._relative_source(location.file.name) if location.file else None
        self._rows.append({
            "name": qc_name,
            "ast": {
                "table_name": table_name,
                "builtin_index": builtin_index,
                "handler_fn": handler_fn,
                "qc_signature": qc_signature,
                "source_file": rel_file,
                "source_line": location.line,
                "trailing_comment": trailing,
            },
        })

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file / cross-worker dedup: the same (table_name, builtin_index)
        # pair can be emitted from different .c files only via the variant
        # axis. Per-file dedup already collapsed within one walk; this
        # collapses across files / workers. First-wins.
        seen: set[tuple[str, int]] = set()
        unique: list[dict] = []
        for r in all_rows:
            key = (r["ast"]["table_name"], r["ast"]["builtin_index"])
            if key in seen:
                continue
            seen.add(key)
            unique.append(r)
        unique.sort(key=lambda r: (r["ast"]["table_name"], r["ast"]["builtin_index"]))

        by_table: dict[str, int] = {}
        for r in unique:
            t = r["ast"]["table_name"]
            by_table[t] = by_table.get(t, 0) + 1

        return {
            "qc_builtins": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_table": by_table,
                "with_qc_signature": sum(
                    1 for r in unique if r["ast"].get("qc_signature")
                ),
            },
        }
