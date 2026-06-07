// QTV Layer 1 extractor.
//
// Walks the QTV Go source tree under <src>/pkg/ using go/parser + go/ast +
// go/token and emits two JSON files consumed by the qw-oracle load-version
// pipeline:
//   - qtv-variables-ast.json  (payload field "vars", 41 cvars)
//   - qtv-commands-ast.json   (payload field "commands", 12 commands)
//
// Invocation:
//   go run . --src <path-to-qtv-repo-root> --out <output-dir>
//
// stdlib only -- no external imports. The extractor parses QTV source as text
// via go/parser; it does NOT compile against the qtv module.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// --- Output types (match the exact JSON contract the loader adapters read) ---

// cvarAst carries the per-cvar AST block. All nullable fields use *string or
// *int so json.Marshal emits null rather than the zero value.
type cvarAst struct {
	DefaultValue      *string  `json:"default_value"`
	FlagsRaw          *string  `json:"flags_raw"`
	FlagNames         []string `json:"flag_names"`
	OnChange          *string  `json:"on_change"`
	MinBound          *string  `json:"min_bound"`
	MaxBound          *string  `json:"max_bound"`
	SourceFile        string   `json:"source_file"`
	SourceLine        int      `json:"source_line"`
	SourceColumn      int      `json:"source_column"`
	StorageClass      *string  `json:"storage_class"`
	GroupNameInSource *string  `json:"group_name_in_source"`
	TrailingComment   *string  `json:"trailing_comment"`
}

type cvarEntry struct {
	Name string  `json:"name"`
	Ast  cvarAst `json:"ast"`
}

type cvarStats struct {
	SourceTotal         int `json:"source_total"`
	Count               int `json:"count"`
	WithFlags           int `json:"with_flags"`
	WithOnchange        int `json:"with_onchange"`
	WithTrailingComment int `json:"with_trailing_comment"`
}

type cvarOutput struct {
	Vars  []cvarEntry `json:"vars"`
	Stats cvarStats   `json:"_stats"`
}

// commandAst carries the per-command AST block.
type commandAst struct {
	HandlerFn         *string `json:"handler_fn"`
	SourceFile        string  `json:"source_file"`
	SourceLine        int     `json:"source_line"`
	SourceColumn      int     `json:"source_column"`
	EnclosingFunction *string `json:"enclosing_function"`
	Description       *string `json:"description"`
}

type commandEntry struct {
	Name string     `json:"name"`
	Ast  commandAst `json:"ast"`
}

type commandStats struct {
	SourceTotalCallSites int `json:"source_total_call_sites"`
	Count                int `json:"count"`
	WithHandler          int `json:"with_handler"`
	WithDescription      int `json:"with_description"`
}

type commandOutput struct {
	Commands []commandEntry `json:"commands"`
	Stats    commandStats   `json:"_stats"`
}

// --- Helpers for pointer-to-string convenience ---

func strPtr(s string) *string { return &s }

// --- Phase A: const-table pre-pass ---

// buildConstTable walks every .go file under pkgDir and collects package-level
// const/var ValueSpec entries where the value is a resolvable literal or
// binary expression. Two passes: first collect BasicLit entries, then resolve
// BinaryExpr entries whose operands reference already-known consts.
// This ensures qtvRelease and qwDefaultMasters are both captured regardless of
// declaration order across files.
func buildConstTable(pkgDir string) map[string]string {
	table := map[string]string{}

	var files []string
	err := filepath.Walk(pkgDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".go") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: const-table walk: %v\n", err)
		return table
	}

	fset := token.NewFileSet()
	var parsedFiles []*ast.File
	for _, f := range files {
		af, err := parser.ParseFile(fset, f, nil, 0)
		if err != nil {
			// Parse errors are non-fatal here; we still collect what we can.
			fmt.Fprintf(os.Stderr, "WARN: parse %s: %v\n", f, err)
			continue
		}
		parsedFiles = append(parsedFiles, af)
	}

	// Two-pass resolution: first BasicLit, then BinaryExpr.
	for pass := 0; pass < 2; pass++ {
		for _, af := range parsedFiles {
			for _, decl := range af.Decls {
				gd, ok := decl.(*ast.GenDecl)
				if !ok {
					continue
				}
				if gd.Tok != token.CONST && gd.Tok != token.VAR {
					continue
				}
				for _, spec := range gd.Specs {
					vs, ok := spec.(*ast.ValueSpec)
					if !ok {
						continue
					}
					for i, name := range vs.Names {
						if i >= len(vs.Values) {
							continue
						}
						val, ok := resolveConstExpr(vs.Values[i], table)
						if ok {
							table[name.Name] = val
						}
					}
				}
			}
		}
	}

	return table
}

