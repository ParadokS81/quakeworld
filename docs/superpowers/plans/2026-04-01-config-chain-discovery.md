# Config Chain Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Rust Tauri command that discovers the full config file chain starting from a primary config, returning each file's parsed contents and relationships for the Config viewer.

**Architecture:** New `read_config_chain` command in `ezquake.rs` that reuses the existing `parse_config()` function. Walks the config tree recursively (top-level execs, autoexec.cfg, cl_onload, exec refs inside binds/aliases), returns an ordered list of individually-parsed files plus a list of other .cfg files not in the chain. Corresponding TypeScript types added for frontend consumption.

**Tech Stack:** Rust (Tauri command), TypeScript (type definitions), existing `parse_config()` parser

**Spec:** `docs/superpowers/specs/2026-04-01-config-chain-discovery-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src-tauri/src/commands/ezquake.rs` | Modify | Add data structs, helper functions, and `read_config_chain` command |
| `src-tauri/src/lib.rs` | Modify | Register new command in invoke_handler |
| `src/types.ts` | Modify | Add TypeScript types matching the Rust structs |

All paths relative to `apps/slipgate-app/`.

---

### Task 1: Add data structures for config chain

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (after line 44, before the `parse_config` function)

- [ ] **Step 1: Add the config chain types**

Add these types after the existing `ParsedConfig` struct (line 44) and before `parse_config` (line 47):

```rust
// ============================================================
// Config chain discovery
// ============================================================

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ConfigSource {
    Primary,
    Exec,
    AutoExec,
    ClOnload,
    BoundExec,
    AliasExec,
}

#[derive(Serialize, Clone, Debug)]
pub struct ExecReference {
    pub file: String,
    pub context: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ConfigFile {
    pub name: String,
    pub relative_path: String,
    pub source: ConfigSource,
    pub referenced_by: Option<ExecReference>,
    pub cvars: HashMap<String, String>,
    pub binds: Vec<(String, String)>,
    pub aliases: HashMap<String, String>,
    pub exec_refs: Vec<String>,
    pub line_count: u32,
}

#[derive(Serialize, Clone, Debug)]
pub struct UnresolvedExec {
    pub raw_ref: String,
    pub referenced_by: ExecReference,
}

#[derive(Serialize, Clone, Debug)]
pub struct OtherConfig {
    pub name: String,
    pub relative_path: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
pub struct ConfigChain {
    pub files: Vec<ConfigFile>,
    pub unresolved: Vec<UnresolvedExec>,
    pub other_cfgs: Vec<OtherConfig>,
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles with no errors (warnings about unused types are fine)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Add config chain data structures"
```

---

### Task 2: Add exec extraction helper for command strings

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (after the new types, before `parse_config`)

This helper scans a command string (from a bind value or alias value) for `exec <path>` references. Needed by the chain walker.

- [ ] **Step 1: Add the `extract_exec_refs` helper**

Add after the config chain types:

```rust
/// Extract exec file references from a command string.
/// Handles semicolon-separated commands like "echo loading; exec tp.cfg; exec msg.cfg".
fn extract_exec_refs(command: &str) -> Vec<String> {
    let mut refs = Vec::new();
    for segment in command.split(';') {
        let trimmed = segment.trim();
        // Match "exec <path>" at the start of the segment
        if let Some(rest) = trimmed.strip_prefix("exec ").or_else(|| trimmed.strip_prefix("exec\t")) {
            let path = rest.trim().trim_matches('"');
            if !path.is_empty() {
                refs.push(path.to_string());
            }
        }
    }
    refs
}

/// Check if an exec reference contains variable substitution (unresolvable).
fn is_dynamic_ref(exec_ref: &str) -> bool {
    exec_ref.contains('$') || exec_ref.contains('%')
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles (warnings about unused functions are fine)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Add exec extraction helper for command strings"
```

---

### Task 3: Add file resolution helper

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (after `extract_exec_refs`)

This helper resolves an exec path to an actual file on disk, reusing the same candidate-path strategy from `read_ezquake_config`.

- [ ] **Step 1: Add the `resolve_exec_path` helper**

```rust
/// Resolve an exec reference to an actual file path.
/// Tries multiple candidate locations (same strategy as read_ezquake_config).
/// Returns the canonical path and the path relative to game_dir, or None if not found.
fn resolve_exec_path(exec_ref: &str, game_dir: &Path, cfg_dir: &Path) -> Option<(PathBuf, String)> {
    let candidates = [
        game_dir.join(exec_ref),
        cfg_dir.join(exec_ref),
        game_dir.join(exec_ref.trim_start_matches("configs/")),
    ];
    for candidate in &candidates {
        if candidate.exists() && candidate.is_file() {
            // Security: ensure the resolved path is within the game directory
            if let (Ok(canonical), Ok(game_canonical)) = (candidate.canonicalize(), game_dir.canonicalize()) {
                if canonical.starts_with(&game_canonical) {
                    let rel = canonical.strip_prefix(&game_canonical)
                        .unwrap_or(&canonical)
                        .to_string_lossy()
                        .replace('\\', "/");
                    return Some((canonical, rel));
                }
            }
        }
    }
    None
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Add file resolution helper for exec paths"
```

