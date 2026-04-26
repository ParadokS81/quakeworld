/*
 * Minimal Windows SDK stub for libclang extraction on Linux.
 *
 * Provides just enough type and constant declarations for libclang to
 * type-check function bodies in Windows-specific Quake engine source files
 * (sys_win.c, vid_win.c, gl_vidnt.c, etc.). These stubs are NOT a Windows
 * SDK replacement and must never be used for compilation or linking.
 *
 * Types are declared as opaque typedefs (void* for handles, unsigned
 * integers for value types). Functions are declared with correct signatures
 * but no bodies. The goal is: "let libclang parse the function body without
 * type errors so the AST walker can reach COM_CheckParm / cvar_t call sites
 * inside it."
 *
 * When a new engine port surfaces a missing type: add the minimum declaration
 * here (one typedef or one function prototype). Keep it minimal.
 */
#ifndef _WINDOWS_STUB_H
#define _WINDOWS_STUB_H

/* Prevent re-entry if real headers somehow appear */
#define _WINDOWS_
#define WIN32_LEAN_AND_MEAN

/* ---- Core integer types ---- */
typedef int                 BOOL;
typedef unsigned char       BYTE;
typedef unsigned short      WORD;
typedef unsigned int        UINT;
typedef unsigned long       DWORD;
typedef long                LONG;
typedef unsigned long       ULONG;
typedef long long           LONGLONG;
typedef unsigned long long  ULONGLONG;
typedef long                HRESULT;
typedef long long           DWORD64;
typedef unsigned long long  ULONG64;

/* ---- Calling conventions (no-op on Linux) ---- */
#define WINAPI
#define CALLBACK
#define APIENTRY
#define DECLSPEC_NORETURN

/* ---- Pointer handle types (opaque) ---- */
typedef void*               HANDLE;
typedef void*               HMODULE;
typedef void*               HINSTANCE;
typedef void*               HWND;
typedef void*               HMENU;
typedef void*               HDC;
typedef void*               HGLRC;
typedef void*               HICON;
typedef void*               HCURSOR;
typedef void*               HBITMAP;
typedef void*               HFONT;
typedef void*               HBRUSH;
typedef void*               HKEY;
typedef void*               HHOOK;
typedef void*               HLOCAL;
typedef void*               HGLOBAL;
typedef void*               HRSRC;

/* ---- Pointer / string types ---- */
typedef void*               LPVOID;
typedef const void*         LPCVOID;
typedef char*               LPSTR;
typedef const char*         LPCSTR;
/* wchar_t: in C mode libclang already defines wchar_t as int-sized; use
   unsigned int here to avoid typedef-redefinition conflicts. In C++ mode
   wchar_t is a keyword. */
#ifndef __cplusplus
#ifndef _WCHAR_T
#define _WCHAR_T
typedef unsigned int        wchar_t;
#endif
#endif
typedef wchar_t*            LPWSTR;
typedef const wchar_t*      LPCWSTR;

/* ---- Pointer-width integer types (must precede OVERLAPPED, CRITICAL_SECTION) ---- */
typedef unsigned long       ULONG_PTR;
typedef unsigned long       UINT_PTR;
typedef unsigned long       DWORD_PTR;

/* ---- Window atom type (must precede RegisterClassExA prototype) ---- */
typedef unsigned short      ATOM;

/* ---- Message / window types ---- */
typedef long                LPARAM;
typedef unsigned long       WPARAM;
typedef long                LRESULT;

/* ---- Calling convention types for function pointers ---- */
typedef LRESULT (CALLBACK *HOOKPROC)(int nCode, WPARAM wParam, LPARAM lParam);
typedef LRESULT (CALLBACK *WNDPROC)(HWND, UINT, WPARAM, LPARAM);

/* ---- Hook struct (for keyboard hook in sys_win.c) ---- */
typedef struct tagKBDLLHOOKSTRUCT {
    DWORD vkCode;
    DWORD scanCode;
    DWORD flags;
    DWORD time;
    ULONG64 dwExtraInfo;
} KBDLLHOOKSTRUCT, *PKBDLLHOOKSTRUCT;

