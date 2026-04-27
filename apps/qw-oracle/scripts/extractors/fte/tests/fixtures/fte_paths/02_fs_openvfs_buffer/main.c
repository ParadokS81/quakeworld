// Fixture 02: buffer written by Q_snprintfz, then FS_OpenVFS(buf, ...).
// Exercises the Path 1 buffer-write detector inside a COMPOUND_STMT.

typedef struct vfsfile_s vfsfile_t;

vfsfile_t *FS_OpenVFS(const char *filename, const char *mode, int relativeto);
int Q_snprintfz(char *dest, int size, const char *fmt, ...);

void FS_LoadCustomFile(const char *userpath) {
    char path[256];
    Q_snprintfz(path, sizeof(path), "users/%s/config.cfg", userpath);
    FS_OpenVFS(path, "rb", 1);
}
