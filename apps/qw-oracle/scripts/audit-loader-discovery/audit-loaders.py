"""
audit-loaders.py -- one-off script to surface ezQuake functions that reach
filesystem primitives but are NOT in the current LOADER_FUNCTIONS watchlist.

Two-pass approach:
  Pass 1: build a call graph via libclang CALL_EXPR walk; then BFS from FS
          primitive roots to find all functions that transitively call them.
  Pass 2: find every Cmd_AddCommand / Cmd_AddMacro / Cvar_Register (OnChange)
          registration site and extract the function-pointer argument.

Combines both sets, subtracts existing LOADER_FUNCTIONS, emits a markdown
report.

One-off -- lives in audit-loader-discovery/, not extractor_lib/.
"""
from __future__ import annotations

import sys
import re
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

# -- path setup ---------------------------------------------------------------
HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent.parent  # quakeworld root
EZQ_SRC = REPO / "research" / "repos" / "ezquake-source" / "src"
EXTRACTORS = REPO / "apps" / "qw-oracle" / "scripts" / "extractors"
sys.path.insert(0, str(EXTRACTORS))

from extractor_lib.clang_config import clang_args_for, PARSE_OPTS  # noqa: E402

try:
    from clang.cindex import Config, TranslationUnit, CursorKind
    Config.set_library_file("libclang-18.so.1")
except Exception as e:
    print(f"ERROR: libclang not available: {e}", file=sys.stderr)
    sys.exit(1)

# -- constants ----------------------------------------------------------------
CURRENT_LOADER_FUNCTIONS: set[str] = {
    "FS_LoadFile",
    "FS_OpenVFS",
    "FS_WriteFile",
    "Draw_CachePicSafe",
    "R_LoadPicImage",
    "R_LoadCharsetImage",
    "R_LoadImagePixels",
    "Mod_ForName",
    "Mod_FindName",
    "S_PrecacheSound",
    "W_LoadWadFile",
    "TP_LoadLocFile",
    "PlayQWZDemo",
    "FS_LoadHunkFile",
}

# Starting roots for the call-graph BFS (Pass 1).
FS_ROOTS: set[str] = {
    "FS_LoadFile",
    "FS_OpenVFS",
    "FS_LoadHunkFile",
    "FS_WriteFile",
    "FS_LoadTempFile",   # also a FS primitive -- include as root so callers surface
}

# Cmd registration functions to watch in Pass 2.
CMD_REGISTRATION_FNS: set[str] = {
    "Cmd_AddCommand",
    "Cmd_AddCommandWithCompletion",
    "Cmd_AddMacro",
}
CVAR_REGISTRATION_FNS: set[str] = {
    "Cvar_Register",
}

# -- data structures ----------------------------------------------------------
# call graph: caller -> set of callees (both spelled as function name strings)
CallGraph = dict[str, set[str]]

# registration record
Registration = dict  # keys: cmd_name, fn_name, file, line, kind

# reachability trace: fn_name -> shortest chain to a root (list of fn names)
ReachTrace = dict[str, list[str]]

# definition location: fn_name -> (file, line)
FnLocation = dict[str, tuple[str, int]]

# -- parse helpers ------------------------------------------------------------
CALL_EXPR = CursorKind.CALL_EXPR
FUNCTION_DECL = CursorKind.FUNCTION_DECL
UNEXPOSED_EXPR = CursorKind.UNEXPOSED_EXPR
DECL_REF_EXPR = CursorKind.DECL_REF_EXPR


def _get_call_spelling(cursor) -> str | None:
    """Extract the direct function name from a CALL_EXPR cursor.
    Returns the spelling of the first DECL_REF_EXPR child, which is the
    callee for direct (non-pointer) calls."""
    for child in cursor.get_children():
        if child.kind == UNEXPOSED_EXPR:
            # unwrap one level of UnexposedExpr wrapping the DeclRefExpr
            for sub in child.get_children():
                if sub.kind == DECL_REF_EXPR:
                    return sub.spelling
        if child.kind == DECL_REF_EXPR:
            return child.spelling
    return None