/* ---- Compound types ---- */
typedef union _LARGE_INTEGER {
    struct { DWORD LowPart; LONG HighPart; } u;
    LONGLONG QuadPart;
} LARGE_INTEGER;

typedef struct _FILETIME {
    DWORD dwLowDateTime;
    DWORD dwHighDateTime;
} FILETIME;

typedef struct _OSVERSIONINFOA {
    DWORD dwOSVersionInfoSize;
    DWORD dwMajorVersion;
    DWORD dwMinorVersion;
    DWORD dwBuildNumber;
    DWORD dwPlatformId;
    char  szCSDVersion[128];
} OSVERSIONINFOA, OSVERSIONINFO;

typedef struct _SYSTEM_INFO {
    DWORD dwNumberOfProcessors;
    DWORD dwPageSize;
    LPVOID lpMinimumApplicationAddress;
    LPVOID lpMaximumApplicationAddress;
    DWORD_PTR dwActiveProcessorMask;
    DWORD dwAllocationGranularity;
    WORD  wProcessorArchitecture;
    WORD  wReserved;
} SYSTEM_INFO;

typedef struct _SECURITY_ATTRIBUTES {
    DWORD  nLength;
    LPVOID lpSecurityDescriptor;
    BOOL   bInheritHandle;
} SECURITY_ATTRIBUTES, *LPSECURITY_ATTRIBUTES;

typedef struct _OVERLAPPED {
    ULONG_PTR Internal;
    ULONG_PTR InternalHigh;
    DWORD Offset;
    DWORD OffsetHigh;
    HANDLE hEvent;
} OVERLAPPED;

/* CRITICAL_SECTION (used in audio/threading) */
typedef struct _RTL_CRITICAL_SECTION {
    void* DebugInfo;
    LONG LockCount;
    LONG RecursionCount;
    HANDLE OwningThread;
    HANDLE LockSemaphore;
    ULONG_PTR SpinCount;
} CRITICAL_SECTION, *LPCRITICAL_SECTION;

/* POINT / RECT */
typedef struct _POINT { LONG x; LONG y; } POINT;
typedef struct _RECT  { LONG left; LONG top; LONG right; LONG bottom; } RECT;

/* MSG */
typedef struct tagMSG {
    HWND hwnd;
    UINT message;
    WPARAM wParam;
    LPARAM lParam;
    DWORD time;
    POINT pt;
} MSG, *PMSG;

/* WNDCLASSEX */
typedef struct tagWNDCLASSEXA {
    UINT      cbSize;
    UINT      style;
    WNDPROC   lpfnWndProc;
    int       cbClsExtra;
    int       cbWndExtra;
    HINSTANCE hInstance;
    HICON     hIcon;
    HCURSOR   hCursor;
    HBRUSH    hbrBackground;
    LPCSTR    lpszMenuName;
    LPCSTR    lpszClassName;
    HICON     hIconSm;
} WNDCLASSEXA, WNDCLASSEX;

/* PIXELFORMATDESCRIPTOR (used by gl_vidnt.c) */
typedef struct tagPIXELFORMATDESCRIPTOR {
    WORD  nSize;
    WORD  nVersion;
    DWORD dwFlags;
    BYTE  iPixelType;
    BYTE  cColorBits;
    BYTE  cRedBits; BYTE cRedShift;
    BYTE  cGreenBits; BYTE cGreenShift;
    BYTE  cBlueBits; BYTE cBlueShift;
    BYTE  cAlphaBits; BYTE cAlphaShift;
    BYTE  cAccumBits;
    BYTE  cAccumRedBits; BYTE cAccumGreenBits; BYTE cAccumBlueBits; BYTE cAccumAlphaBits;
    BYTE  cDepthBits;
    BYTE  cStencilBits;
    BYTE  cAuxBuffers;
    BYTE  iLayerType;
    BYTE  bReserved;
    DWORD dwLayerMask; DWORD dwVisibleMask; DWORD dwDamageMask;
} PIXELFORMATDESCRIPTOR;

