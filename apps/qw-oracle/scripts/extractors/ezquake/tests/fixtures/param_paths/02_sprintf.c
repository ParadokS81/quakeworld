#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
int sprintf(char *s, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void R_LoadSkybox_Sprintf(const char *basename) {
    char path[128];
    sprintf(path, "env/%s_ft.tga", basename);
    FS_LoadFile(path, 0);
}