// resolveConstExpr evaluates a constant expression node from the AST.
// Returns (value-string, true) on success, ("", false) when unresolvable.
// Handles: BasicLit STRING, BasicLit INT, BinaryExpr ADD (string concat or
// int add), BinaryExpr MUL (int multiply), Ident lookup in table.
func resolveConstExpr(expr ast.Expr, table map[string]string) (string, bool) {
	switch e := expr.(type) {
	case *ast.BasicLit:
		switch e.Kind {
		case token.STRING:
			// Strip surrounding quotes from a double-quoted string literal.
			unquoted, err := strconv.Unquote(e.Value)
			if err != nil {
				return "", false
			}
			return unquoted, true
		case token.INT:
			return e.Value, true
		}
	case *ast.Ident:
		if v, ok := table[e.Name]; ok {
			return v, true
		}
	case *ast.BinaryExpr:
		left, lok := resolveConstExpr(e.X, table)
		right, rok := resolveConstExpr(e.Y, table)
		if !lok || !rok {
			return "", false
		}
		switch e.Op {
		case token.ADD:
			// String concat when both sides look like strings; otherwise int add.
			// Heuristic: if either side is numeric, try int arithmetic.
			li, lerr := strconv.ParseInt(left, 10, 64)
			ri, rerr := strconv.ParseInt(right, 10, 64)
			if lerr == nil && rerr == nil {
				return strconv.FormatInt(li+ri, 10), true
			}
			// String concatenation.
			return left + right, true
		case token.MUL:
			li, lerr := strconv.ParseInt(left, 10, 64)
			ri, rerr := strconv.ParseInt(right, 10, 64)
			if lerr != nil || rerr != nil {
				return "", false
			}
			return strconv.FormatInt(li*ri, 10), true
		}
	}
	return "", false
}

// --- resolveDefault: turn a registration default arg into a string value ---

// resolveDefault converts a cvar default argument AST node to a string.
// Returns (value, true) on success, ("", false) when unresolvable.
// Callers emit null for default_value when false is returned (F7: report truth).
func resolveDefault(expr ast.Expr, table map[string]string) (string, bool) {
	switch e := expr.(type) {
	case *ast.BasicLit:
		switch e.Kind {
		case token.STRING:
			unquoted, err := strconv.Unquote(e.Value)
			if err != nil {
				return "", false
			}
			return unquoted, true
		case token.INT:
			// Integer default: emit decimal string (e.g. RegEx("x", 1024, ...) -> "1024").
			// But it might be a compound expression; fall through to foldIntExpr check.
			return e.Value, true
		}
	case *ast.Ident:
		if e.Name == "nil" {
			return "", false
		}
		if v, ok := table[e.Name]; ok {
			return v, true
		}
		return "", false
	case *ast.BinaryExpr:
		// Try integer arithmetic first (covers RegEx int defaults and Regf args).
		if iv, ok := foldIntExpr(e); ok {
			return strconv.FormatInt(iv, 10), true
		}
		// Try string concatenation (covers "QTVGO " + qtvRelease).
		left, lok := resolveDefault(e.X, table)
		right, rok := resolveDefault(e.Y, table)
		if lok && rok && e.Op == token.ADD {
			return left + right, true
		}
		return "", false
	}
	return "", false
}

// foldIntExpr recursively evaluates a constant integer expression.
// Returns (value, true) for BasicLit INT or BinaryExpr MUL/ADD over ints.
// Used for Regf format args and RegEx int-literal defaults.
func foldIntExpr(expr ast.Expr) (int64, bool) {
	switch e := expr.(type) {
	case *ast.BasicLit:
		if e.Kind == token.INT {
			v, err := strconv.ParseInt(e.Value, 10, 64)
			if err != nil {
				return 0, false
			}
			return v, true
		}
	case *ast.BinaryExpr:
		lv, lok := foldIntExpr(e.X)
		rv, rok := foldIntExpr(e.Y)
		if !lok || !rok {
			return 0, false
		}
		switch e.Op {
		case token.MUL:
			return lv * rv, true
		case token.ADD:
			return lv + rv, true
		}
	}
	return 0, false
}