/* MEMORYSTATUS (used in sys_win.c WinMain) */
typedef struct _MEMORYSTATUS {
    DWORD dwLength;
    DWORD dwMemoryLoad;
    DWORD dwTotalPhys;
    DWORD dwAvailPhys;
    DWORD dwTotalPageFile;
    DWORD dwAvailPageFile;
    DWORD dwTotalVirtual;
    DWORD dwAvailVirtual;
} MEMORYSTATUS, *LPMEMORYSTATUS;

void GlobalMemoryStatus(MEMORYSTATUS *lpBuffer);

/* WNDCLASS (old non-Ex version, used in vid_win.c and gl_vidnt.c) */
typedef struct tagWNDCLASSA {
    UINT      style;
    WNDPROC   lpfnWndProc;
    int       cbClsExtra;
    int       cbWndExtra;
    HINSTANCE hInstance;
    HICON     hIcon;
    HCURSOR   hCursor;
    HBRUSH    hbrBackground;
    LPCSTR    lpszMenuName;
    LPCSTR    lpszClassName;
} WNDCLASSA, WNDCLASS;

ATOM RegisterClassA(const WNDCLASSA*);

/* DEVMODE (used in vid_win.c and gl_vidnt.c for display-mode enumeration) */
typedef struct _devicemodeA {
    char  dmDeviceName[32];
    WORD  dmSpecVersion;
    WORD  dmDriverVersion;
    WORD  dmSize;
    WORD  dmDriverExtra;
    DWORD dmFields;
    short dmOrientation;
    short dmPaperSize;
    short dmPaperLength;
    short dmPaperWidth;
    short dmScale;
    short dmCopies;
    short dmDefaultSource;
    short dmPrintQuality;
    short dmColor;
    short dmDuplex;
    short dmYResolution;
    short dmTTOption;
    short dmCollate;
    char  dmFormName[32];
    WORD  dmLogPixels;
    DWORD dmBitsPerPel;
    DWORD dmPelsWidth;
    DWORD dmPelsHeight;
    DWORD dmDisplayFlags;
    DWORD dmDisplayFrequency;
    DWORD dmICMMethod;
    DWORD dmICMIntent;
    DWORD dmMediaType;
    DWORD dmDitherType;
    DWORD dmReserved1;
    DWORD dmReserved2;
} DEVMODEA, DEVMODE;

BOOL ChangeDisplaySettingsA(DEVMODEA *lpDevMode, DWORD dwFlags);
LONG EnumDisplaySettingsA(LPCSTR lpszDeviceName, DWORD iModeNum, DEVMODEA *lpDevMode);

#define ENUM_CURRENT_SETTINGS   ((DWORD)-1)
#define ENUM_REGISTRY_SETTINGS  ((DWORD)-2)
#define CDS_FULLSCREEN          0x00000004
#define DISP_CHANGE_SUCCESSFUL  0

/* EXCEPTION types (used in crash handler in sys_win.c) */
typedef struct _EXCEPTION_RECORD     { int placeholder; } EXCEPTION_RECORD;
typedef struct _CONTEXT              { int placeholder; } CONTEXT;
typedef struct _EXCEPTION_POINTERS {
    EXCEPTION_RECORD *ExceptionRecord;
    CONTEXT *ContextRecord;
} EXCEPTION_POINTERS, *LPEXCEPTION_POINTERS;