def _nth_arg_spelling(cursor, n: int) -> str | None:
    """Return the DeclRefExpr spelling of the Nth argument (0-based) in a
    CALL_EXPR, peeling through UnexposedExpr wrappers."""
    args = list(cursor.get_arguments())
    if n >= len(args):
        return None
    arg = args[n]
    # Direct reference
    if arg.kind == DECL_REF_EXPR:
        return arg.spelling
    # Wrapped in UnexposedExpr (common for function-pointer args)
    for child in arg.get_children():
        if child.kind == DECL_REF_EXPR:
            return child.spelling
        if child.kind == UNEXPOSED_EXPR:
            for sub in child.get_children():
                if sub.kind == DECL_REF_EXPR:
                    return sub.spelling
    return None


def _first_string_arg(cursor) -> str | None:
    """Extract the first string literal argument from a CALL_EXPR."""
    args = list(cursor.get_arguments())
    if not args:
        return None
    arg = args[0]
    # try to read extent as a string literal
    try:
        tok = list(arg.get_tokens())
        if tok:
            s = tok[0].spelling
            if s.startswith('"'):
                return s.strip('"')
    except Exception:
        pass
    return None


# -- walker -------------------------------------------------------------------
def walk_file(c_file: Path, clang_args: list[str]) -> tuple[CallGraph, list[Registration], FnLocation]:
    """Parse one .c file. Returns:
      - call_graph: caller_name -> {callee_name, ...}
      - registrations: list of registration records
      - fn_locations: fn_name -> (short_path, line)
    """
    call_graph: CallGraph = defaultdict(set)
    registrations: list[Registration] = []
    fn_locations: FnLocation = {}

    tu = TranslationUnit.from_source(
        str(c_file),
        args=clang_args,
        options=PARSE_OPTS,
    )

    target_str = str(c_file)
    short_path = str(c_file.relative_to(EZQ_SRC))

    current_fn: list[str] = []  # stack (usually 0 or 1 deep)

    def recurse(node):
        loc = node.location
        f = loc.file
        if f is not None and f.name != target_str:
            return

        kind = node.kind

        # Track function definitions to know who is calling what.
        entered_fn = False
        if kind == FUNCTION_DECL:
            children = list(node.get_children())
            has_body = any(c.kind == CursorKind.COMPOUND_STMT for c in children)
            if has_body and node.spelling:
                fn_name = node.spelling
                fn_locations[fn_name] = (short_path, loc.line)
                current_fn.append(fn_name)
                entered_fn = True
                for c in children:
                    recurse(c)
                current_fn.pop()
                return  # children already visited

        elif kind == CALL_EXPR:
            callee = _get_call_spelling(node)
            if callee and current_fn:
                caller = current_fn[-1]
                call_graph[caller].add(callee)

                # Pass 2: registration detection
                if callee in CMD_REGISTRATION_FNS:
                    cmd_name = _first_string_arg(node)
                    fn_arg = _nth_arg_spelling(node, 1)  # second arg is the function
                    if fn_arg:
                        registrations.append({
                            "kind": "cmd",
                            "reg_fn": callee,
                            "cmd_name": cmd_name,
                            "fn_name": fn_arg,
                            "file": short_path,
                            "line": loc.line,
                        })

                elif callee in CVAR_REGISTRATION_FNS:
                    # Cvar_Register(&varname) -- OnChange is a field on the
                    # struct; we can't easily extract it from the call site
                    # via the AST without following the reference. Skip here;
                    # we'll catch OnChange callbacks via static struct analysis.
                    pass

        for c in node.get_children():
            recurse(c)

    recurse(tu.cursor)
    return dict(call_graph), registrations, fn_locations