// --- resolveFlags: turn a flags argument into (raw string, name list) ---

// resolveFlags converts a qVarFlags argument to (flags_raw, flag_names).
// "0" -> ("", []).
// Single Ident flag -> (name, [name]).
// BinaryExpr OR -> recurse, combine.
func resolveFlags(expr ast.Expr) (string, []string) {
	switch e := expr.(type) {
	case *ast.BasicLit:
		// The only BasicLit flag value is 0.
		if e.Kind == token.INT && e.Value == "0" {
			return "", []string{}
		}
		return e.Value, []string{e.Value}
	case *ast.Ident:
		if e.Name == "0" {
			return "", []string{}
		}
		return e.Name, []string{e.Name}
	case *ast.BinaryExpr:
		if e.Op == token.OR {
			lRaw, lNames := resolveFlags(e.X)
			rRaw, rNames := resolveFlags(e.Y)
			combined := append(lNames, rNames...) //nolint:gocritic
			raw := lRaw + "|" + rRaw
			return raw, combined
		}
	}
	return "", []string{}
}

// --- resolveOnChange: turn an OnChange argument into a string or nil ---

// resolveOnChange returns the handler function name or nil.
// "nil" Ident -> nil (null in JSON).
// Other Ident -> the name.
func resolveOnChange(expr ast.Expr) *string {
	if ident, ok := expr.(*ast.Ident); ok {
		if ident.Name == "nil" {
			return nil
		}
		return strPtr(ident.Name)
	}
	return nil
}

// --- Phase B: AST walk ---

// collectFromFile parses one .go file and appends discovered cvar and command
// registrations to the provided slices.
func collectFromFile(
	path string,
	srcRoot string,
	fset *token.FileSet,
	table map[string]string,
	cvars *[]cvarEntry,
	commands *[]commandEntry,
) {
	af, err := parser.ParseFile(fset, path, nil, 0)
	if err != nil {
		fmt.Fprintf(os.Stderr, "WARN: parse %s: %v\n", path, err)
		return
	}

	relPath, err := filepath.Rel(srcRoot, path)
	if err != nil {
		relPath = path
	}
	// Always use forward slashes in the emitted source_file path so the output
	// is the same on Linux and Windows runs.
	relPath = filepath.ToSlash(relPath)

	ast.Inspect(af, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		methodName := sel.Sel.Name
		pos := fset.Position(call.Pos())

		switch methodName {
		case "Reg", "RegEx", "Regf":
			// Cvar registration. Only qVarStorage defines these methods (verified
			// by reading var.go:188-208); no false-positive risk in pkg/qtv.
			entry := extractCvar(call, methodName, relPath, pos, table)
			if entry != nil {
				*cvars = append(*cvars, *entry)
			}
		case "Register":
			// Command registration. Only *qCmd defines Register (cmd.go:278).
			// The method definition itself is a FuncDecl, not a CallExpr, so it
			// is excluded automatically by the ast.Inspect node type check above.
			entry := extractCommand(call, relPath, pos)
			if entry != nil {
				*commands = append(*commands, *entry)
			}
		}
		return true
	})
}