/* Imagehlp / DbgHelp types (used in crash handler) */
typedef struct _SYMBOL_INFO     { DWORD SizeOfStruct; char Name[1]; } SYMBOL_INFO, *PSYMBOL_INFO;
typedef struct _IMAGEHLP_LINE   { DWORD SizeOfStruct; DWORD LineNumber; } IMAGEHLP_LINE, *PIMAGEHLP_LINE;
typedef struct _IMAGEHLP_LINE64 { DWORD SizeOfStruct; DWORD LineNumber; } IMAGEHLP_LINE64, *PIMAGEHLP_LINE64;
typedef struct _IMAGEHLP_MODULE   { DWORD SizeOfStruct; } IMAGEHLP_MODULE, *PIMAGEHLP_MODULE;
typedef struct _IMAGEHLP_MODULE64 { DWORD SizeOfStruct; } IMAGEHLP_MODULE64, *PIMAGEHLP_MODULE64;
typedef DWORD64 *PDWORD64;
typedef void*    PVOID;

/* Stack walk types */
typedef struct _KDHELP64 { DWORD64 placeholder; } KDHELP64;
typedef struct _STACKFRAME64 {
    DWORD64 AddrPC;
    DWORD64 AddrReturn;
    DWORD64 AddrFrame;
    DWORD64 AddrStack;
    DWORD64 AddrBStore;
    PVOID FuncTableEntry;
    DWORD64 Params[4];
    BOOL Far;
    BOOL Virtual;
    DWORD64 Reserved[3];
    KDHELP64 KdHelp;
} STACKFRAME64, *LPSTACKFRAME64;

typedef struct _STACKFRAME {
    DWORD AddrPC;
    PVOID FuncTableEntry;
    DWORD Params[4];
    BOOL Far;
    BOOL Virtual;
} STACKFRAME, *LPSTACKFRAME;

typedef PVOID (*PREAD_PROCESS_MEMORY_ROUTINE64)(HANDLE, DWORD64, PVOID, DWORD, DWORD*);
typedef PVOID (*PFUNCTION_TABLE_ACCESS_ROUTINE64)(HANDLE, DWORD64);
typedef DWORD64 (*PGET_MODULE_BASE_ROUTINE64)(HANDLE, DWORD64);
typedef PVOID (*PTRANSLATE_ADDRESS_ROUTINE64)(HANDLE, HANDLE, LPSTACKFRAME64);
typedef PVOID (*PREAD_PROCESS_MEMORY_ROUTINE)(HANDLE, DWORD, PVOID, DWORD, DWORD*);
typedef PVOID (*PFUNCTION_TABLE_ACCESS_ROUTINE)(HANDLE, DWORD);
typedef DWORD (*PGET_MODULE_BASE_ROUTINE)(HANDLE, DWORD);
typedef PVOID (*PTRANSLATE_ADDRESS_ROUTINE)(HANDLE, HANDLE, LPSTACKFRAME);

/* ---- Constants ---- */
#define VER_PLATFORM_WIN32s         0
#define VER_PLATFORM_WIN32_WINDOWS  1
#define VER_PLATFORM_WIN32_NT       2

#define HIGH_PRIORITY_CLASS         0x00000080
#define NORMAL_PRIORITY_CLASS       0x00000020
#define IDLE_PRIORITY_CLASS         0x00000040
#define ABOVE_NORMAL_PRIORITY_CLASS 0x00008000
#define BELOW_NORMAL_PRIORITY_CLASS 0x00004000
#define REALTIME_PRIORITY_CLASS     0x00000100

#define MAX_PATH                    260
#define INVALID_HANDLE_VALUE        ((HANDLE)(long long)-1)
#define INVALID_FILE_ATTRIBUTES     ((DWORD)-1)
#define TRUE                        1
#define FALSE                       0

/* Hook types */
#define WH_KEYBOARD_LL              13
#define HC_ACTION                   0
#define LLKHF_UP                    0x00000080

/* Window message constants */
#define WM_MOUSEWHEEL               0x020A
#define WM_PALETTECHANGED           0x0311
#define WM_SYSCOLORCHANGE           0x0015
#define HWND_BROADCAST              ((HWND)(long long)0xFFFF)
#define HWND_TOPMOST                ((HWND)(long long)(-1))
#define HWND_TOP                    ((HWND)(long long)0)

