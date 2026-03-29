"""Shared audio utility functions."""

import yaml
from pathlib import Path

from pydub import AudioSegment


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def load_config() -> dict:
    """Load pipeline configuration from settings.yaml."""
    config_path = get_project_root() / "config" / "settings.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def load_knowledge(filename: str) -> dict:
    """Load a YAML knowledge file from the knowledge/ directory.

    Args:
        filename: Relative path within knowledge/ (e.g., "team/player_mappings.yaml").

    Returns:
        Parsed YAML dict, or empty dict if file not found.
    """
    knowledge_path = get_project_root() / "knowledge" / filename
    if not knowledge_path.exists():
        return {}
    with open(knowledge_path) as f:
        return yaml.safe_load(f) or {}


def ensure_dir(path: str | Path) -> Path:
    """Create directory if it doesn't exist, return Path."""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_player_name(filename: str) -> str:
    """Extract player name from Craig export filename.

    Craig files are named like: 0-ParadokS.flac, 1-Razor.flac
    """
    basename = Path(filename).stem
    # Remove the leading track number and dash
    parts = basename.split("-", 1)
    if len(parts) == 2 and parts[0].isdigit():
        return parts[1]
    return basename


def get_audio_duration(audio_path: str | Path) -> float:
    """Get the duration of an audio file in seconds.

    Args:
        audio_path: Path to the audio file (FLAC, WAV, etc).

    Returns:
        Duration in seconds as float.
    """
    audio = AudioSegment.from_file(str(audio_path))
    return len(audio) / 1000.0


def build_whisper_prompt(map_name: str = "") -> str:
    """Build a Whisper initial_prompt from the QW glossary.

    The initial_prompt biases Whisper toward recognizing QW-specific
    vocabulary (item names, callouts, locations) instead of guessing
    common English words.

    Args:
        map_name: Optional map name (e.g., "dm3") to include map-specific callouts.

    Returns:
        A string of QW terms for Whisper's initial_prompt parameter.
    """
    glossary = load_knowledge("terminology/qw_glossary.yaml")
    if not glossary:
        return ""

    terms = []

    # Item names
    items = glossary.get("items", {})
    for category in items.values():
        if isinstance(category, list):
            terms.extend(category)

    # Action callouts
    actions = glossary.get("actions", [])
    if isinstance(actions, list):
        terms.extend(actions)

    # Map-specific callouts
    if map_name:
        map_callouts = glossary.get("map_callouts", {}).get(map_name, [])
        if isinstance(map_callouts, list):
            terms.extend(map_callouts)

    # Known player names (teammates + opponents)
    player_names = glossary.get("known_player_names", [])
    if isinstance(player_names, list):
        terms.extend(player_names)

    # Include correct forms from whisper_corrections so Whisper prefers them
    corrections = glossary.get("whisper_corrections", [])
    for c in corrections:
        if isinstance(c, dict) and c.get("correct"):
            correct = c["correct"]
            if correct != "unknown - needs verification":
                terms.append(correct)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in terms:
        if t not in seen:
            seen.add(t)
            unique.append(t)

    return ", ".join(unique)


def resolve_player_name(
    discord_username: str,
    discord_display_name: str = "",
    player_name_map: dict[str, str] | None = None,
) -> str:
    """Resolve a player's display name from Discord info and optional mapping.

    Priority:
        1. player_name_map lookup by discord_username (case-insensitive)
        2. discord_display_name (globalName from Craig)
        3. discord_username

    Args:
        discord_username: Discord username (e.g., "paradoks").
        discord_display_name: Discord display/global name (e.g., "ParadokS").
        player_name_map: Optional dict mapping lowercase discord usernames to QW names.

    Returns:
        Resolved player name string.
    """
    if player_name_map and discord_username.lower() in player_name_map:
        return player_name_map[discord_username.lower()]
    if discord_display_name:
        return discord_display_name
    return discord_username