// extractCvar builds a cvarEntry from a Reg/RegEx/Regf CallExpr.
// Returns nil if the call does not have the expected argument shape.
func extractCvar(call *ast.CallExpr, method string, relPath string, pos token.Position, table map[string]string) *cvarEntry {
	args := call.Args
	if len(args) < 2 {
		return nil
	}

	// Arg 0: name -- always a string literal.
	nameStr, ok := extractStringLit(args[0])
	if !ok {
		return nil
	}

	ast_ := cvarAst{
		// flags_raw defaults to the empty-string sentinel (NOT null) so an
		// unflagged cvar matches the C extractors' post-v17 convention
		// (cross-front-end parity; runbook 3.2.1 negative bar). RegEx with real
		// flags overrides below; Reg/Regf (no flags arg) keep the sentinel. [F17]
		FlagsRaw:          strPtr(""),
		FlagNames:         []string{},
		SourceFile:        relPath,
		SourceLine:        pos.Line,
		SourceColumn:      pos.Column,
		// Other fields QTV does not carry remain null (zero-value pointer).
	}

	switch method {
	case "Reg":
		// Reg(name, value string) -- 2 args; plain string default.
		defVal, resolved := resolveDefault(args[1], table)
		if resolved {
			ast_.DefaultValue = strPtr(defVal)
		} else {
			fmt.Fprintf(os.Stderr, "WARN: unresolved default for cvar %q in %s:%d\n", nameStr, relPath, pos.Line)
		}

	case "RegEx":
		// RegEx(name, value, flags, onchange) -- 4 args.
		if len(args) < 4 {
			fmt.Fprintf(os.Stderr, "WARN: RegEx too few args for %q in %s:%d\n", nameStr, relPath, pos.Line)
			return nil
		}
		defVal, resolved := resolveDefault(args[1], table)
		if resolved {
			ast_.DefaultValue = strPtr(defVal)
		} else {
			fmt.Fprintf(os.Stderr, "WARN: unresolved default for cvar %q in %s:%d\n", nameStr, relPath, pos.Line)
		}
		rawFlags, flagNames := resolveFlags(args[2])
		if rawFlags != "" {
			ast_.FlagsRaw = strPtr(rawFlags)
		}
		ast_.FlagNames = flagNames
		ast_.OnChange = resolveOnChange(args[3])

	case "Regf":
		// Regf(name, format, args...) -- variadic. The format is always "%v"
		// and there is exactly one integer expression argument in all 4 QTV call
		// sites. Evaluate the integer constant expression to produce the default.
		if len(args) < 3 {
			fmt.Fprintf(os.Stderr, "WARN: Regf too few args for %q in %s:%d\n", nameStr, relPath, pos.Line)
			return nil
		}
		formatLit, fmtOk := extractStringLit(args[1])
		if !fmtOk {
			fmt.Fprintf(os.Stderr, "WARN: Regf non-string format for %q in %s:%d\n", nameStr, relPath, pos.Line)
			return nil
		}
		if iv, ok := foldIntExpr(args[2]); ok {
			ast_.DefaultValue = strPtr(fmt.Sprintf(formatLit, iv))
		} else {
			fmt.Fprintf(os.Stderr, "WARN: Regf cannot fold arg for %q in %s:%d\n", nameStr, relPath, pos.Line)
		}
	}

	return &cvarEntry{Name: nameStr, Ast: ast_}
}

// extractCommand builds a commandEntry from a Register CallExpr.
// Returns nil if the argument shape is unexpected.
func extractCommand(call *ast.CallExpr, relPath string, pos token.Position) *commandEntry {
	args := call.Args
	if len(args) < 2 {
		return nil
	}

	nameStr, ok := extractStringLit(args[0])
	if !ok {
		return nil
	}
	// Runtime lowercases command names at registration time (cmd.go:282).
	nameStr = strings.ToLower(nameStr)

	// Arg 1: handler -- typically a function Ident.
	var handlerFn *string
	if ident, ok := args[1].(*ast.Ident); ok {
		handlerFn = strPtr(ident.Name)
	}

	return &commandEntry{
		Name: nameStr,
		Ast: commandAst{
			HandlerFn:    handlerFn,
			SourceFile:   relPath,
			SourceLine:   pos.Line,
			SourceColumn: pos.Column,
			// EnclosingFunction and Description are null for QTV (no banner-comment
			// pattern; describe pass owns descriptions).
		},
	}
}

// extractStringLit returns the unquoted string from a BasicLit STRING node.
func extractStringLit(expr ast.Expr) (string, bool) {
	lit, ok := expr.(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return "", false
	}
	s, err := strconv.Unquote(lit.Value)
	if err != nil {
		return "", false
	}
	return s, true
}

// --- Phase C: dedup, sort, stats, emit ---

func dedupCvars(entries []cvarEntry) []cvarEntry {
	seen := map[string]bool{}
	out := make([]cvarEntry, 0, len(entries))
	for _, e := range entries {
		if !seen[e.Name] {
			seen[e.Name] = true
			out = append(out, e)
		}
	}
	return out
}

func dedupCommands(entries []commandEntry) []commandEntry {
	seen := map[string]bool{}
	out := make([]commandEntry, 0, len(entries))
	for _, e := range entries {
		if !seen[e.Name] {
			seen[e.Name] = true
			out = append(out, e)
		}
	}
	return out
}

