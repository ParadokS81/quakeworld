"""Claude-powered analysis of voice communication timeline.

Reads the merged timeline, stats, overlaps, and match data (ktxstats)
to generate actionable insights about team communication patterns.

Usage:
    python src/analysis/analyzer.py <map_dir>
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.utils.audio_utils import load_config, ensure_dir, load_knowledge

SYSTEM_PROMPT = """You are an expert esports communication analyst specializing in team FPS games.
You are analyzing voice communications from a QuakeWorld 4on4 team deathmatch.

QuakeWorld context:
- 4v4 team deathmatch, 20 minute maps
- Key maps: dm3, dm2, e1m2, schloss, phantombase
- Critical items: Quad Damage (every 60s), Pent (every 5 min), Rocket Launcher, Lightning Gun
- Communication is essential for item timing, enemy positions, and team coordination
- Good comms: short, clear callouts with location and intent
- Bad comms: talking over each other, silence during fights, late callouts, inconsistent terminology

Voice callout conventions:
- Armor is always called by color: "red", "yellow", "green" (never "RA", "YA", "GA")
- Weapons: "rocket", "shaft" (lightning gun), "grenade", "sng", "buckshot" (SSG), "boomstick" (SG)
- Health status: "weak", "almost dead", "so dead" (NOT "low" which refers to a map location)
- "stacked"/"fat"/"strong" = well-equipped player
- Item timing: "[item] on [time]" = spawns at that second mark, "[item] in [x]" = spawns in x seconds
- "low" in callouts almost always refers to a map location, not health
- "bore pack" / "bore packs" = self-rocket to drop a backpack containing RL for a teammate
- "lost" = died (often accompanied by mm2 text bind showing death location)
- "map lock" = team has full map control, enemy can't get weapons
- "zone" = holding/controlling an area (e.g. "red zone")
- "build" = gather weapons/armor before a push (e.g. "build for penta")
- "team quad" / "team pent" = calling team to group for powerup pickup

Weapon tracking patterns:
- When an enemy holds a key weapon (RL/LG), the team tracks them in real-time
- Sequential calls like "rocket red" -> "rocket tunnel" -> "rocket bridge" mean ONE enemy
  with RL is moving through those locations. The weapon name IS the enemy identifier.
- Specific enemy names are called when tracking: "Milton has rocket", "Milton rocket"
- One stacked enemy with RL is a bigger threat than 3 weak enemies without weapons

Communication meta-patterns:
- Voice (mm3) and text binds (mm2) complement each other. Text binds show item timings,
  death locations, and status. Voice is for callouts, coordination, and reactions.
  The voice transcript alone is incomplete - players also communicate via text binds.
- Call urgency = volume + repetition. "take the rocket, take the rocket" is urgent.
  Calm calls like "yellow safe" are routine status reports.
- Unfinished sentences are normal. Players cut off when the situation changed, someone
  said something more important, or the info became irrelevant. Fragments are not errors.
- Quad timing is often approximate ("quad soon" = within ~10s) because the respawn
  cycle drifts by a few seconds each minute. Precise timing used when pickup was observed.
- Dying to enemy weapons is always reported (shows where enemy RL/LG is).
  Random deaths (bad spawns, suicides) may not be called on voice.

{comms_context}

Analyze the voice communication data and provide actionable feedback.
Be specific - reference exact timestamps, player names, and quotes.
Be constructive but honest. The team wants to improve."""

ANALYSIS_PROMPT_BASE = """Analyze this QuakeWorld 4on4 voice communication data.

## Map: {map_name}

{map_context_section}

{match_result_section}

{player_performance_section}

{item_control_section}

## Communication Statistics
{stats}

## Speech Overlaps (players talking over each other)
{overlaps}

## Full Timeline (chronological)
{timeline}

{intermission_section}

---

Please provide analysis covering each of the following sections.
Format as a clean markdown report with each section as a heading.

