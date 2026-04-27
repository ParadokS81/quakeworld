// Fixture 01: R_RegisterShader called via va() with a map-name template.
// Exercises Path 1 structured extraction for shader registrations -- the
// FTE-specific surface that ezQuake doesn't have.

typedef struct shader_s shader_t;
typedef enum { SHADER_2D, SHADER_3D } shadertype_t;

shader_t *R_RegisterShader(const char *name, shadertype_t type, const char *body);
char *va(const char *fmt, ...);

struct world_s {
    char name[64];
};

extern struct world_s cl_worldmodel;

void R_LoadMapShader(void) {
    R_RegisterShader(va("textures/%s/baseshader", cl_worldmodel.name), SHADER_3D, 0);
}
