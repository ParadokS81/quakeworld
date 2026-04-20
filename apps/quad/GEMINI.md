# Quad Gemini Guidelines

## Core Architecture
- **Lightweight Modules**: Each feature in `src/modules/` is self-contained.
- **Reference**: Read `OVERVIEW.md` for the current map of modules.

## Technical Mandates
- **OGG/Opus Passthrough**: Never transcode. Wrap original frames in OGG.
- **Stream to Disk**: Never buffer entire sessions; stream directly for memory efficiency and recovery.
- **One File Per Speaker**: Continuous file per session (`EndBehaviorType.Manual`).
- **Bot Config**: `selfDeaf: false, selfMute: true`.
- **Public Contract**: `session_metadata.json` is the source of truth for session data.

## Environment Constraints
- **Node.js**: >= 22.12.0
- **TypeScript**: 5+
- **Prism-media**: must be 2.0.0-alpha.0
- **UTC**: All timestamps must be UTC with millisecond precision.

## Development
- **Compile Often**: Run `npx tsc --noEmit` to check types.
- **Git Safety**: Audio files are gitignored; never commit them.
- **Simplicity**: Favor three similar lines over a premature abstraction.
