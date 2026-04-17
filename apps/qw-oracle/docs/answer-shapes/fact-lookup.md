# Answer shape: Fact Lookup

When the user asks about a specific feature, setting, or "how do I do X" where the
answer is one or more cvars/commands with specific values.

Examples: "my frag tracker isn't showing", "how do I invert mouse", "what's the
crosshair command", "how to change FOV"

## Retrieval strategy

### Step 1: Extract candidate terms

Split the question into searchable fragments. Look for:
- Anything that looks like a cvar/command name (underscores, dotted prefixes)
- Feature nouns: "frag tracker", "crosshair", "hud", "fov", "sensitivity"
- Symptom keywords: "not showing", "missing", "broken"

### Step 2: Fuzzy entity search

For each candidate term, call `search_entities(query: term)`.

Goal: discover the actual cvar/command names the user is asking about.
This bridges natural language ("frag tracker") to entity names (`r_tracker_frags`).

If a term returns results, note:
- The exact cvar/command names found
- Their `group_name` -- other cvars in the same group are likely related
- Their `description` -- may mention related cvars by name

### Step 3: Exact lookup for discovered entities

For the most relevant entities from step 2, call `lookup_entity(name: exactName)`
to get full details: default values, types, descriptions, linked concept notes.

### Step 4: Check for concept notes

If any entity from step 3 has `linked_concepts`, call `get_concept_note` for each.
Concept notes cross-link related cvars and explain how they work together --
exactly the kind of "these 5 cvars form the frag tracker system" knowledge that
individual entity lookups can't provide.

### Step 5: Search community discussion

With the actual cvar names from steps 2-3, call `search_solved_issues` using
those names as the query. This is the re-search step -- the vocabulary gap is
now closed because you have the real terms.

Use the cvar names directly: `search_solved_issues(query: "r_tracker_frags hud_frags_show")`
will hit sessions where people discussed those exact cvars.

### Step 6: Synthesize

**Answer format:**

1. **Direct answer first.** Name the cvars/commands and their recommended values.
   If there's a "just do this" answer, lead with it.

2. **What each cvar does.** Brief description from Layer 1, not a copy-paste of
   the full entity record. The user wants to understand, not read a database dump.

3. **Community context** (if relevant). Did the Layer 2 sessions reveal tips,
   common pitfalls, or recommended combinations? Attribute to the community
   ("community members recommend scr_compacthud 1 or 4") not to the oracle.

4. **Source citation.** End with the canonical IDs of the entities referenced so
   the user can look them up.

## What NOT to do

- Don't dump raw entity records. Extract the useful information.
- Don't guess at cvar values not found in the data. If the oracle doesn't have it,
  say so and suggest where to look (e.g., "check /help r_tracker_frags in-game").
- Don't mix fact and opinion without labeling. If a value comes from Layer 1, it's
  a fact. If it comes from Layer 2, it's community advice.