/* File/access flags */
#define GENERIC_READ                0x80000000UL
#define GENERIC_WRITE               0x40000000UL
#define FILE_SHARE_READ             0x00000001
#define FILE_SHARE_WRITE            0x00000002
#define OPEN_EXISTING               3
#define CREATE_ALWAYS               2
#define FILE_ATTRIBUTE_NORMAL       0x00000080

/* Exception codes */
#define EXCEPTION_INVALID_HANDLE    0xC0000008L
#define EXCEPTION_ACCESS_VIOLATION  0xC0000005L

/* PixelFormat flags */
#define PFD_DRAW_TO_WINDOW          0x00000004
#define PFD_SUPPORT_OPENGL          0x00000020
#define PFD_DOUBLEBUFFER            0x00000001
#define PFD_TYPE_RGBA               0
#define PFD_MAIN_PLANE              0

/* GetDeviceCaps constants */
#define HORZRES                     8
#define VERTRES                     10

/* SetWindowPos flags */
#define SWP_NOMOVE                  0x0002
#define SWP_NOSIZE                  0x0001
#define SWP_NOZORDER                0x0004
#define SWP_SHOWWINDOW              0x0040

/* ---- Functions (signature-only stubs) ---- */
HANDLE  GetCurrentProcess(void);
BOOL    SetPriorityClass(HANDLE hProcess, DWORD dwPriorityClass);
DWORD   GetCurrentProcessId(void);
DWORD   GetCurrentThreadId(void);
DWORD   GetTickCount(void);
BOOL    QueryPerformanceFrequency(LARGE_INTEGER *lpFrequency);
BOOL    QueryPerformanceCounter(LARGE_INTEGER *lpPerformanceCount);
BOOL    GetVersionExA(OSVERSIONINFOA *lpVersionInfo);
void    GetSystemInfo(SYSTEM_INFO *lpSystemInfo);
DWORD   GetLastError(void);
HMODULE LoadLibraryA(LPCSTR lpLibFileName);
void*   GetProcAddress(HMODULE hModule, LPCSTR lpProcName);
BOOL    FreeLibrary(HMODULE hLibModule);
void    Sleep(DWORD dwMilliseconds);

/* File I/O */
HANDLE  CreateFileA(LPCSTR, DWORD, DWORD, SECURITY_ATTRIBUTES*, DWORD, DWORD, HANDLE);
BOOL    CloseHandle(HANDLE hObject);
BOOL    WriteFile(HANDLE, LPCVOID, DWORD, DWORD*, OVERLAPPED*);
BOOL    ReadFile(HANDLE, LPVOID, DWORD, DWORD*, OVERLAPPED*);

/* Registry */
LONG    RegOpenKeyExA(HKEY, LPCSTR, DWORD, DWORD, HKEY*);
LONG    RegCloseKey(HKEY hKey);
LONG    RegQueryValueExA(HKEY, LPCSTR, DWORD*, DWORD*, BYTE*, DWORD*);

/* Threading */
HANDLE  CreateThread(SECURITY_ATTRIBUTES*, unsigned long, void*, void*, DWORD, DWORD*);
DWORD   WaitForSingleObject(HANDLE hHandle, DWORD dwMilliseconds);
DWORD   WaitForMultipleObjects(DWORD nCount, const HANDLE *lpHandles, BOOL bWaitAll, DWORD dwMilliseconds);
BOOL    SetEvent(HANDLE hEvent);
HANDLE  CreateEventA(SECURITY_ATTRIBUTES*, BOOL, BOOL, LPCSTR);
BOOL    CreateMutexA(void*, BOOL, LPCSTR);
void    InitializeCriticalSection(CRITICAL_SECTION*);
void    EnterCriticalSection(CRITICAL_SECTION*);
void    LeaveCriticalSection(CRITICAL_SECTION*);
void    DeleteCriticalSection(CRITICAL_SECTION*);