---

### Task 4: Implement the chain walker

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (after the helpers)

This is the core discovery function. It walks the config tree recursively, building the chain.

- [ ] **Step 1: Add the `walk_config_chain` function**

```rust
/// Recursively discover and parse config files starting from a single file.
/// Adds discovered files to `chain` and tracks seen paths to prevent cycles.
fn walk_exec_refs(
    exec_refs: &[String],
    source: ConfigSource,
    parent_file: &str,
    context_prefix: &str,
    game_dir: &Path,
    cfg_dir: &Path,
    seen: &mut std::collections::HashSet<PathBuf>,
    chain: &mut Vec<ConfigFile>,
    unresolved: &mut Vec<UnresolvedExec>,
) {
    for exec_ref in exec_refs {
        if is_dynamic_ref(exec_ref) {
            unresolved.push(UnresolvedExec {
                raw_ref: exec_ref.clone(),
                referenced_by: ExecReference {
                    file: parent_file.to_string(),
                    context: format!("{}", context_prefix),
                },
            });
            continue;
        }

        let resolved = resolve_exec_path(exec_ref, game_dir, cfg_dir);
        let (canonical, rel_path) = match resolved {
            Some(r) => r,
            None => continue,
        };

        if seen.contains(&canonical) {
            continue;
        }
        seen.insert(canonical.clone());

        let content = match std::fs::read(&canonical) {
            Ok(bytes) => String::from_utf8_lossy(&bytes).to_string(),
            Err(_) => continue,
        };

        let parsed = parse_config(&content);
        let line_count = content.lines().count() as u32;
        let name = canonical.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let exec_refs_clone = parsed.exec_refs.clone();

        chain.push(ConfigFile {
            name,
            relative_path: rel_path.clone(),
            source: source.clone(),
            referenced_by: Some(ExecReference {
                file: parent_file.to_string(),
                context: context_prefix.to_string(),
            }),
            cvars: parsed.cvars,
            binds: parsed.bindings,
            aliases: parsed.aliases,
            exec_refs: parsed.exec_refs,
            line_count,
        });

        // Recurse into this file's own exec refs
        walk_exec_refs(
            &exec_refs_clone,
            ConfigSource::Exec,
            &rel_path,
            "exec",
            game_dir, cfg_dir, seen, chain, unresolved,
        );
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Add recursive config chain walker"
```

---

### Task 5: Implement the `read_config_chain` Tauri command

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (in the Tauri commands section, after `read_ezquake_config`)

- [ ] **Step 1: Add the `read_config_chain` command**

