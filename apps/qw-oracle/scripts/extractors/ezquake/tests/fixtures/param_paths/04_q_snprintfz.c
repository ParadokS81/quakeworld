#include <stddef.h>
void Q_snprintfz(char *buf, unsigned long size, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void LoadProgs_QSnprintfz(const char *modname) {
    char path[64];
    Q_snprintfz(path, 64, "progs/%s.dat", modname);
    FS_LoadFile(path, 0);
}
