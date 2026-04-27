// Fixture 03: COM_LoadFile with a bare string literal.
// Exercises path_source='literal' classification + EXT_TO_CATEGORY mapping
// for the gfx/ path_hint -> charset category.

unsigned char *COM_LoadFile(const char *path, int usehunk);

void Init_CharsetIndex(void) {
    COM_LoadFile("gfx/charset.png", 0);
}