```rust
/// Discover and return the full config file chain starting from a primary config.
#[tauri::command]
pub fn read_config_chain(exe_path: String, config_name: String) -> Result<ConfigChain, String> {
    let path = PathBuf::from(&exe_path);
    let cfg_dir = config_dir_from_exe(&path);
    let game_dir = cfg_dir.parent().unwrap_or(&cfg_dir).to_path_buf();

    let primary_path = cfg_dir.join(&config_name);
    if !primary_path.exists() {
        return Err(format!("Config file not found: {}", primary_path.display()));
    }

    let mut chain: Vec<ConfigFile> = Vec::new();
    let mut unresolved: Vec<UnresolvedExec> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // Phase 1: Parse primary config
    let content = std::fs::read(&primary_path)
        .map_err(|e| format!("Failed to read {}: {}", config_name, e))?;
    let content = String::from_utf8_lossy(&content).to_string();
    let parsed = parse_config(&content);
    let line_count = content.lines().count() as u32;

    let canonical = primary_path.canonicalize()
        .unwrap_or_else(|_| primary_path.clone());
    seen.insert(canonical);

    let primary_rel = format!("configs/{}", config_name);
    let primary_exec_refs = parsed.exec_refs.clone();
    let primary_binds = parsed.bindings.clone();
    let primary_aliases = parsed.aliases.clone();
    let cl_onload = parsed.cvars.get("cl_onload").cloned();

    chain.push(ConfigFile {
        name: config_name.clone(),
        relative_path: primary_rel.clone(),
        source: ConfigSource::Primary,
        referenced_by: None,
        cvars: parsed.cvars,
        binds: parsed.bindings,
        aliases: parsed.aliases,
        exec_refs: parsed.exec_refs,
        line_count,
    });

    // Phase 2: Follow inline exec refs from primary config
    walk_exec_refs(
        &primary_exec_refs,
        ConfigSource::Exec,
        &primary_rel,
        "exec",
        &game_dir, &cfg_dir, &mut seen, &mut chain, &mut unresolved,
    );

    // Phase 3: Check for autoexec.cfg
    let autoexec_path = game_dir.join("autoexec.cfg");
    if autoexec_path.exists() {
        let canonical = autoexec_path.canonicalize().unwrap_or_else(|_| autoexec_path.clone());
        if !seen.contains(&canonical) {
            seen.insert(canonical);
            if let Ok(bytes) = std::fs::read(&autoexec_path) {
                let content = String::from_utf8_lossy(&bytes).to_string();
                let parsed = parse_config(&content);
                let line_count = content.lines().count() as u32;
                let autoexec_refs = parsed.exec_refs.clone();

                chain.push(ConfigFile {
                    name: "autoexec.cfg".to_string(),
                    relative_path: "autoexec.cfg".to_string(),
                    source: ConfigSource::AutoExec,
                    referenced_by: Some(ExecReference {
                        file: primary_rel.clone(),
                        context: "engine (loaded after config.cfg)".to_string(),
                    }),
                    cvars: parsed.cvars,
                    binds: parsed.bindings,
                    aliases: parsed.aliases,
                    exec_refs: parsed.exec_refs,
                    line_count,
                });

                walk_exec_refs(
                    &autoexec_refs,
                    ConfigSource::Exec,
                    "autoexec.cfg",
                    "exec",
                    &game_dir, &cfg_dir, &mut seen, &mut chain, &mut unresolved,
                );
            }
        }
    }

    // Phase 4: Follow cl_onload exec refs
    if let Some(onload) = cl_onload {
        let onload_refs = extract_exec_refs(&onload);
        walk_exec_refs(
            &onload_refs,
            ConfigSource::ClOnload,
            &primary_rel,
            "cl_onload",
            &game_dir, &cfg_dir, &mut seen, &mut chain, &mut unresolved,
        );
    }

    // Phase 5: Scan binds and aliases in ALL chain files for exec refs
    // Collect all bind/alias exec refs first to avoid borrow issues
    let mut bound_refs: Vec<(String, String, String)> = Vec::new(); // (ref, parent_file, context)
    for file in &chain {
        for (key, cmd) in &file.binds {
            for exec_ref in extract_exec_refs(cmd) {
                bound_refs.push((exec_ref, file.relative_path.clone(), format!("bind {}", key)));
            }
        }
        for (alias_name, cmd) in &file.aliases {
            for exec_ref in extract_exec_refs(cmd) {
                bound_refs.push((exec_ref, file.relative_path.clone(), format!("alias {}", alias_name)));
            }
        }
    }

    for (exec_ref, parent_file, context) in &bound_refs {
        if is_dynamic_ref(exec_ref) {
            unresolved.push(UnresolvedExec {
                raw_ref: exec_ref.clone(),
                referenced_by: ExecReference {
                    file: parent_file.clone(),
                    context: context.clone(),
                },
            });
            continue;
        }

        if let Some((canonical, rel_path)) = resolve_exec_path(exec_ref, &game_dir, &cfg_dir) {
            if seen.contains(&canonical) {
                continue;
            }
            seen.insert(canonical.clone());

            if let Ok(bytes) = std::fs::read(&canonical) {
                let content = String::from_utf8_lossy(&bytes).to_string();
                let parsed = parse_config(&content);
                let lc = content.lines().count() as u32;
                let name = canonical.file_name()
                    .unwrap_or_default().to_string_lossy().to_string();

                let source = if context.starts_with("bind") {
                    ConfigSource::BoundExec
                } else {
                    ConfigSource::AliasExec
                };

                let sub_refs = parsed.exec_refs.clone();

                chain.push(ConfigFile {
                    name,
                    relative_path: rel_path.clone(),
                    source,
                    referenced_by: Some(ExecReference {
                        file: parent_file.clone(),
                        context: context.clone(),
                    }),
                    cvars: parsed.cvars,
                    binds: parsed.bindings,
                    aliases: parsed.aliases,
                    exec_refs: parsed.exec_refs,
                    line_count: lc,
                });

                walk_exec_refs(
                    &sub_refs,
                    ConfigSource::Exec,
                    &rel_path,
                    "exec",
                    &game_dir, &cfg_dir, &mut seen, &mut chain, &mut unresolved,
                );
            }
        }
    }

    // Phase 6: Collect other .cfg files not in the chain
    let mut other_cfgs: Vec<OtherConfig> = Vec::new();
    let scan_dirs = [cfg_dir.clone(), game_dir.clone()];
    for dir in &scan_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "cfg") {
                    if let Ok(canonical) = path.canonicalize() {
                        if !seen.contains(&canonical) {
                            seen.insert(canonical);
                            let name = path.file_name()
                                .unwrap_or_default().to_string_lossy().to_string();
                            let rel = path.strip_prefix(&game_dir)
                                .unwrap_or(&path)
                                .to_string_lossy()
                                .replace('\\', "/");
                            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                            other_cfgs.push(OtherConfig {
                                name,
                                relative_path: rel,
                                size_bytes: size,
                            });
                        }
                    }
                }
            }
        }
    }

    other_cfgs.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(ConfigChain {
        files: chain,
        unresolved,
        other_cfgs,
    })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Implement read_config_chain Tauri command"
```

