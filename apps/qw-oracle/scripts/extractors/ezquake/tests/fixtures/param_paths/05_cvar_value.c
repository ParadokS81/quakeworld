#include <stddef.h>
typedef struct cvar_s { char *string; } cvar_t;
extern cvar_t baseskin;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void Skin_Load_Cvar(void) {
    FS_LoadFile(va("skins/%s.pcx", baseskin.string), 0);
}