func cvarStatsOf(raw, deduped []cvarEntry) cvarStats {
	withFlags := 0
	withOnchange := 0
	for _, e := range deduped {
		if len(e.Ast.FlagNames) > 0 {
			withFlags++
		}
		if e.Ast.OnChange != nil {
			withOnchange++
		}
	}
	return cvarStats{
		SourceTotal:         len(raw),
		Count:               len(deduped),
		WithFlags:           withFlags,
		WithOnchange:        withOnchange,
		WithTrailingComment: 0,
	}
}

func commandStatsOf(raw, deduped []commandEntry) commandStats {
	withHandler := 0
	for _, e := range deduped {
		if e.Ast.HandlerFn != nil {
			withHandler++
		}
	}
	return commandStats{
		SourceTotalCallSites: len(raw),
		Count:                len(deduped),
		WithHandler:          withHandler,
		WithDescription:      0,
	}
}

func writeJSON(path string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	// Append a trailing newline to match the Python extractor style.
	data = append(data, '\n')
	return os.WriteFile(path, data, 0644)
}

// --- main ---

func main() {
	srcFlag := flag.String("src", "", "path to the QTV repo root (required)")
	outFlag := flag.String("out", "./output", "output directory for JSON files")
	flag.Parse()

	if *srcFlag == "" {
		fmt.Fprintln(os.Stderr, "ERROR: --src is required")
		flag.Usage()
		os.Exit(1)
	}

	srcRoot, err := filepath.Abs(*srcFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: resolving --src: %v\n", err)
		os.Exit(1)
	}
	outDir, err := filepath.Abs(*outFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: resolving --out: %v\n", err)
		os.Exit(1)
	}

	pkgDir := filepath.Join(srcRoot, "pkg")
	if _, err := os.Stat(pkgDir); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "ERROR: pkg/ not found under --src %s\n", srcRoot)
		os.Exit(1)
	}

	// Phase A: collect constants needed for non-literal default resolution.
	table := buildConstTable(pkgDir)
	if _, ok := table["qwDefaultMasters"]; !ok {
		fmt.Fprintln(os.Stderr, "WARN: qwDefaultMasters not found in const table")
	}
	if _, ok := table["qtvRelease"]; !ok {
		fmt.Fprintln(os.Stderr, "WARN: qtvRelease not found in const table")
	}

	// Phase B: walk all .go files under pkg/ and collect call-sites.
	var rawCvars []cvarEntry
	var rawCommands []commandEntry

	fset := token.NewFileSet()
	err = filepath.Walk(pkgDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(path, ".go") {
			collectFromFile(path, srcRoot, fset, table, &rawCvars, &rawCommands)
		}
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: walk: %v\n", err)
		os.Exit(1)
	}

	// Phase C: dedup, sort, emit.
	dedupedCvars := dedupCvars(rawCvars)
	dedupedCommands := dedupCommands(rawCommands)

	sort.Slice(dedupedCvars, func(i, j int) bool {
		return dedupedCvars[i].Name < dedupedCvars[j].Name
	})
	sort.Slice(dedupedCommands, func(i, j int) bool {
		return dedupedCommands[i].Name < dedupedCommands[j].Name
	})

	cOut := cvarOutput{
		Vars:  dedupedCvars,
		Stats: cvarStatsOf(rawCvars, dedupedCvars),
	}
	cmdOut := commandOutput{
		Commands: dedupedCommands,
		Stats:    commandStatsOf(rawCommands, dedupedCommands),
	}

	if err := os.MkdirAll(outDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: mkdir %s: %v\n", outDir, err)
		os.Exit(1)
	}

	cvarPath := filepath.Join(outDir, "qtv-variables-ast.json")
	if err := writeJSON(cvarPath, cOut); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: write %s: %v\n", cvarPath, err)
		os.Exit(1)
	}
	fmt.Printf("Wrote %s (%d cvars)\n", cvarPath, cOut.Stats.Count)

	cmdPath := filepath.Join(outDir, "qtv-commands-ast.json")
	if err := writeJSON(cmdPath, cmdOut); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: write %s: %v\n", cmdPath, err)
		os.Exit(1)
	}
	fmt.Printf("Wrote %s (%d commands)\n", cmdPath, cmdOut.Stats.Count)
}
