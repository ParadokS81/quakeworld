; QW Voice Analysis - Match Marker Script (AutoHotkey v2)
; Watches voice_marker.log for match start/end and triggers Soundpad tones
;
; Prerequisites:
;   1. Soundpad running with match_start.wav and match_end.wav loaded
;   2. Soundpad hotkeys configured:
;      - Ctrl+Shift+F9  = play match_start.wav
;      - Ctrl+Shift+F10 = play match_end.wav
;   3. ezQuake aliases (in config.cfg):
;      alias on_matchstart "log voice_marker; echo [MARKER_START] >>> MATCH STARTED"
;      alias on_matchend   "echo [MARKER_END] >>> MATCH ENDED; log stop"
;
; How it works:
;   - ezQuake's on_matchstart alias creates voice_marker.log in real-time
;   - This script watches that file for [MARKER_START] / [MARKER_END]
;   - Fires Soundpad hotkey to inject marker tone into mic
;   - When match ends, ezQuake stops the log and AHK resets for next match
;
; Usage: Run this script before starting a gaming session

#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; === CONFIGURATION ===
MarkerLog := "C:\Games\QuakeWorld\QuakeWorld\qw\matches\4on4\voice_marker.log"

StartToneHotkey := "^+{F9}"    ; Ctrl+Shift+F9
EndToneHotkey := "^+{F10}"     ; Ctrl+Shift+F10

CheckInterval := 300

; === STATE ===
LastFileSize := 0
LastModTime := ""
StartSent := false
EndSent := false

; === STARTUP ===
; Delete stale marker log from previous session
if FileExist(MarkerLog) {
    try FileDelete(MarkerLog)
}

A_IconTip := "QW Voice Markers - Waiting for match"
TrayTip("Watching for matches", "QW Voice Markers", 1)

SetTimer(CheckMarkerLog, CheckInterval)

; === MARKER LOG WATCHER ===
CheckMarkerLog() {
    global MarkerLog, LastFileSize, LastModTime
    global StartSent, EndSent, StartToneHotkey, EndToneHotkey

    if !FileExist(MarkerLog)  {
        ; File gone = match ended and log stopped, reset for next match
        if (LastFileSize > 0) {
            LastFileSize := 0
            LastModTime := ""
            StartSent := false
            EndSent := false
            A_IconTip := "QW Voice Markers - Waiting for match"
        }
        return
    }

    ; Check if file has changed
    CurrentModTime := FileGetTime(MarkerLog, "M")
    if (CurrentModTime = LastModTime)
        return

    LastModTime := CurrentModTime
    CurrentSize := FileGetSize(MarkerLog)
    if (CurrentSize <= LastFileSize)
        return

    ; Read new content
    try {
        Content := FileRead(MarkerLog)
        NewContent := SubStr(Content, LastFileSize + 1)
        LastFileSize := CurrentSize
    } catch {
        return  ; File locked by ezQuake, try next tick
    }

    ; Scan for markers
    Loop Parse, NewContent, "`n", "`r"
    {
        Line := A_LoopField

        if InStr(Line, "[MARKER_START]") && !StartSent {
            Send(StartToneHotkey)
            TrayTip("Match START marker sent", "QW Voice Markers", 1)
            StartSent := true
            A_IconTip := "QW Voice Markers - Match in progress"
        }
        else if InStr(Line, "[MARKER_END]") && !EndSent {
            Send(EndToneHotkey)
            TrayTip("Match END marker sent", "QW Voice Markers", 1)
            EndSent := true
            A_IconTip := "QW Voice Markers - Match complete"
        }
    }
}

; === EXIT ===
^+F12:: {  ; Ctrl+Shift+F12 to exit
    ExitApp()
}