---

### Task 6: Register the command and add TypeScript types

**Files:**
- Modify: `src-tauri/src/lib.rs:20-32` (add to invoke_handler)
- Modify: `src/types.ts` (add TypeScript types)

- [ ] **Step 1: Register the command in lib.rs**

In `src-tauri/src/lib.rs`, add `commands::ezquake::read_config_chain` to the `invoke_handler` list:

```rust
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::system::get_all_specs,
            commands::ezquake::validate_ezquake_path,
            commands::ezquake::read_ezquake_config,
            commands::ezquake::read_config_chain,
            commands::ezquake::launch_ezquake,
            commands::auth::await_oauth_callback,
            commands::updater::check_for_update,
            commands::updater::download_and_install_update,
            commands::updater::check_client_running,
            commands::updater::get_release_changelog,
            commands::screenshot::capture_screenshot,
        ])
```

- [ ] **Step 2: Add TypeScript types in `src/types.ts`**

Add at the end of the file:

```typescript
// ── Config chain discovery ────────────────────────────────────────────────

export type ConfigSource =
  | "primary"
  | "exec"
  | "auto_exec"
  | "cl_onload"
  | "bound_exec"
  | "alias_exec";

export interface ExecReference {
  file: string;
  context: string;
}

export interface ConfigFile {
  name: string;
  relative_path: string;
  source: ConfigSource;
  referenced_by: ExecReference | null;
  cvars: Record<string, string>;
  binds: [string, string][];
  aliases: Record<string, string>;
  exec_refs: string[];
  line_count: number;
}

export interface UnresolvedExec {
  raw_ref: string;
  referenced_by: ExecReference;
}

export interface OtherConfig {
  name: string;
  relative_path: string;
  size_bytes: number;
}

export interface ConfigChain {
  files: ConfigFile[];
  unresolved: UnresolvedExec[];
  other_cfgs: OtherConfig[];
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles with no errors

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src/types.ts
git commit -m "Register read_config_chain command and add TypeScript types"
```

---

### Task 7: Smoke test with debug command

**Files:**
- Modify: `src-tauri/src/commands/ezquake.rs` (existing debug command area, around line 1540)

The app currently runs on Windows, but we can add a quick debug print command to verify the chain works. This task adds a temporary debug print that logs the chain to stdout when called, which can be tested via `tauri dev`.

- [ ] **Step 1: Add a debug log call at the end of `read_config_chain`**

Just before the `Ok(ConfigChain { ... })` return at the end of the function, add:

```rust
    // Debug output
    println!("\n=== CONFIG CHAIN ({} files) ===", chain.len());
    for (i, f) in chain.iter().enumerate() {
        let ref_str = match &f.referenced_by {
            Some(r) => format!(" ← {} ({})", r.file, r.context),
            None => String::new(),
        };
        println!("  {}. [{}] {} — {} cvars, {} binds, {} aliases{}",
            i + 1,
            format!("{:?}", f.source).to_lowercase(),
            f.relative_path,
            f.cvars.len(),
            f.binds.len(),
            f.aliases.len(),
            ref_str,
        );
    }
    if !unresolved.is_empty() {
        println!("  Unresolved: {:?}", unresolved.iter().map(|u| &u.raw_ref).collect::<Vec<_>>());
    }
    println!("  Other cfgs: {}", other_cfgs.len());
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/slipgate-app && cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5`
Expected: compiles

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/ezquake.rs
git commit -m "Add debug logging to read_config_chain"
```

---

### Summary

| Task | What | Files |
|------|------|-------|
| 1 | Data structures | `ezquake.rs` |
| 2 | Exec extraction helper | `ezquake.rs` |
| 3 | File resolution helper | `ezquake.rs` |
| 4 | Recursive chain walker | `ezquake.rs` |
| 5 | `read_config_chain` command | `ezquake.rs` |
| 6 | Register command + TS types | `lib.rs`, `types.ts` |
| 7 | Debug logging for smoke test | `ezquake.rs` |

After task 7, the command is callable from the frontend via `invoke<ConfigChain>("read_config_chain", { exePath, configName })`. Frontend integration (replacing the current ConfigViewer's data source) is a separate piece of work.
