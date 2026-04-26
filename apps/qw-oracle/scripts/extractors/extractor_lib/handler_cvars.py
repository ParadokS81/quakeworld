"""Cvars handler (Visitor protocol).

Both TU walks (client + server) feed the same visitor:
  - VAR_DECL of cvar_t: client sees first, server fills stragglers as
    "(server-build)".
  - CALL_EXPR to Cvar_SetCurrentGroup/Cvar_ResetCurrentGroup/Cvar_Register/
    HUD_Register: collected only on client. Sorted by source offset and
    processed in order in end_file() to track current_group state.

Post-phase passes (trailing-comment + scan_default_call_sites) stay in
finalize(), same as the process_file version.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind, StorageClass

from ._visitor import Visitor


_FLAG_NAME_RE = re.compile(r"\bCVAR_[A-Z0-9_]+\b")
_CVAR_DEFAULT_CALL_RE = re.compile(r"Cvar_(SetDefaultAndValue|ResetVar)\s*\(\s*&?(\w+)")
_HUD_GROUP_NAME = "MQWCL HUD"
_GROUP_CALL_NAMES = ("Cvar_SetCurrentGroup", "Cvar_ResetCurrentGroup", "Cvar_Register", "HUD_Register")


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    return s


def _read_extent(source_bytes: bytes, extent) -> str:
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _parse_flag_names(raw: str) -> list[str]:
    return list(dict.fromkeys(_FLAG_NAME_RE.findall(raw)))


def _resolve_var_ref(cursor) -> Optional[str]:
    stack = [cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    text = _read_extent(source_bytes, arg_cursor.extent).strip()
    if not (text.startswith('"') or text.startswith('L"')):
        return None
    parts: list[str] = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i].isspace():
            i += 1
        if i < len(text) and text[i] == "L":
            i += 1
        if i < len(text) and text[i] == '"':
            i += 1
            buf = []
            while i < len(text):
                c = text[i]
                if c == "\\" and i + 1 < len(text):
                    buf.append(text[i + 1])
                    i += 2
                    continue
                if c == '"':
                    i += 1
                    break
                buf.append(c)
                i += 1
            parts.append("".join(buf))
        else:
            break
    return "".join(parts) if parts else None


def _literal_or_raw(arg_cursor, source_bytes: bytes) -> Optional[str]:
    s = _literal_string(arg_cursor, source_bytes)
    if s is not None:
        return s
    raw = _read_extent(source_bytes, arg_cursor.extent).strip()
    if not raw or raw == "NULL":
        return None
    return raw


def _storage_str(storage_class) -> str:
    return {
        StorageClass.STATIC: "static",
        StorageClass.EXTERN: "extern",
        StorageClass.NONE: "none",
    }.get(storage_class, str(storage_class))


def _infer_type(default_value: str) -> str:
    if default_value in ("0", "1"):
        return "boolean"
    if re.fullmatch(r"-?\d+", default_value):
        return "integer"
    if re.fullmatch(r"-?\d+\.\d+", default_value):
        return "float"
    return "string"


def _extract_cvar_decl(node, source_bytes: bytes) -> Optional[dict]:
    init_list = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            init_list = c
            break
    if init_list is None:
        return None
    fields = list(init_list.get_children())
    if len(fields) < 2:
        return None
    name_raw = _read_extent(source_bytes, fields[0].extent).strip()
    default_raw = _read_extent(source_bytes, fields[1].extent).strip()
    name = _strip_quotes(name_raw)
    default = _strip_quotes(default_raw)
    flags_raw: Optional[str] = None
    flag_names: list[str] = []
    if len(fields) >= 3:
        flags_raw = _read_extent(source_bytes, fields[2].extent).strip()
        flag_names = _parse_flag_names(flags_raw)
    on_change: Optional[str] = None
    if len(fields) >= 4:
        ref = fields[3].referenced
        if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
            on_change = ref.spelling
        else:
            on_change = _read_extent(source_bytes, fields[3].extent).strip() or None
    return {
        "cvar_name": name,
        "c_ident": node.spelling,
        "default_value": default,
        "source_file": Path(node.location.file.name).name,
        "source_line": node.location.line,
        "source_column": node.location.column,
        "storage_class": _storage_str(node.storage_class),
        "flags_raw": flags_raw,
        "flag_names": flag_names,
        "on_change": on_change,
        "group_name": None,
        "min_bound": None,
        "max_bound": None,
        "trailing_comment": None,
    }


# Container struct-types whose elements hold nested cvar_t struct-literals at
# known field indices. r_aliasmodel.c declares
#   static custom_model_color_t custom_model_colors[] = {
#     { { "gl_custom_lg_color", "", CVAR_COLOR }, { "gl_custom_lg_fullbright", "1" }, ... },
#     ...
#   };
# and registers each nested cvar via
#   for (i=...) { Cvar_Register(&custom_model_colors[i].color_cvar);
#                 Cvar_Register(&custom_model_colors[i].fullbright_cvar); }
# Scalar + cvar_t[] patterns don't match; walk the array directly.
_NESTED_CVAR_TABLE_TYPES: dict[str, list[int]] = {
    "custom_model_color_t": [0, 1],
}


def _strip_array_and_qualifiers(tspell: str) -> str:
    s = tspell.split("[", 1)[0].strip()
    for q in ("const ", "static "):
        if s.startswith(q):
            s = s[len(q):].strip()
    return s


def _extract_nested_cvar_table(node, source_bytes: bytes) -> list[dict]:
    base = _strip_array_and_qualifiers(node.type.spelling)
    indices = _NESTED_CVAR_TABLE_TYPES.get(base)
    if indices is None:
        return []
    outer_init = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            outer_init = c
            break
    if outer_init is None:
        return []
    out: list[dict] = []
    file_name = Path(node.location.file.name).name if node.location.file else ""
    storage = _storage_str(node.storage_class)
    for outer_idx, outer_elem in enumerate(outer_init.get_children()):
        elem_init = outer_elem
        if outer_elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in outer_elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    elem_init = ch
                    break
        if elem_init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        elem_fields = list(elem_init.get_children())
        for cvar_idx in indices:
            if cvar_idx >= len(elem_fields):
                continue
            cvar_init = elem_fields[cvar_idx]
            if cvar_init.kind != CursorKind.INIT_LIST_EXPR:
                wrapped = None
                for ch in cvar_init.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        wrapped = ch
                        break
                if wrapped is None:
                    continue
                cvar_init = wrapped
            inner = list(cvar_init.get_children())
            if len(inner) < 2:
                continue
            name = _strip_quotes(_read_extent(source_bytes, inner[0].extent).strip())
            if not name:
                # Empty-name slot = unused placeholder (e.g. rlpack has no
                # fullbright cvar — element init literal is {"", "0"}).
                continue
            default = _strip_quotes(_read_extent(source_bytes, inner[1].extent).strip())
            flags_raw: Optional[str] = None
            flag_names: list[str] = []
            if len(inner) >= 3:
                flags_raw = _read_extent(source_bytes, inner[2].extent).strip()
                flag_names = _parse_flag_names(flags_raw)
            on_change: Optional[str] = None
            if len(inner) >= 4:
                ref = inner[3].referenced
                if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                    on_change = ref.spelling
            out.append({
                "cvar_name": name,
                "c_ident": f"{node.spelling}[{outer_idx}].<field{cvar_idx}>",
                "default_value": default,
                "source_file": file_name,
                "source_line": cvar_init.location.line,
                "source_column": cvar_init.location.column,
                "storage_class": storage,
                "flags_raw": flags_raw,
                "flag_names": flag_names,
                "on_change": on_change,
                "group_name": None,
                "min_bound": None,
                "max_bound": None,
                "trailing_comment": None,
            })
    return out


def _extract_cvar_array(node, source_bytes: bytes) -> list[dict]:
    outer_init = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            outer_init = c
            break
    if outer_init is None:
        return []
    out: list[dict] = []
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for i, elem in enumerate(outer_init.get_children()):
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
        name = _strip_quotes(_read_extent(source_bytes, fields[0].extent).strip())
        if not name:
            continue
        default = ""
        if len(fields) >= 2:
            default = _strip_quotes(_read_extent(source_bytes, fields[1].extent).strip())
        flags_raw: Optional[str] = None
        flag_names: list[str] = []
        if len(fields) >= 3:
            flags_raw = _read_extent(source_bytes, fields[2].extent).strip()
            flag_names = _parse_flag_names(flags_raw)
        on_change: Optional[str] = None
        if len(fields) >= 4:
            ref = fields[3].referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                on_change = ref.spelling
            else:
                on_change = _read_extent(source_bytes, fields[3].extent).strip() or None
        out.append({
            "cvar_name": name,
            "c_ident": f"{node.spelling}[{i}]",
            "default_value": default,
            "source_file": file_name,
            "source_line": init.location.line,
            "source_column": init.location.column,
            "storage_class": _storage_str(node.storage_class),
            "flags_raw": flags_raw,
            "flag_names": flag_names,
            "on_change": on_change,
            "group_name": None,
            "min_bound": None,
            "max_bound": None,
            "trailing_comment": None,
        })
    return out


def _synthesize_hud_cvars(call_cursor, args, source_bytes: bytes, file_name: str) -> list[dict]:
    if len(args) < 16:
        return []
    name = _literal_string(args[0], source_bytes)
    if not name or not re.fullmatch(r"[a-z][a-z0-9_]*", name):
        return []
    show = _literal_or_raw(args[7], source_bytes)
    place = _literal_or_raw(args[8], source_bytes)
    align_x = _literal_or_raw(args[9], source_bytes)
    align_y = _literal_or_raw(args[10], source_bytes)
    pos_x = _literal_or_raw(args[11], source_bytes)
    pos_y = _literal_or_raw(args[12], source_bytes)
    frame = _literal_or_raw(args[13], source_bytes)
    frame_color = _literal_or_raw(args[14], source_bytes)
    item_opacity = _literal_or_raw(args[15], source_bytes)
    line = call_cursor.location.line
    col = call_cursor.location.column

    def mk(suffix: str, default: str) -> dict:
        return {
            "cvar_name": f"hud_{name}_{suffix}",
            "c_ident": f"hud_{name}_{suffix}",
            "default_value": default,
            "source_file": file_name,
            "source_line": line,
            "source_column": col,
            "storage_class": "generated",
            "flags_raw": None,
            "flag_names": [],
            "on_change": None,
            "group_name": _HUD_GROUP_NAME,
            "min_bound": None,
            "max_bound": None,
            "trailing_comment": None,
        }

    out: list[dict] = [mk("order", "0"), mk("draw", "1")]
    if place is not None:
        out.append(mk("place", place))
    if show is not None:
        out.append(mk("show", show))
    if pos_x is not None and align_x is not None:
        out.append(mk("pos_x", pos_x))
        out.append(mk("align_x", align_x))
    if pos_y is not None and align_y is not None:
        out.append(mk("pos_y", pos_y))
        out.append(mk("align_y", align_y))
    if frame is not None:
        out.append(mk("frame", frame))
        out.append(mk("frame_color", frame_color if frame_color is not None else "0 0 0"))
    out.append(mk("item_opacity", item_opacity if item_opacity is not None else "1"))
    i = 16
    while i + 1 < len(args):
        suffix = _literal_string(args[i], source_bytes)
        if suffix is None:
            break
        default = _literal_or_raw(args[i + 1], source_bytes)
        if default is None:
            break
        out.append(mk(suffix, default))
        i += 2
    return out


class CvarsHandler(Visitor):
    name = "cvars"
    output_filename = "ezquake-variables-ast.json"

    def __init__(self):
        self._group_defs: dict[str, str] = {}

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        groups_h = ezq_src / "cvar_groups.h"
        if not groups_h.is_file():
            self._group_defs = {}
            return
        src = groups_h.read_text(encoding="utf-8", errors="replace")
        out: dict[str, str] = {}
        for m in re.finditer(r'#define\s+(CVAR_GROUP_\w+)\s+"([^"]+)"', src):
            out[m.group(1)] = m.group(2)
        self._group_defs = out

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._source_file_name = source_path.name
        self._cvars_by_ident: dict[str, dict] = {}
        self._cvars_unnamed: list[dict] = []
        self._seen_names: set[str] = set()
        # Calls of interest on client TU only. Stored as
        # (offset, name, args_list, cursor). args are eagerly materialized
        # because the cursor's get_arguments() generator may not be re-usable.
        self._calls: list[tuple] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind
        if kind == CursorKind.VAR_DECL:
            tspell = cursor.type.spelling
            is_cvar_scalar = bool(re.fullmatch(r"(?:const\s+)?cvar_t", tspell))
            is_cvar_array = bool(re.fullmatch(r"(?:const\s+)?cvar_t\s*\[\d*\]", tspell))
            is_nested_table = _strip_array_and_qualifiers(tspell) in _NESTED_CVAR_TABLE_TYPES
            if is_nested_table:
                for elem in _extract_nested_cvar_table(cursor, self.source_bytes):
                    if elem["cvar_name"] in self._seen_names:
                        continue
                    if variant != "client":
                        elem["storage_class"] = f"{elem['storage_class']} (server-build)"
                    self._cvars_unnamed.append(elem)
                    self._seen_names.add(elem["cvar_name"])
                return
            if not (is_cvar_scalar or is_cvar_array):
                return
            if variant == "client":
                if is_cvar_scalar:
                    extracted = _extract_cvar_decl(cursor, self.source_bytes)
                    if extracted is not None:
                        self._cvars_by_ident[extracted["c_ident"]] = extracted
                        self._seen_names.add(extracted["cvar_name"])
                else:
                    for elem in _extract_cvar_array(cursor, self.source_bytes):
                        self._cvars_unnamed.append(elem)
                        self._seen_names.add(elem["cvar_name"])
            else:
                # server variant: fill stragglers, tag storage_class.
                if is_cvar_scalar:
                    extracted = _extract_cvar_decl(cursor, self.source_bytes)
                    if extracted is not None and extracted["cvar_name"] not in self._seen_names:
                        extracted["storage_class"] = f"{extracted['storage_class']} (server-build)"
                        self._cvars_by_ident[extracted["c_ident"]] = extracted
                        self._seen_names.add(extracted["cvar_name"])
                else:
                    for elem in _extract_cvar_array(cursor, self.source_bytes):
                        if elem["cvar_name"] not in self._seen_names:
                            elem["storage_class"] = f"{elem['storage_class']} (server-build)"
                            self._cvars_unnamed.append(elem)
                            self._seen_names.add(elem["cvar_name"])
            return
        # Calls: client TU only.
        if kind == CursorKind.CALL_EXPR and variant == "client":
            sp = cursor.spelling
            if sp in _GROUP_CALL_NAMES:
                args = list(cursor.get_arguments())
                self._calls.append((cursor.location.offset, sp, args, cursor))

    def end_file(self) -> list[dict]:
        # Sort calls by source offset for deterministic group-tracking flow.
        self._calls.sort(key=lambda t: t[0])
        current_group: Optional[str] = None
        hud_cvars: list[dict] = []
        for _, nm, args, call_cursor in self._calls:
            if nm == "Cvar_SetCurrentGroup":
                if args:
                    tok = _read_extent(self.source_bytes, args[0].extent).strip()
                    current_group = self._group_defs.get(tok)
            elif nm == "Cvar_ResetCurrentGroup":
                current_group = None
            elif nm == "Cvar_Register" and current_group:
                if args:
                    ref_ident = _resolve_var_ref(args[0])
                    if ref_ident and ref_ident in self._cvars_by_ident:
                        if self._cvars_by_ident[ref_ident]["group_name"] is None:
                            self._cvars_by_ident[ref_ident]["group_name"] = current_group
            elif nm == "HUD_Register":
                hud_cvars.extend(_synthesize_hud_cvars(call_cursor, args, self.source_bytes, self._source_file_name))

        rows = list(self._cvars_by_ident.values()) + self._cvars_unnamed + hud_cvars
        self._cvars_by_ident = {}
        self._cvars_unnamed = []
        self._seen_names = set()
        self._calls = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        deduped: dict[str, dict] = {}
        for cv in all_rows:
            deduped[cv["cvar_name"]] = cv
        unique_cvars = list(deduped.values())

        ezq_src = (repo_root / "src") if (repo_root / "src").is_dir() and any((repo_root / "src").glob("*.c")) else repo_root
        _attach_trailing_comments(unique_cvars, ezq_src)

        help_json_path = repo_root / "help_variables.json"
        help_data = json.loads(help_json_path.read_text(encoding="utf-8"))
        group_name_to_id = {g["name"]: g["id"] for g in help_data.get("groups", [])}
        help_groups = help_data.get("groups", [])
        help_vars: dict = help_data.get("vars", {})

        vars_out: dict[str, dict] = {}
        source_names: set[str] = set()
        # Static estimates from Pass 1 runtime-validation diff (2026-04-26).
        # Not computed dynamically -- derived from operator-driven runtime runs.
        # Update after each new runtime-validation pass.
        out_of_scope_estimate = {
            "bucket1_plugin_unvisited": 0,
            "bucket2_dynamic_registration": 4,
            "bucket3_runtime_synthesized": 5,
            "bucket4_sdk_blocked": 0,
            "last_validated_against_runtime": "2026-04-26",
        }
        stats = {
            "source_total": len(all_rows),
            "client": 0,
            "server_only": 0,
            "with_flags": 0,
            "with_onchange": 0,
            "with_bounds": 0,
            "with_group": 0,
            "with_help_desc": 0,
            "flag_histogram": {},
            "_out_of_scope_estimate": out_of_scope_estimate,
        }

        for cv in unique_cvars:
            source_names.add(cv["cvar_name"])
            help_entry = help_vars.get(cv["cvar_name"], {})
            group_id: Optional[str] = None
            if cv["group_name"]:
                group_id = group_name_to_id.get(cv["group_name"])
            if group_id is None and help_entry.get("group-id"):
                helpg = next((g for g in help_groups if g["id"] == help_entry["group-id"]), None)
                if helpg is not None and helpg.get("major-group") != "Obsolete":
                    group_id = help_entry["group-id"]
            if group_id is None:
                if "sv_" == cv["source_file"][:3]:
                    group_id = group_name_to_id.get("Server Settings", "0")
                else:
                    group_id = "0"
            ctype = help_entry.get("type") or _infer_type(cv["default_value"])
            is_server = cv["source_file"].startswith("sv_")
            entry: dict = {
                "type": ctype,
                "group-id": group_id,
                "default": cv["default_value"],
                "server-only": is_server,
                "ast": {
                    "c_ident": cv["c_ident"],
                    "source_file": cv["source_file"],
                    "source_line": cv["source_line"],
                    "source_column": cv["source_column"],
                    "storage_class": cv["storage_class"],
                    "flags_raw": cv["flags_raw"],
                    "flag_names": cv["flag_names"],
                    "on_change": cv["on_change"],
                    "group_name_in_source": cv["group_name"],
                    "min_bound": cv["min_bound"],
                    "max_bound": cv["max_bound"],
                    "trailing_comment": cv["trailing_comment"],
                },
            }
            if help_entry.get("desc"):
                entry["desc"] = help_entry["desc"]
                stats["with_help_desc"] += 1
            if help_entry.get("remarks"):
                entry["remarks"] = help_entry["remarks"]
            if help_entry.get("values"):
                entry["values"] = help_entry["values"]
            if is_server:
                stats["server_only"] += 1
            else:
                stats["client"] += 1
            if cv["flag_names"]:
                stats["with_flags"] += 1
                for fn in cv["flag_names"]:
                    stats["flag_histogram"][fn] = stats["flag_histogram"].get(fn, 0) + 1
            if cv["on_change"]:
                stats["with_onchange"] += 1
            if cv["min_bound"] is not None:
                stats["with_bounds"] += 1
            if cv["group_name"]:
                stats["with_group"] += 1
            vars_out[cv["cvar_name"]] = entry

        help_only = 0
        seen_help_names: set[str] = set()
        for raw_name, hv in help_vars.items():
            name = raw_name.strip()
            if not name:
                continue
            if name in source_names or name in vars_out or name in seen_help_names:
                continue
            seen_help_names.add(name)
            help_only += 1
            entry = {
                "type": hv.get("type", "string"),
                "group-id": hv.get("group-id", "0"),
            }
            if hv.get("default") is not None:
                entry["default"] = hv["default"]
            if hv.get("desc"):
                entry["desc"] = hv["desc"]
            if hv.get("remarks"):
                entry["remarks"] = hv["remarks"]
            if hv.get("values"):
                entry["values"] = hv["values"]
            entry["ast"] = None
            vars_out[name] = entry
        stats["help_only"] = help_only

        sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}
        out = {"groups": help_groups, "vars": sorted_vars, "_stats": stats}
        out["default_overrides"] = _scan_default_call_sites(ezq_src)
        return out


def _attach_trailing_comments(cvars: list[dict], ezq_src: Path) -> int:
    file_cache: dict[str, list[str]] = {}
    attached = 0
    for cv in cvars:
        if cv["source_file"] not in file_cache:
            p = ezq_src / cv["source_file"]
            try:
                file_cache[cv["source_file"]] = p.read_text(encoding="utf-8", errors="replace").split("\n")
            except OSError:
                file_cache[cv["source_file"]] = []
        lines = file_cache[cv["source_file"]]
        for probe in (cv["source_line"], cv["source_line"] + 1, cv["source_line"] + 2):
            idx = probe - 1
            if idx < 0 or idx >= len(lines):
                continue
            l = lines[idx]
            terminator_idx = max(l.rfind(";"), l.rfind(","))
            tail = l[terminator_idx + 1:] if terminator_idx >= 0 else l
            tail = tail.strip()
            if tail.startswith("//"):
                cv["trailing_comment"] = tail[2:].strip()
                attached += 1
                break
            if tail.startswith("/*"):
                end = tail.find("*/", 2)
                cv["trailing_comment"] = (tail[2:end] if end >= 0 else tail[2:]).strip()
                attached += 1
                break
    return attached


def _scan_default_call_sites(ezq_src: Path) -> dict[str, list[dict]]:
    SKIP_FILES = {"cvar.c", "config_manager.c"}
    out: dict[str, list[dict]] = {}
    for c_file in sorted(ezq_src.glob("*.c")):
        if c_file.name in SKIP_FILES:
            continue
        try:
            text = c_file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in _CVAR_DEFAULT_CALL_RE.finditer(text):
            ident = m.group(2).lower()
            line = text.count("\n", 0, m.start()) + 1
            out.setdefault(ident, []).append({
                "source_file": c_file.name,
                "source_line": line,
            })
    return out
