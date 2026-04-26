/*
 * Minimal dsound.h stub for libclang extraction on Linux.
 * See windows.h in this directory for usage notes.
 * Covers DirectSound types included by QWCL's winquake.h.
 */
#ifndef _DSOUND_STUB_H
#define _DSOUND_STUB_H

#ifndef _WINDOWS_STUB_H
#include "windows.h"
#endif

/* Opaque interface pointers */
typedef void* LPDIRECTSOUND;
typedef void* LPDIRECTSOUND8;
typedef void* LPDIRECTSOUNDBUFFER;
typedef void* LPDIRECTSOUNDBUFFER8;
typedef void* LPDIRECTSOUNDNOTIFY;
typedef void* LPDIRECTSOUNDCAPTURE;
typedef void* LPDIRECTSOUNDCAPTUREBUFFER;
typedef void* LPDIRECTSOUND3DBUFFER;
typedef void* LPDIRECTSOUND3DLISTENER;

/* Error codes */
#define DS_OK                   0
#define DSERR_ALLOCATED         0x8878000aL
#define DSERR_CONTROLUNAVAIL    0x8878001eL
#define DSERR_INVALIDPARAM      0x80070057L
#define DSERR_INVALIDCALL       0x88780032L
#define DSERR_GENERIC           0x80004005L
#define DSERR_PRIOLEVELNEEDED   0x88780046L
#define DSERR_OUTOFMEMORY       0x8007000eL
#define DSERR_BADFORMAT         0x88780064L
#define DSERR_UNSUPPORTED       0x80004001L
#define DSERR_NODRIVER          0x88780078L
#define DSERR_ALREADYINITIALIZED 0x88780082L
#define DSERR_NOAGGREGATION     0x80040110L
#define DSERR_BUFFERLOST        0x88780096L
#define DSERR_OTHERAPPHASPRIO   0x888700a0L
#define DSERR_UNINITIALIZED     0x888700aaL

/* Buffer capabilities flags */
#define DSBCAPS_PRIMARYBUFFER   0x00000001
#define DSBCAPS_STATIC          0x00000002
#define DSBCAPS_LOCHARDWARE     0x00000004
#define DSBCAPS_LOCSOFTWARE     0x00000008
#define DSBCAPS_CTRL3D          0x00000010
#define DSBCAPS_CTRLFREQUENCY   0x00000020
#define DSBCAPS_CTRLPAN         0x00000040
#define DSBCAPS_CTRLVOLUME      0x00000080
#define DSBCAPS_CTRLPOSITIONNOTIFY 0x00000100
#define DSBCAPS_GETCURRENTPOSITION2 0x00010000
#define DSBCAPS_GLOBALFOCUS     0x00008000
#define DSBCAPS_STICKYFOCUS     0x00004000

/* Volume / pan constants */
#define DSBVOLUME_MIN           (-10000)
#define DSBVOLUME_MAX           0
#define DSBPAN_LEFT             (-10000)
#define DSBPAN_RIGHT            10000
#define DSBPAN_CENTER           0

/* Lock flags */
#define DSBLOCK_FROMWRITECURSOR 0x00000001
#define DSBLOCK_ENTIREBUFFER    0x00000002

/* Play flags */
#define DSBPLAY_LOOPING         0x00000001

/* Cooperative level */
#define DSSCL_NORMAL            0x00000001
#define DSSCL_PRIORITY          0x00000002
#define DSSCL_EXCLUSIVE         0x00000003
#define DSSCL_WRITEPRIMARY      0x00000004

#ifndef _WINSOCK2_STUB_H
/* WAVEFORMATEX already defined in mmsystem.h but include-guard-safe: */
#endif

typedef struct _DSBUFFERDESC {
    DWORD    dwSize;
    DWORD    dwFlags;
    DWORD    dwBufferBytes;
    DWORD    dwReserved;
    void    *lpwfxFormat;  /* WAVEFORMATEX* -- use void* to avoid dep on mmsystem.h order */
    /* GUID guid3DAlgorithm; -- GUID type not stubbed, omit */
    BYTE     guid3DAlgorithm[16];
} DSBUFFERDESC, *LPDSBUFFERDESC;

typedef struct _DSBPOSITIONNOTIFY {
    DWORD dwOffset;
    HANDLE hEventNotify;
} DSBPOSITIONNOTIFY, *LPDSBPOSITIONNOTIFY;

typedef struct _DSCAPS {
    DWORD dwSize;
    DWORD dwFlags;
    DWORD dwMinSecondarySampleRate;
    DWORD dwMaxSecondarySampleRate;
    DWORD dwPrimaryBuffers;
    DWORD dwMaxHwMixingAllBuffers;
    DWORD dwMaxHwMixingStaticBuffers;
    DWORD dwMaxHwMixingStreamingBuffers;
    DWORD dwFreeHwMixingAllBuffers;
    DWORD dwFreeHwMixingStaticBuffers;
    DWORD dwFreeHwMixingStreamingBuffers;
    DWORD dwMaxHw3DAllBuffers;
    DWORD dwMaxHw3DStaticBuffers;
    DWORD dwMaxHw3DStreamingBuffers;
    DWORD dwFreeHw3DAllBuffers;
    DWORD dwFreeHw3DStaticBuffers;
    DWORD dwFreeHw3DStreamingBuffers;
    DWORD dwTotalHwMemBytes;
    DWORD dwFreeHwMemBytes;
    DWORD dwMaxContigFreeHwMemBytes;
    DWORD dwUnlockTransferRateHwBuffers;
    DWORD dwPlayCpuOverheadSwBuffers;
    DWORD dwReserved1;
    DWORD dwReserved2;
} DSCAPS, *LPDSCAPS;

HRESULT DirectSoundCreate(void *pcGuidDevice, LPDIRECTSOUND *ppDS, void *pUnkOuter);
HRESULT DirectSoundCreate8(void *pcGuidDevice, LPDIRECTSOUND8 *ppDS, void *pUnkOuter);
HRESULT DirectSoundEnumerateA(void *pDSEnumCallback, void *pContext);
HRESULT DirectSoundCaptureCreate(void *pcGuidDevice, LPDIRECTSOUNDCAPTURE *ppDSC, void *pUnkOuter);

#endif /* _DSOUND_STUB_H */
