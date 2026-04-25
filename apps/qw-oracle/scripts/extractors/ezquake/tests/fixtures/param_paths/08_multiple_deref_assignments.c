#include <stddef.h>
typedef struct { char *name; } model_t;
extern model_t *loadmodel;
char *va(const char *fmt, ...);
void *FS_LoadHunkFile(const char *path, int *size);

// Exercises the "nearest prior assignment wins" rule for the deref-assignment
// classifier. Two *var = va(...) writes precede the loader call. The template
// recovered must be the SECOND one (maps/%s.lit), not the first (lits/%s.lit).
static void *LoadColoredLighting(char *name, char **litfilename, int *size) {
    *litfilename = va("lits/%s.lit", loadmodel->name);
    *litfilename = va("maps/%s.lit", loadmodel->name);
    return FS_LoadHunkFile(*litfilename, size);
}
