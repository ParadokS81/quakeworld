/*
 * Minimal ddraw.h stub for libclang extraction on Linux.
 * See windows.h in this directory for usage notes.
 * Covers DirectDraw 1 types used by QWCL's old software renderer (vid_win.c).
 * QWCL uses the original DirectDraw 1 API, not the later DDraw7 interfaces.
 */
#ifndef _DDRAW_STUB_H
#define _DDRAW_STUB_H

#ifndef _WINDOWS_STUB_H
#include "windows.h"
#endif

/* Opaque interface pointers */
typedef void* LPDIRECTDRAW;
typedef void* LPDIRECTDRAW2;
typedef void* LPDIRECTDRAW4;
typedef void* LPDIRECTDRAW7;
typedef void* LPDIRECTDRAWSURFACE;
typedef void* LPDIRECTDRAWSURFACE2;
typedef void* LPDIRECTDRAWSURFACE4;
typedef void* LPDIRECTDRAWSURFACE7;
typedef void* LPDIRECTDRAWPALETTE;
typedef void* LPDIRECTDRAWCLIPPER;

/* Surface capability flags */
#define DDSCAPS_PRIMARYSURFACE      0x00000200
#define DDSCAPS_OFFSCREENPLAIN      0x00000040
#define DDSCAPS_VIDEOMEMORY         0x00004000
#define DDSCAPS_SYSTEMMEMORY        0x00000800
#define DDSCAPS_FLIP                0x00000010
#define DDSCAPS_BACKBUFFER          0x00000004
#define DDSCAPS_FRONTBUFFER         0x00000020
#define DDSCAPS_COMPLEX             0x00000008
#define DDSCAPS_OVERLAY             0x00000080
#define DDSCAPS_PALETTE             0x00000100
#define DDSCAPS_TEXTURE             0x00001000
#define DDSCAPS_ZBUFFER             0x00002000

/* Surface description flags */
#define DDSD_CAPS                   0x00000001
#define DDSD_HEIGHT                 0x00000002
#define DDSD_WIDTH                  0x00000004
#define DDSD_PITCH                  0x00000008
#define DDSD_PIXELFORMAT            0x00001000
#define DDSD_BACKBUFFERCOUNT        0x00000020

/* DDLOCK flags */
#define DDLOCK_WAIT                 0x00000001
#define DDLOCK_SURFACEMEMORYPTR     0x00000000
#define DDLOCK_READONLY             0x00000010
#define DDLOCK_WRITEONLY            0x00000020

/* Cooperative level flags */
#define DDSCL_EXCLUSIVE             0x00000010
#define DDSCL_FULLSCREEN            0x00000001
#define DDSCL_NORMAL                0x00000008
#define DDSCL_NOWINDOWCHANGES       0x00000004
#define DDSCL_SETFOCUSWINDOW        0x00000080

/* Error codes */
#define DD_OK                           0
#define DDERR_GENERIC                   0x80004005L
#define DDERR_INCOMPATIBLEPRIMARY       0x88760127L
#define DDERR_INVALIDCAPS               0x88760012L
#define DDERR_INVALIDPARAMS             0x80070057L
#define DDERR_NOEXCLUSIVEMODE           0x88760028L
#define DDERR_SURFACELOST               0x88760044L
#define DDERR_WASSTILLDRAWING           0x88760054L

typedef struct _DDSCAPS {
    DWORD dwCaps;
} DDSCAPS, *LPDDSCAPS;

typedef struct _DDSCAPS2 {
    DWORD dwCaps;
    DWORD dwCaps2;
    DWORD dwCaps3;
    union { DWORD dwCaps4; DWORD dwVolumeDepth; };
} DDSCAPS2, *LPDDSCAPS2;

typedef struct _DDPIXELFORMAT {
    DWORD dwSize;
    DWORD dwFlags;
    DWORD dwFourCC;
    union { DWORD dwRGBBitCount; DWORD dwYUVBitCount; DWORD dwZBufferBitDepth; DWORD dwAlphaBitDepth; };
    union { DWORD dwRBitMask; DWORD dwYBitMask; };
    union { DWORD dwGBitMask; DWORD dwUBitMask; };
    union { DWORD dwBBitMask; DWORD dwVBitMask; };
    union { DWORD dwRGBAlphaBitMask; DWORD dwYUVAlphaBitMask; DWORD dwRGBZBitMask; DWORD dwYUVZBitMask; };
} DDPIXELFORMAT, *LPDDPIXELFORMAT;