def find_cvar_onchange_callbacks(c_file: Path, clang_args: list[str]) -> list[Registration]:
    """Static cvar_t struct initializers with .OnChange field.
    We scan tokens for the pattern:
      static cvar_t <name> = { ..., <fnname>, ... }
    where the field is named OnChange. Using regex on source text as a fast
    heuristic -- the AST path for aggregate initializers is complex.
    """
    registrations: list[Registration] = []
    try:
        src = c_file.read_text(errors="replace")
    except Exception:
        return registrations

    short_path = str(c_file.relative_to(EZQ_SRC))

    # Pattern: .OnChange = <identifier>  (covers designated initializers)
    for m in re.finditer(r'\.OnChange\s*=\s*([A-Za-z_][A-Za-z0-9_]*)', src):
        fn_name = m.group(1)
        line = src[:m.start()].count('\n') + 1
        registrations.append({
            "kind": "cvar_onchange",
            "reg_fn": "cvar_t.OnChange",
            "cmd_name": None,
            "fn_name": fn_name,
            "file": short_path,
            "line": line,
        })

    return registrations


# Functions that create false-positive paths: error/shutdown handlers that
# happen to call loader routines during teardown, or utility wrappers that
# bridge unrelated subsystems. Blocking these as BFS intermediaries prevents
# chains like Skywind_f -> Com_Printf -> Sys_Error -> Host_Shutdown ->
# CL_Shutdown -> InitFragDefs -> VX_TrackerInit -> R_LoadPicImage.
# We still allow them as *callers* (they might call loaders directly), just
# not as *bridge* nodes that relay reachability through non-loading paths.
NOISY_BRIDGE_NODES: set[str] = {
    "Sys_Error",
    "Host_Error",
    "Host_EndGame",
    "SV_Error",
    "Host_Shutdown",
    "CL_Shutdown",
    "SV_Shutdown",
    "Stats_Shutdown",
    "InitFragDefs",
    "VX_TrackerInit",
    # printing / logging -- never load assets
    "Com_Printf",
    "Sys_Printf",
    "Con_Printf",
    "Con_DPrintf",
    "Con_DPrintf2",
    # memory alloc/free -- never load assets
    "Q_malloc_debug",
    "Q_free_debug",
    "Q_strdup_debug",
    "Hunk_AllocName",
    "Hunk_Alloc",
    "Z_Malloc",
    "Z_Free",
}

# Maximum BFS depth. Real asset-loader callers are within a few hops of an FS
# primitive. Anything deeper is almost certainly a noise path through shared
# utilities that happen to call loaders in some code path.
MAX_TRACE_DEPTH = 7

# -- BFS for reachability -----------------------------------------------------
def bfs_reachable(call_graph: CallGraph, roots: set[str]) -> ReachTrace:
    """BFS from roots in the *reverse* call graph (callee -> callers).
    Returns a map: reachable_fn -> [fn, ..., root] shortest chain.

    Nodes in NOISY_BRIDGE_NODES are not used as intermediaries -- they are
    allowed to be terminal callers (if they call a root directly) but we do
    not propagate reachability THROUGH them. This prevents false-positive
    chains via error-handling / logging code.
    """
    # Build reverse graph: callee -> set of callers
    reverse: dict[str, set[str]] = defaultdict(set)
    for caller, callees in call_graph.items():
        for callee in callees:
            reverse[callee].add(caller)

    # BFS: start from roots, walk reverse edges to find all callers
    visited: ReachTrace = {}  # fn_name -> chain to root
    queue = []

    for root in roots:
        if root not in visited:
            visited[root] = [root]
            queue.append(root)

    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        # If this node is a noisy bridge, don't propagate through it.
        # It can still appear as a reachable leaf (it called a root) but
        # we don't add its callers to the BFS frontier.
        if node in NOISY_BRIDGE_NODES:
            continue
        current_depth = len(visited[node])
        if current_depth >= MAX_TRACE_DEPTH:
            continue
        for caller in reverse.get(node, set()):
            if caller not in visited:
                visited[caller] = [caller] + visited[node]
                queue.append(caller)

    return visited


