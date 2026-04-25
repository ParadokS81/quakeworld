#include <stddef.h>
int snprintf(char *s, unsigned long n, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void TP_LoadLocFile_Snprintf(const char *mapname) {
    char path[256];
    snprintf(path, sizeof(path), "locs/%s.loc", mapname);
    FS_LoadFile(path, 0);
}
