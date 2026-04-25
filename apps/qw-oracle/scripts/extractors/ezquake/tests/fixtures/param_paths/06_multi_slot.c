#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void LoadSkyboxFace(const char *face) {
    FS_LoadFile(va("env/%s_%s.tga", cl.worldmodel->name, face), 0);
}
