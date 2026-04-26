/*
 * Minimal d3d.h stub for libclang extraction on Linux.
 * See windows.h in this directory for usage notes.
 * Covers Direct3D 7-era types potentially referenced by QWCL's ddraw-based
 * code paths. QWCL itself doesn't use D3D directly but ddraw.h sometimes
 * pulls d3d.h transitively in real Windows SDK installs.
 */
#ifndef _D3D_STUB_H
#define _D3D_STUB_H

#ifndef _WINDOWS_STUB_H
#include "windows.h"
#endif

#ifndef _DDRAW_STUB_H
#include "ddraw.h"
#endif

/* Opaque D3D interface pointers */
typedef void* LPDIRECT3D;
typedef void* LPDIRECT3D2;
typedef void* LPDIRECT3D3;
typedef void* LPDIRECT3D7;
typedef void* LPDIRECT3DDEVICE;
typedef void* LPDIRECT3DDEVICE2;
typedef void* LPDIRECT3DDEVICE3;
typedef void* LPDIRECT3DDEVICE7;
typedef void* LPDIRECT3DVIEWPORT;
typedef void* LPDIRECT3DVIEWPORT2;
typedef void* LPDIRECT3DVIEWPORT3;
typedef void* LPDIRECT3DMATERIAL;
typedef void* LPDIRECT3DMATERIAL2;
typedef void* LPDIRECT3DMATERIAL3;
typedef void* LPDIRECT3DLIGHT;
typedef void* LPDIRECT3DTEXTURE;
typedef void* LPDIRECT3DTEXTURE2;
typedef void* LPDIRECT3DVERTEXBUFFER;
typedef void* LPDIRECT3DVERTEXBUFFER7;

/* D3D error codes */
#define D3D_OK                  0
#define D3DERR_WRONGTEXTUREFORMAT   0x88760088L
#define D3DERR_UNSUPPORTEDCOLOROPERATION 0x88760096L

/* Vertex format flags */
#define D3DFVF_XYZ             0x002
#define D3DFVF_XYZRHW          0x004
#define D3DFVF_DIFFUSE         0x040
#define D3DFVF_SPECULAR        0x080
#define D3DFVF_TEX1            0x100
#define D3DFVF_TEX2            0x200

/* Primitive types */
#define D3DPT_POINTLIST         1
#define D3DPT_LINELIST          2
#define D3DPT_LINESTRIP         3
#define D3DPT_TRIANGLELIST      4
#define D3DPT_TRIANGLESTRIP     5
#define D3DPT_TRIANGLEFAN       6

typedef unsigned long D3DCOLOR;
typedef float D3DVALUE;

typedef struct _D3DVERTEX {
    D3DVALUE x, y, z;
    D3DVALUE nx, ny, nz;
    D3DVALUE tu, tv;
} D3DVERTEX;

typedef struct _D3DLVERTEX {
    D3DVALUE x, y, z;
    DWORD dwReserved;
    D3DCOLOR color;
    D3DCOLOR specular;
    D3DVALUE tu, tv;
} D3DLVERTEX;

typedef struct _D3DTLVERTEX {
    D3DVALUE sx, sy, sz, rhw;
    D3DCOLOR color;
    D3DCOLOR specular;
    D3DVALUE tu, tv;
} D3DTLVERTEX;

typedef struct _D3DRECT {
    LONG x1, y1, x2, y2;
} D3DRECT;

typedef struct _D3DVECTOR {
    D3DVALUE x, y, z;
} D3DVECTOR;

typedef struct _D3DMATRIX {
    D3DVALUE _11, _12, _13, _14;
    D3DVALUE _21, _22, _23, _24;
    D3DVALUE _31, _32, _33, _34;
    D3DVALUE _41, _42, _43, _44;
} D3DMATRIX;

typedef struct _D3DVIEWPORT7 {
    DWORD dwX, dwY, dwWidth, dwHeight;
    float dvMinZ, dvMaxZ;
} D3DVIEWPORT7;

typedef struct _D3DMATERIAL7 {
    D3DVALUE diffuse_r, diffuse_g, diffuse_b, diffuse_a;
    D3DVALUE ambient_r, ambient_g, ambient_b, ambient_a;
    D3DVALUE specular_r, specular_g, specular_b, specular_a;
    D3DVALUE emissive_r, emissive_g, emissive_b, emissive_a;
    D3DVALUE power;
} D3DMATERIAL7;

typedef struct _D3DCAPS7 {
    DWORD dwCaps;
    DWORD dwCaps2;
    DWORD dwCaps3;
    DWORD dwAlphaCmpCaps;
    DWORD dwSrcBlendCaps;
    DWORD dwDestBlendCaps;
    DWORD dwTextureCaps;
    DWORD dwTextureFilterCaps;
    DWORD dwTextureBlendCaps;
    DWORD dwTextureAddressCaps;
    DWORD dwLineCaps;
    DWORD dwMaxTextureWidth;
    DWORD dwMaxTextureHeight;
    DWORD dwMaxTextureRepeat;
    DWORD dwMaxTextureAspectRatio;
    DWORD dwMaxAnisotropy;
    D3DVALUE dvGuardBandLeft;
    D3DVALUE dvGuardBandTop;
    D3DVALUE dvGuardBandRight;
    D3DVALUE dvGuardBandBottom;
    D3DVALUE dvExtentsAdjust;
    DWORD dwStencilCaps;
    DWORD dwFVFCaps;
    DWORD dwTextureOpCaps;
    WORD  wMaxTextureBlendStages;
    WORD  wMaxSimultaneousTextures;
    DWORD dwMaxActiveLights;
    D3DVALUE dvMaxVertexW;
    WORD  wMaxUserClipPlanes;
    WORD  wMaxVertexBlendMatrices;
    DWORD dwVertexProcessingCaps;
    DWORD dwReserved1;
    DWORD dwReserved2;
    DWORD dwReserved3;
    DWORD dwReserved4;
} D3DDEVICEDESC7;

#endif /* _D3D_STUB_H */