typedef struct _DDSURFACEDESC {
    DWORD       dwSize;
    DWORD       dwFlags;
    DWORD       dwHeight;
    DWORD       dwWidth;
    LONG        lPitch;
    DWORD       dwBackBufferCount;
    DWORD       dwMipMapCount;
    DWORD       dwAlphaBitDepth;
    DWORD       dwReserved;
    LPVOID      lpSurface;
    DWORD       ddckCKDestOverlayColorKey[2];
    DWORD       ddckCKDestBltColorKey[2];
    DWORD       ddckCKSrcOverlayColorKey[2];
    DWORD       ddckCKSrcBltColorKey[2];
    DDPIXELFORMAT ddpfPixelFormat;
    DDSCAPS     ddsCaps;
    DWORD       dwTextureStage;
} DDSURFACEDESC, *LPDDSURFACEDESC;

typedef struct _DDSURFACEDESC2 {
    DWORD       dwSize;
    DWORD       dwFlags;
    DWORD       dwHeight;
    DWORD       dwWidth;
    LONG        lPitch;
    DWORD       dwBackBufferCount;
    DWORD       dwMipMapCount;
    DWORD       dwAlphaBitDepth;
    DWORD       dwReserved;
    LPVOID      lpSurface;
    DWORD       ddckCKDestOverlayColorKey[2];
    DWORD       ddckCKDestBltColorKey[2];
    DWORD       ddckCKSrcOverlayColorKey[2];
    DWORD       ddckCKSrcBltColorKey[2];
    DDPIXELFORMAT ddpfPixelFormat;
    DDSCAPS2    ddsCaps;
    DWORD       dwTextureStage;
} DDSURFACEDESC2, *LPDDSURFACEDESC2;

typedef struct _DDCAPS {
    DWORD dwSize;
    DWORD dwCaps;
    DWORD dwCaps2;
    DWORD dwCKeyCaps;
    DWORD dwFXCaps;
    DWORD dwFXAlphaCaps;
    DWORD dwPalCaps;
    DWORD dwSVCaps;
    DWORD dwAlphaBltConstBitDepths;
    DWORD dwAlphaBltPixelBitDepths;
    DWORD dwAlphaBltSurfaceBitDepths;
    DWORD dwAlphaOverlayConstBitDepths;
    DWORD dwAlphaOverlayPixelBitDepths;
    DWORD dwAlphaOverlaySurfaceBitDepths;
    DWORD dwZBufferBitDepths;
    DWORD dwVidMemTotal;
    DWORD dwVidMemFree;
    DWORD dwMaxVisibleOverlays;
    DWORD dwCurrVisibleOverlays;
    DWORD dwNumFourCCCodes;
    DWORD dwAlignBoundarySrc;
    DWORD dwAlignSizeSrc;
    DWORD dwAlignBoundaryDest;
    DWORD dwAlignSizeDest;
    DWORD dwAlignStrideAlign;
    DWORD dwRops[8];
    DDSCAPS ddsCaps;
    DWORD dwMinOverlayStretch;
    DWORD dwMaxOverlayStretch;
} DDCAPS, *LPDDCAPS;

/* DirectDraw creation */
typedef HRESULT (*LPDDENUMMODESCALLBACK)(DDSURFACEDESC*, void*);
typedef HRESULT (*LPDDENUMMODESCALLBACK2)(DDSURFACEDESC2*, void*);

HRESULT DirectDrawCreate(void *lpGUID, LPDIRECTDRAW *lplpDD, void *pUnkOuter);
HRESULT DirectDrawCreateEx(void *lpGUID, void **lplpDD, void *iid, void *pUnkOuter);
HRESULT DirectDrawEnumerateA(void *lpCallback, void *lpContext);

#endif /* _DDRAW_STUB_H */
