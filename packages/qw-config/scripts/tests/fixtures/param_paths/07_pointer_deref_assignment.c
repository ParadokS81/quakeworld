#include <stddef.h>
typedef struct { char *name; } model_t;
extern model_t *loadmodel;
char *va(const char *fmt, ...);
void *FS_LoadHunkFile(const char *path, int *size);

// Mirrors research/repos/ezquake-source/src/r_brushmodel_load.c:107-108.
// A function takes char** output parameter, assigns *litfilename = va(...),
// then passes *litfilename to the loader. The classifier must recover the
// template by finding the immediately-preceding deref assignment whose RHS
// is a format-family call.
static void *LoadColoredLighting(char *name, char **litfilename, int *size) {
    *litfilename = va("maps/%s.lit", loadmodel->name);
    return FS_LoadHunkFile(*litfilename, size);
}