# -- main ---------------------------------------------------------------------
def main() -> None:
    print(f"Scanning {EZQ_SRC} ...", flush=True)
    c_files = sorted(EZQ_SRC.glob("*.c"))
    print(f"Found {len(c_files)} .c files", flush=True)

    clang_args = clang_args_for(str(EZQ_SRC))

    combined_graph: CallGraph = defaultdict(set)
    all_registrations: list[Registration] = []
    all_fn_locations: FnLocation = {}

    # Parse every file (single-variant, wide net)
    for i, c_file in enumerate(c_files, 1):
        if i % 50 == 0 or i == len(c_files):
            print(f"  [{i}/{len(c_files)}] {c_file.name}", flush=True)
        try:
            cg, regs, fn_locs = walk_file(c_file, clang_args)
        except Exception as exc:
            print(f"  WARN: failed to parse {c_file.name}: {exc}", flush=True)
            continue

        for caller, callees in cg.items():
            combined_graph[caller].update(callees)
        all_registrations.extend(regs)
        all_fn_locations.update(fn_locs)

        # OnChange scanning (regex, cheap)
        all_registrations.extend(find_cvar_onchange_callbacks(c_file, clang_args))

    print(f"Call-graph nodes: {len(combined_graph)}", flush=True)
    print(f"Registration records: {len(all_registrations)}", flush=True)

    # Pass 1: BFS reachability from FS roots
    reach_trace = bfs_reachable(combined_graph, FS_ROOTS)
    pass1_set = set(reach_trace.keys()) - FS_ROOTS  # exclude the roots themselves
    print(f"Pass 1 reachable (excl roots): {len(pass1_set)}", flush=True)

    # Pass 2: registered callbacks set
    pass2_set: set[str] = {r["fn_name"] for r in all_registrations if r["fn_name"]}
    print(f"Pass 2 registered callbacks: {len(pass2_set)}", flush=True)

    # Combine and subtract current watchlist
    candidate_fns = (pass1_set | pass2_set) - CURRENT_LOADER_FUNCTIONS - FS_ROOTS
    print(f"Candidates after subtracting LOADER_FUNCTIONS: {len(candidate_fns)}", flush=True)

    # Narrow Pass 2: only include registered callbacks that also reach an FS root
    # (otherwise every command handler is a false positive)
    pass2_fs_reachable = pass2_set & set(reach_trace.keys())
    candidates_strict = (pass1_set | pass2_fs_reachable) - CURRENT_LOADER_FUNCTIONS - FS_ROOTS
    print(f"Candidates (strict: only registered if they also reach FS): {len(candidates_strict)}", flush=True)

    # Use strict set for the report
    final_candidates = candidates_strict

    # Build registration lookup for final candidates
    cmd_registrations: dict[str, list[Registration]] = defaultdict(list)
    for r in all_registrations:
        if r["fn_name"] in final_candidates:
            cmd_registrations[r["fn_name"]].append(r)

    def is_priority(fn: str) -> bool:
        """High-value loader candidate: name contains a load/open/read signal
        or is a registered command, and has a short trace (<=4 hops to FS)."""
        fl = fn.lower()
        name_signal = any(x in fl for x in [
            "load", "open", "read", "precache", "parse", "cache",
        ])
        is_registered = fn in pass2_fs_reachable
        trace_depth = len(reach_trace.get(fn, [fn]))
        return (name_signal or is_registered) and trace_depth <= 5

    # Split into priority and broader-plumbing tiers
    priority_candidates = {fn for fn in final_candidates if is_priority(fn)}
    plumbing_candidates = final_candidates - priority_candidates

    # Sort candidates: Load-in-name first, registered-as-cmd second, rest last
    def sort_key(fn: str) -> tuple[int, str]:
        has_load = "load" in fn.lower() or "open" in fn.lower() or "read" in fn.lower()
        is_registered = fn in pass2_fs_reachable
        # priority: (0=load+registered, 1=load, 2=registered, 3=other)
        if has_load and is_registered:
            pri = 0
        elif has_load:
            pri = 1
        elif is_registered:
            pri = 2
        else:
            pri = 3
        return (pri, fn.lower())

    sorted_priority = sorted(priority_candidates, key=sort_key)
    sorted_plumbing = sorted(plumbing_candidates, key=sort_key)

    # Generate markdown report
    output_dir = HERE / "output"
    output_dir.mkdir(exist_ok=True)
    report_path = output_dir / "ezquake-loader-candidates.md"

    lines: list[str] = []
    lines.append("# ezQuake loader-function audit candidates\n")
    lines.append(f"**Generated:** {date.today().isoformat()}")
    lines.append(f"**Source root:** `research/repos/ezquake-source/src/`")
    lines.append(f"**Current LOADER_FUNCTIONS count:** {len(CURRENT_LOADER_FUNCTIONS)}")
    lines.append(f"**Total candidates surfaced:** {len(final_candidates)}")
    lines.append(f"**Priority candidates (load-named or registered, trace ≤5):** {len(priority_candidates)}")
    lines.append(f"**Broader plumbing candidates:** {len(plumbing_candidates)}")
    lines.append(f"**Pass 1 reachable count:** {len(pass1_set)}")
    lines.append(f"**Pass 2 registered (FS-reachable) count:** {len(pass2_fs_reachable)}")
    lines.append("")

    lines.append("## Methodology\n")
    lines.append(
        "Pass 1 builds a call graph by walking CALL_EXPR cursors in every `.c` file via libclang, "
        "then does a reverse-BFS from five FS primitive roots (`FS_LoadFile`, `FS_OpenVFS`, "
        "`FS_LoadHunkFile`, `FS_WriteFile`, `FS_LoadTempFile`) to find every function that "
        "transitively reaches the filesystem. Noisy bridge nodes (error handlers, shutdown "
        "routines, logging, allocators) are blocked from propagating reachability; BFS is "
        "capped at depth 7. Pass 2 scans `Cmd_AddCommand`, `Cmd_AddMacro`, and `.OnChange` "
        "cvar field initializers to collect registered callbacks, then intersects with the "
        "Pass 1 reachable set to filter out non-loading commands. Priority candidates are those "
        "with a load/open/read/precache naming signal or a command registration, with a trace "
        "depth of 5 or fewer hops to an FS primitive."
    )
    lines.append("")

    # Group candidates by category inferred from naming / trace
    def infer_category(fn: str, trace: list[str]) -> str:
        fl = fn.lower()
        trace_str = " ".join(trace).lower()
        if any(x in fl for x in ["sky", "skybox", "skywind"]):
            return "Sky / skybox"
        if any(x in fl for x in ["model", "mod_", "mdl", "mesh"]):
            return "Model"
        if any(x in fl for x in ["sound", "snd_", "wav", "ogg", "audio", "precache"]):
            return "Sound"
        if any(x in fl for x in ["tex", "image", "pic", "gfx", "sprite", "skin", "charset"]):
            return "Texture / image"
        if any(x in fl for x in ["map", "bsp", "brush"]):
            return "Map / BSP"
        if any(x in fl for x in ["cfg", "config", "conf", "init", "script"]):
            return "Config / script"
        if any(x in fl for x in ["demo", "mvd", "qwz"]):
            return "Demo"
        if any(x in fl for x in ["pak", "pk3", "wad", "zip"]):
            return "Archive / pack"
        if any(x in fl for x in ["font", "charset"]):
            return "Font / charset"
        if any(x in fl for x in ["vm", "qc", "progs"]):
            return "VM / QuakeC"
        if any(x in fl for x in ["loc", "location"]):
            return "Location / loc file"
        if any(x in fl for x in ["hud", "overlay", "element"]):
            return "HUD"
        # check trace for hints
        if "sound" in trace_str or "snd" in trace_str:
            return "Sound"
        if "model" in trace_str or "mod_" in trace_str:
            return "Model"
        if "image" in trace_str or "r_load" in trace_str:
            return "Texture / image"
        return "Uncategorized"

    cat_order = [
        "Sky / skybox", "Model", "Texture / image", "Sound",
        "Map / BSP", "Demo", "Config / script", "Archive / pack",
        "Font / charset", "VM / QuakeC", "HUD", "Location / loc file",
        "Uncategorized",
    ]

    def emit_fn(fn: str) -> None:
        trace = reach_trace.get(fn, [fn])
        trace_str = " -> ".join(trace)

        if fn in all_fn_locations:
            fpath, fline = all_fn_locations[fn]
            loc_str = f"`{fpath}:{fline}`"
        else:
            loc_str = "_location unknown_"

        in_p1 = fn in pass1_set
        in_p2 = fn in pass2_fs_reachable
        source_parts = []
        if in_p1:
            source_parts.append("Pass 1 (call graph)")
        if in_p2:
            source_parts.append("Pass 2 (registered callback)")
        source_str = ", ".join(source_parts) or "Unknown"

        lines.append(f"#### `{fn}`\n")
        lines.append(f"- **Source:** {loc_str}")
        lines.append(f"- **Discovered by:** {source_str}")
        lines.append(f"- **Reach trace:** `{trace_str}`")

        regs = cmd_registrations.get(fn, [])
        for reg in regs:
            if reg["kind"] == "cmd":
                cmd_name = f'`Cmd_AddCommand "{reg["cmd_name"]}"` ' if reg["cmd_name"] else "`Cmd_AddCommand` "
                lines.append(f"- **Registration:** {cmd_name}at `{reg['file']}:{reg['line']}`")
            elif reg["kind"] == "cvar_onchange":
                lines.append(f"- **Registration:** `.OnChange` field at `{reg['file']}:{reg['line']}`")

        hint = _infer_hint(fn, trace)
        if hint:
            lines.append(f"- **Hint:** {hint}")

        lines.append("")

    def emit_candidate_section(fn_list: list[str], section_title: str) -> None:
        grouped: dict[str, list[str]] = defaultdict(list)
        for fn in fn_list:
            trace = reach_trace.get(fn, [fn])
            cat = infer_category(fn, trace)
            grouped[cat].append(fn)

        present_cats = [c for c in cat_order if c in grouped]
        extra_cats = [c for c in grouped if c not in cat_order]
        all_cats = present_cats + extra_cats

        lines.append(f"## {section_title}\n")
        for cat in all_cats:
            fns = grouped[cat]
            if not fns:
                continue
            lines.append(f"### {cat}\n")
            for fn in fns:
                emit_fn(fn)

    emit_candidate_section(sorted_priority, "Priority candidates")
    lines.append(
        "_Broader plumbing candidates (all other reachable functions) follow. "
        "These are functions that transitively call an FS primitive but are less "
        "likely to be direct asset-loader entry points._\n"
    )
    emit_candidate_section(sorted_plumbing, "Broader plumbing")

    report_text = "\n".join(lines)
    report_path.write_text(report_text, encoding="utf-8")
    print(f"\nReport written to: {report_path}", flush=True)
    print(f"Total candidates: {len(final_candidates)} ({len(priority_candidates)} priority, {len(plumbing_candidates)} plumbing)", flush=True)