/* Memory */
LPVOID  VirtualAlloc(LPVOID, unsigned long long, DWORD, DWORD);
BOOL    VirtualFree(LPVOID, unsigned long long, DWORD);
BOOL    VirtualProtect(LPVOID, unsigned long long, DWORD, DWORD*);

/* Window management */
HWND    CreateWindowExA(DWORD, LPCSTR, LPCSTR, DWORD, int, int, int, int, HWND, HMENU, HINSTANCE, LPVOID);
BOOL    DestroyWindow(HWND hWnd);
BOOL    ShowWindow(HWND hWnd, int nCmdShow);
BOOL    SetWindowPos(HWND, HWND, int, int, int, int, UINT);
BOOL    GetWindowRect(HWND hWnd, RECT *lpRect);
BOOL    GetClientRect(HWND hWnd, RECT *lpRect);
BOOL    PostMessage(HWND hWnd, UINT Msg, WPARAM wParam, LPARAM lParam);
BOOL    SendMessage(HWND hWnd, UINT Msg, WPARAM wParam, LPARAM lParam);
ATOM    RegisterClassExA(const WNDCLASSEXA*);
BOOL    UnregisterClassA(LPCSTR, HINSTANCE);
BOOL    GetMessage(MSG*, HWND, UINT, UINT);
BOOL    PeekMessage(MSG*, HWND, UINT, UINT, UINT);
BOOL    TranslateMessage(const MSG*);
LRESULT DispatchMessage(const MSG*);
void    PostQuitMessage(int nExitCode);

/* Device context */
HDC     GetDC(HWND hWnd);
int     ReleaseDC(HWND hWnd, HDC hDC);
int     ChoosePixelFormat(HDC, const PIXELFORMATDESCRIPTOR*);
BOOL    SetPixelFormat(HDC, int, const PIXELFORMATDESCRIPTOR*);
int     DescribePixelFormat(HDC, int, UINT, PIXELFORMATDESCRIPTOR*);
int     GetDeviceCaps(HDC hdc, int nIndex);
BOOL    SwapBuffers(HDC hdc);

/* OpenGL context (wgl) */
HGLRC   wglCreateContext(HDC hDc);
BOOL    wglMakeCurrent(HDC hDc, HGLRC newContext);
BOOL    wglDeleteContext(HGLRC oldContext);
void*   wglGetProcAddress(LPCSTR);

/* System hooks */
HHOOK   SetWindowsHookExA(int idHook, HOOKPROC lpfn, HINSTANCE hmod, DWORD dwThreadId);
LRESULT CallNextHookEx(HHOOK hhk, int nCode, WPARAM wParam, LPARAM lParam);
BOOL    UnhookWindowsHookEx(HHOOK hhk);

/* Module info */
DWORD   GetModuleFileNameA(HMODULE hModule, LPSTR lpFilename, DWORD nSize);
HMODULE GetModuleHandleA(LPCSTR lpModuleName);

/* Process / exception */
typedef DWORD (*PTOP_LEVEL_EXCEPTION_FILTER)(LPEXCEPTION_POINTERS);
PTOP_LEVEL_EXCEPTION_FILTER SetUnhandledExceptionFilter(PTOP_LEVEL_EXCEPTION_FILTER);

/* Misc */
HLOCAL  LocalFree(HLOCAL hMem);
BOOL    SetConsoleTitle(LPCSTR lpConsoleTitle);
BOOL    AllocConsole(void);
void    ExitProcess(UINT uExitCode);

/* __declspec keyword -- no-op for GCC/Clang */
#ifndef _MSC_VER
#define __declspec(x)
#endif

/* COM initialization (used in some FTE audio paths) */
typedef long SCODE;
#define S_OK    ((HRESULT)0)
#define S_FALSE ((HRESULT)1)
HRESULT CoInitialize(LPVOID pvReserved);
void    CoUninitialize(void);

#endif /* _WINDOWS_STUB_H */
