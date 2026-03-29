QW Voice Analysis - Marker Kit
================================

This kit injects inaudible marker tones into your Discord voice channel
when QuakeWorld matches start and end. These markers allow automatic
splitting of Craig bot recordings by map.

REQUIREMENTS
- Soundpad (https://leppsoft.com/soundpad/)
- AutoHotkey v1.1+ (https://www.autohotkey.com/)
- Craig bot recording your Discord voice channel

SETUP (one-time)

1. Copy tones/match_start.wav and tones/match_end.wav into Soundpad
2. In Soundpad, assign hotkeys:
   - match_start.wav → Ctrl+Shift+F9
   - match_end.wav   → Ctrl+Shift+F10
3. In Soundpad settings, ensure output goes to microphone (not speakers)
4. Copy ezquake/voice_markers.cfg to your ezQuake folder
5. In ezQuake console: exec voice_markers.cfg

USAGE (every session)

1. Start Soundpad
2. Run ahk/qw_markers.ahk (double-click it)
3. Start Craig recording in Discord
4. Play QuakeWorld as normal
5. Markers are injected automatically at match start/end
6. Stop Craig when done, download FLAC multi-track export

The tray icon shows "QW Voice Markers" when the script is active.
Press Ctrl+Shift+F12 to stop the marker script.

NOTES
- The tones are at 18kHz / 17.5kHz - above normal hearing range
- Even if faintly audible, they are 150ms long and very quiet
- The tones only go to Discord via Soundpad, not to your headphones
- If Soundpad hotkeys don't match, edit ahk/qw_markers.ahk
