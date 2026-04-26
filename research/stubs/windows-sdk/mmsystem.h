/*
 * Minimal mmsystem.h stub for libclang extraction on Linux.
 * See windows.h in this directory for usage notes.
 * Covers multimedia timer + wave audio types used by Quake engines.
 */
#ifndef _MMSYSTEM_STUB_H
#define _MMSYSTEM_STUB_H

#ifndef _WINDOWS_STUB_H
#include "windows.h"
#endif

typedef DWORD   MMRESULT;
typedef UINT    MMVERSION;
typedef void*   HWAVEOUT;
typedef void*   HWAVEIN;
typedef void*   HMIDI;
typedef void*   HMIXEROBJ;
typedef void*   HMIXER;
typedef UINT    MMIOINFO;

#define MMSYSERR_NOERROR        0
#define MMSYSERR_ERROR          1
#define MMSYSERR_BADDEVICEID    2
#define MMSYSERR_NOTENABLED     3
#define MMSYSERR_ALLOCATED      4
#define MMSYSERR_INVALHANDLE    5

#define WAVE_FORMAT_PCM         1
#define WAVE_FORMAT_IEEE_FLOAT  3
#define WAVE_MAPPER             ((UINT)-1)

#define CALLBACK_NULL           0x00000000
#define CALLBACK_FUNCTION       0x00030000
#define CALLBACK_THREAD         0x00020000
#define CALLBACK_WINDOW         0x00010000
#define CALLBACK_EVENT          0x00050000

#define WHDR_DONE               0x00000001
#define WHDR_PREPARED           0x00000002
#define WHDR_BEGINLOOP          0x00000004
#define WHDR_ENDLOOP            0x00000008
#define WHDR_INQUEUE            0x00000010

typedef struct tWAVEFORMATEX {
    WORD  wFormatTag;
    WORD  nChannels;
    DWORD nSamplesPerSec;
    DWORD nAvgBytesPerSec;
    WORD  nBlockAlign;
    WORD  wBitsPerSample;
    WORD  cbSize;
} WAVEFORMATEX, *PWAVEFORMATEX, *LPWAVEFORMATEX;

typedef struct tWAVEFORMATEXTENSIBLE {
    WAVEFORMATEX Format;
    union { WORD wValidBitsPerSample; WORD wSamplesPerBlock; WORD wReserved; } Samples;
    DWORD dwChannelMask;
    /* GUID SubFormat omitted -- too complex for stub */
    BYTE SubFormat[16];
} WAVEFORMATEXTENSIBLE, *PWAVEFORMATEXTENSIBLE;

typedef struct wavehdr_tag {
    char  *lpData;
    DWORD dwBufferLength;
    DWORD dwBytesRecorded;
    DWORD_PTR dwUser;
    DWORD dwFlags;
    DWORD dwLoops;
    struct wavehdr_tag *lpNext;
    DWORD_PTR reserved;
} WAVEHDR, *PWAVEHDR, *LPWAVEHDR;

typedef struct waveoutcaps_tag {
    WORD  wMid;
    WORD  wPid;
    MMVERSION vDriverVersion;
    char  szPname[32];
    DWORD dwFormats;
    WORD  wChannels;
    WORD  wReserved1;
    DWORD dwSupport;
} WAVEOUTCAPSA, *LPWAVEOUTCAPSA;

/* Multimedia timer */
DWORD    timeGetTime(void);
MMRESULT timeBeginPeriod(UINT uPeriod);
MMRESULT timeEndPeriod(UINT uPeriod);
UINT     timeGetDevCaps(void *ptc, UINT cbtc);
UINT     timeSetEvent(UINT uDelay, UINT uResolution, void *lpTimeProc, DWORD_PTR dwUser, UINT fuEvent);
BOOL     timeKillEvent(UINT uTimerID);

/* Wave output */
MMRESULT waveOutOpen(HWAVEOUT *phwo, UINT uDeviceID, WAVEFORMATEX *pwfx, DWORD_PTR dwCallback, DWORD_PTR dwInstance, DWORD fdwOpen);
MMRESULT waveOutClose(HWAVEOUT hwo);
MMRESULT waveOutPrepareHeader(HWAVEOUT hwo, WAVEHDR *pwh, UINT cbwh);
MMRESULT waveOutUnprepareHeader(HWAVEOUT hwo, WAVEHDR *pwh, UINT cbwh);
MMRESULT waveOutWrite(HWAVEOUT hwo, WAVEHDR *pwh, UINT cbwh);
MMRESULT waveOutReset(HWAVEOUT hwo);
MMRESULT waveOutPause(HWAVEOUT hwo);
MMRESULT waveOutRestart(HWAVEOUT hwo);
MMRESULT waveOutGetPosition(HWAVEOUT hwo, void *pmmt, UINT cbmmt);
MMRESULT waveOutGetDevCapsA(UINT_PTR uDeviceID, WAVEOUTCAPSA *pwoc, UINT cbwoc);
UINT     waveOutGetNumDevs(void);

/* mmreg.h content -- included by FTE's winquake.h after mmsystem.h */
#define _LPCWAVEFORMATEX_DEFINED

#endif /* _MMSYSTEM_STUB_H */