{analysis_sections}"""


def build_analysis_sections(has_intermission: bool = False) -> str:
    """Build analysis instruction sections from the report template.

    Reads knowledge/templates/map_report.yaml and generates numbered
    analysis instructions for each section.

    Args:
        has_intermission: Whether intermission data is available
            (skips optional sections when their data is missing).

    Returns:
        Formatted analysis section instructions string.
    """
    template = load_knowledge("templates/map_report.yaml")
    if not template or "sections" not in template:
        # Fallback: minimal instructions if template is missing
        return (
            "1. **Communication Balance** - Who talks most/least?\n"
            "2. **Callout Quality** - Are callouts clear and consistent?\n"
            "3. **Player Recommendations** - Concrete actions to improve\n"
        )

    lines = []
    num = 1
    for section in template["sections"]:
        # Skip optional sections when data is unavailable
        if section.get("optional") and not has_intermission:
            continue

        title = section["title"]
        instruction = section.get("instruction", "").strip()
        lines.append(f"{num}. **{title}**\n{instruction}")
        num += 1

    return "\n\n".join(lines)


def format_comms_context() -> str:
    """Format communication context from knowledge base for the system prompt."""
    glossary = load_knowledge("terminology/qw_glossary.yaml")
    if not glossary:
        return ""

    lines = []

    # Whisper correction notes
    corrections = glossary.get("whisper_corrections", [])
    if corrections:
        lines.append("Known transcription issues (Whisper misheard terms):")
        for c in corrections:
            if isinstance(c, dict):
                lines.append(f"- \"{c.get('misheard')}\" should be \"{c.get('correct')}\" ({c.get('context', '')})")

    return "\n".join(lines)


def format_map_context(map_name: str) -> str:
    """Format map-specific strategy context for the analysis prompt."""
    strategies = load_knowledge("maps/map_strategies.yaml")
    if not strategies or map_name not in strategies:
        return "## Map Context\nNo map-specific strategy data available."

    info = strategies[map_name]
    lines = [f"## Map Context: {info.get('name', map_name)}"]

    items = info.get("items", {})
    if items:
        item_strs = []
        for item, count in items.items():
            if count:
                item_strs.append(f"{item.replace('_', ' ')}: {count}")
        lines.append(f"Items: {', '.join(item_strs)}")

    key_strats = info.get("key_strategies", [])
    if key_strats:
        lines.append("\nKey strategic context:")
        for s in key_strats:
            lines.append(f"- {s}")

    return "\n".join(lines)


def analyze_map(
    map_dir: str,
    config: dict | None = None,
    intermission_context: dict[str, list[dict]] | None = None,
) -> str:
    """Run Claude analysis on a processed map directory.

    Args:
        map_dir: Path to map directory containing transcripts/ subfolder.
        config: Pipeline config.
        intermission_context: Optional dict of label -> timeline entries from
            between-map intermissions (pre-game, post-game, between maps).

    Returns:
        Analysis report as markdown string.
    """
    if config is None:
        config = load_config()

    map_path = Path(map_dir)
    transcripts_dir = map_path / "transcripts"

    # Load data
    timeline_path = transcripts_dir / "merged_timeline.json"
    stats_path = transcripts_dir / "stats.json"
    overlaps_path = transcripts_dir / "overlaps.json"
    metadata_path = map_path / "metadata.json"

    if not timeline_path.exists():
        raise FileNotFoundError(f"No timeline found at {timeline_path}. Run transcription first.")

    with open(timeline_path) as f:
        timeline = json.load(f)
    with open(stats_path) as f:
        stats = json.load(f)
    with open(overlaps_path) as f:
        overlaps = json.load(f)

    # Load match metadata (may not exist for legacy runs)
    match_data = None
    ktxstats = None
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
        match_data = metadata.get("match_data")
        ktxstats = metadata.get("ktxstats")

    # Determine which in-game team is ours by matching Craig speaker names
    # to ktxstats player names (handles pickup games where tag != team name)
    team_name = _detect_our_team(ktxstats, stats)

    # Format sections
    timeline_text = format_timeline(timeline)
    stats_text = json.dumps(stats, indent=2)
    overlaps_text = json.dumps(overlaps[:50], indent=2) if overlaps else "No overlaps detected."

    match_result_text = format_match_result(match_data)
    player_perf_text = format_player_performance(ktxstats, team_name)
    item_control_text = format_item_control(ktxstats, team_name)

    map_name = map_path.name.rsplit("_", 1)[0]  # "dm3_001" -> "dm3"
    # Extract bare map name from dir format like "2026-02-01_]sr[_vs_red_dm3_01"
    # Try to find a known map name in the directory name
    known_maps = config.get("maps", ["dm3", "dm2", "e1m2", "schloss", "phantombase"])
    for m in known_maps:
        if m in map_path.name:
            map_name = m
            break

    map_context_text = format_map_context(map_name)

    # Format intermission context if available
    intermission_text = ""
    if intermission_context:
        intermission_lines = ["## Between-Map Discussion"]
        for label, entries in intermission_context.items():
            if entries:
                intermission_lines.append(f"\n### {label}")
                intermission_lines.append(format_timeline(entries, max_entries=200))
        intermission_text = "\n".join(intermission_lines)
    else:
        intermission_text = ""

    analysis_sections = build_analysis_sections(
        has_intermission=bool(intermission_text),
    )

    prompt = ANALYSIS_PROMPT_BASE.format(
        map_name=map_name,
        map_context_section=map_context_text,
        match_result_section=match_result_text,
        player_performance_section=player_perf_text,
        item_control_section=item_control_text,
        stats=stats_text,
        overlaps=overlaps_text,
        timeline=timeline_text,
        intermission_section=intermission_text,
        analysis_sections=analysis_sections,
    )

    # Call Claude
    from anthropic import Anthropic

    client = Anthropic()  # Uses ANTHROPIC_API_KEY env var

    ac = config["analysis"]
    system_prompt = SYSTEM_PROMPT.format(comms_context=format_comms_context())
    response = client.messages.create(
        model=ac["model"],
        max_tokens=ac["max_tokens"],
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
    )

    report = response.content[0].text

    # Save report
    analysis_dir = ensure_dir(map_path / "analysis")
    report_path = analysis_dir / "report.md"
    with open(report_path, "w") as f:
        f.write(report)

    # Save raw response metadata
    meta = {
        "model": ac["model"],
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "timeline_entries": len(timeline),
        "overlap_events": len(overlaps),
        "has_match_data": match_data is not None,
        "has_ktxstats": ktxstats is not None,
    }
    with open(analysis_dir / "analysis_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Report written to {report_path}")
    print(f"Tokens used: {meta['input_tokens']} in / {meta['output_tokens']} out")

    return report


def _detect_our_team(ktxstats: dict | None, stats: dict) -> str:
    """Detect which in-game team is ours by matching Craig speakers to ktxstats players.

    In pickup games the team name (e.g., 'mix') won't match the clan tag (']sr['),
    so we find the team with the most player name overlaps with our Craig speakers.
    """
    if not ktxstats:
        return ""

    craig_speakers = set(name.lower() for name in stats.get("player_stats", {}).keys())
    if not craig_speakers:
        return ""

    team_scores: dict[str, int] = {}
    for player in ktxstats.get("players", []):
        team = player.get("team", "")
        # Strip QW color codes (leading \x1c bullet character) and whitespace
        name = player.get("name", "").strip().lstrip("\x1c").lstrip("•").strip().lower()
        if name in craig_speakers:
            team_scores[team] = team_scores.get(team, 0) + 1

    if not team_scores:
        return ""

    return max(team_scores, key=team_scores.get)


def format_match_result(match_data: dict | None) -> str:
    """Format match result section for the analysis prompt."""
    if not match_data:
        return "## Match Result\nNo match data available."

    lines = ["## Match Result"]

    teams = match_data.get("teams", [])
    if teams:
        team_strs = []
        for t in teams:
            team_strs.append(f"**{t.get('name', '?')}** ({t.get('frags', '?')} frags)")
        lines.append(" vs ".join(team_strs))

    server = match_data.get("server", "")
    if server:
        lines.append(f"Server: {server}")

    timestamp = match_data.get("timestamp", "")
    if timestamp:
        lines.append(f"Time: {timestamp}")

    confidence = match_data.get("confidence", 0)
    if confidence:
        lines.append(f"Match-recording confidence: {confidence:.0%}")

    return "\n".join(lines)


def format_player_performance(ktxstats: dict | None, team_name: str) -> str:
    """Format player performance section from ktxstats."""
    if not ktxstats:
        return "## Player Performance\nNo ktxstats data available."

    lines = ["## Player Performance"]

    players = ktxstats.get("players", [])
    if not players:
        return "## Player Performance\nNo player data in ktxstats."

    # Filter to team if name provided, otherwise show all
    team_players = []
    enemy_players = []
    for p in players:
        if team_name and p.get("team", "") == team_name:
            team_players.append(p)
        elif team_name:
            enemy_players.append(p)
        else:
            team_players.append(p)

    if team_players:
        lines.append(f"\n### Team ({team_name or 'all'})")
        for p in sorted(team_players, key=lambda x: x.get("stats", {}).get("frags", 0), reverse=True):
            stats = p.get("stats", {})
            weapons = p.get("weapons", {})
            name = p.get("name", "?")
            frags = stats.get("frags", 0)
            deaths = stats.get("deaths", 0)
            damage_given = stats.get("damage_given", 0)
            damage_taken = stats.get("damage_taken", 0)

            lines.append(f"- **{name}**: {frags}F/{deaths}D, dmg {damage_given}/{damage_taken}")

            # Weapon accuracy
            for wep_name, wep_data in weapons.items():
                if isinstance(wep_data, dict) and wep_data.get("acc"):
                    acc = wep_data.get("acc", {})
                    if isinstance(acc, dict) and acc.get("virtual"):
                        lines.append(f"  - {wep_name}: {acc['virtual']:.0%} acc")

    if enemy_players:
        lines.append(f"\n### Opponents")
        for p in sorted(enemy_players, key=lambda x: x.get("stats", {}).get("frags", 0), reverse=True):
            stats = p.get("stats", {})
            name = p.get("name", "?")
            frags = stats.get("frags", 0)
            deaths = stats.get("deaths", 0)
            lines.append(f"- **{name}**: {frags}F/{deaths}D")

    return "\n".join(lines)


def format_item_control(ktxstats: dict | None, team_name: str) -> str:
    """Format item control section from ktxstats."""
    if not ktxstats:
        return "## Item Control\nNo ktxstats data available."

    lines = ["## Item Control"]

    players = ktxstats.get("players", [])
    if not players:
        return "## Item Control\nNo player data in ktxstats."

    # Aggregate item pickups per team
    team_items: dict[str, int] = {}
    enemy_items: dict[str, int] = {}

    for p in players:
        items = p.get("items", {})
        is_team = team_name and p.get("team", "") == team_name
        target = team_items if is_team else enemy_items

        for item_name, item_data in items.items():
            if isinstance(item_data, dict):
                count = item_data.get("count", item_data.get("took", 0))
            else:
                count = item_data
            if count:
                target[item_name] = target.get(item_name, 0) + count

    if team_items:
        lines.append(f"\n### Team ({team_name or 'all'})")
        for item, count in sorted(team_items.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- {item}: {count}")

    if enemy_items:
        lines.append(f"\n### Opponents")
        for item, count in sorted(enemy_items.items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- {item}: {count}")

    return "\n".join(lines)


def format_timeline(timeline: list[dict], max_entries: int = 500) -> str:
    """Format timeline entries as readable text for the prompt."""
    lines = []

    if len(timeline) > max_entries:
        lines.append(f"(Showing {max_entries} of {len(timeline)} entries)\n")
        timeline = timeline[:max_entries]

    for entry in timeline:
        mins = int(entry["start"] // 60)
        secs = entry["start"] % 60
        timestamp = f"{mins:02d}:{secs:05.2f}"
        lines.append(f"[{timestamp}] {entry['speaker']}: {entry['text']}")

    return "\n".join(lines)


def main():
    """CLI entrypoint."""
    if len(sys.argv) < 2:
        print("Usage: python analyzer.py <map_dir>")
        sys.exit(1)

    map_dir = sys.argv[1]

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        print("Export it: export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    report = analyze_map(map_dir)
    print("\n" + "=" * 60)
    print(report)


if __name__ == "__main__":
    main()
