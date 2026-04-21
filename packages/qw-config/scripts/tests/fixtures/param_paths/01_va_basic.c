#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void Mod_LoadLighting(void) {
    void *buf = FS_LoadFile(va("maps/%s.lit", cl.worldmodel->name), 0);
    (void)buf;
}