def _infer_hint(fn: str, trace: list[str]) -> str:
    """One-liner hint inferred from function name and call chain."""
    fl = fn.lower()
    if "tempfile" in fl:
        return "loads file into temp buffer (short-lived allocation)"
    if "skywind" in fl or "wind" in fl.replace("_wind", "wind"):
        return "loads companion _wind.cfg for skybox wind animation"
    if "sky" in fl:
        return "loads skybox or sky texture"
    if "loadmodel" in fl or ("load" in fl and "model" in fl):
        return "loads model from disk"
    if "loadimage" in fl or ("load" in fl and "image" in fl):
        return "loads image from disk"
    if "loadsound" in fl or ("load" in fl and "sound" in fl):
        return "loads sound from disk"
    if "loadmap" in fl or ("load" in fl and "map" in fl):
        return "loads map/BSP data"
    if "loadcfg" in fl or "loadconfig" in fl or ("load" in fl and "cfg" in fl):
        return "loads config/script from disk"
    if "loadfile" in fl:
        return "generic file load utility reaching FS primitives"
    if "precachesound" in fl:
        return "precaches sound asset"
    if "precache" in fl:
        return "precaches asset"
    if "init" in fl and len(trace) > 2:
        mid = trace[1] if len(trace) > 1 else ""
        return f"initializes subsystem that calls {mid}"
    if len(trace) > 1:
        return f"calls {trace[1]} which reaches {trace[-1]}"
    return ""


if __name__ == "__main__":
    main()
