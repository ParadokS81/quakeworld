# ezQuake loader-function audit candidates

**Generated:** 2026-05-14
**Source root:** `research/repos/ezquake-source/src/`
**Current LOADER_FUNCTIONS count:** 14
**Total candidates surfaced:** 575
**Priority candidates (load-named or registered, trace ≤5):** 131
**Broader plumbing candidates:** 444
**Pass 1 reachable count:** 584
**Pass 2 registered (FS-reachable) count:** 34

## Methodology

Pass 1 builds a call graph by walking CALL_EXPR cursors in every `.c` file via libclang, then does a reverse-BFS from five FS primitive roots (`FS_LoadFile`, `FS_OpenVFS`, `FS_LoadHunkFile`, `FS_WriteFile`, `FS_LoadTempFile`) to find every function that transitively reaches the filesystem. Noisy bridge nodes (error handlers, shutdown routines, logging, allocators) are blocked from propagating reachability; BFS is capped at depth 7. Pass 2 scans `Cmd_AddCommand`, `Cmd_AddMacro`, and `.OnChange` cvar field initializers to collect registered callbacks, then intersects with the Pass 1 reachable set to filter out non-loading commands. Priority candidates are those with a load/open/read/precache naming signal or a command registration, with a trace depth of 5 or fewer hops to an FS primitive.

## Priority candidates

### Sky / skybox

#### `Skywind_Load_f`

- **Source:** `r_brushmodel_sky.c:296`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Skywind_Load_f -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "skywind_load"` at `r_brushmodel_sky.c:540`
- **Hint:** loads companion _wind.cfg for skybox wind animation

#### `Mod_LoadExternalSkyTexture`

- **Source:** `r_brushmodel_load.c:371`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadExternalSkyTexture -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads skybox or sky texture

#### `R_LoadSkyTexturePixels`

- **Source:** `r_brushmodel_sky.c:184`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_LoadSkyTexturePixels -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads skybox or sky texture

#### `Sky_LoadSkyboxTextures`

- **Source:** `r_brushmodel_sky.c:211`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sky_LoadSkyboxTextures -> R_LoadSkyTexturePixels -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads skybox or sky texture

#### `MT_SkyGroup_f`

- **Source:** `cl_skygroups.c:138`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `MT_SkyGroup_f -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "skygroup"` at `host.c:546`
- **Hint:** loads skybox or sky texture

### Model

#### `CL_RequestNextDownload`

- **Source:** `cl_parse.c:1023`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls Model_NextDownload which reaches FS_LoadHunkFile

#### `Mod_LoadAlias3Model`

- **Source:** `r_aliasmodel_md3.c:174`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadAlias3Model -> Mod_ReadFlagsFromMD1 -> FS_LoadTempFile`
- **Hint:** loads model from disk

#### `Mod_LoadAliasModel`

- **Source:** `r_aliasmodel.c:731`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadAliasModel -> Mod_LoadAllSkins -> Mod_LoadExternalSkin -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads model from disk

#### `Mod_LoadAllSkins`

- **Source:** `r_aliasmodel_skins.c:139`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadAllSkins -> Mod_LoadExternalSkin -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls Mod_LoadExternalSkin which reaches FS_OpenVFS

#### `Mod_LoadBrushModel`

- **Source:** `r_brushmodel_load.c:1509`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadBrushModel -> Mod_LoadLighting -> LoadColoredLighting -> FS_LoadHunkFile`
- **Hint:** loads model from disk

#### `Mod_LoadExternalSkin`

- **Source:** `r_aliasmodel_skins.c:76`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadExternalSkin -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadImagePixels which reaches FS_OpenVFS

#### `Mod_LoadExternalSpriteSkin`

- **Source:** `r_sprites.c:32`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadExternalSpriteSkin -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadTextureImage which reaches FS_OpenVFS

#### `Mod_LoadExternalTexture`

- **Source:** `r_brushmodel_textures.c:75`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadExternalTexture -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadImagePixels which reaches FS_OpenVFS

#### `Mod_LoadLighting`

- **Source:** `r_brushmodel_load.c:219`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadLighting -> LoadColoredLighting -> FS_LoadHunkFile`
- **Hint:** calls LoadColoredLighting which reaches FS_LoadHunkFile

#### `Mod_LoadModel`

- **Source:** `r_model.c:240`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** loads model from disk

#### `Mod_LoadSimpleTexture`

- **Source:** `r_model.c:601`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadSimpleTexture -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadTextureImage which reaches FS_OpenVFS

#### `Mod_LoadSpriteFrame`

- **Source:** `r_sprites.c:54`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadSpriteFrame -> Mod_LoadExternalSpriteSkin -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls Mod_LoadExternalSpriteSkin which reaches FS_OpenVFS

#### `Mod_LoadTextures`

- **Source:** `r_brushmodel_load.c:465`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadTextures -> R_LoadBrushModelTextures -> Mod_LoadExternalTexture -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadBrushModelTextures which reaches FS_OpenVFS

#### `Mod_MD3LoadSkins`

- **Source:** `r_aliasmodel_md3.c:74`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_MD3LoadSkins -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_LoadHeapFile which reaches FS_LoadFile

#### `Mod_ReadFlagsFromMD1`

- **Source:** `r_aliasmodel_md3.c:33`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_ReadFlagsFromMD1 -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

#### `Mod_ReloadModels`

- **Source:** `r_model.c:192`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_ReloadModels -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** loads model from disk

#### `Mod_ReloadModelsTextures`

- **Source:** `r_model.c:329`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_ReloadModelsTextures -> R_LoadBrushModelTextures -> Mod_LoadExternalTexture -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads model from disk

#### `Model_NextDownload`

- **Source:** `cl_parse.c:701`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** loads model from disk

#### `R_LoadBrushModelTextures`

- **Source:** `r_brushmodel_load.c:1641`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_LoadBrushModelTextures -> Mod_LoadExternalTexture -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads model from disk

#### `VWepModel_NextDownload`

- **Source:** `cl_parse.c:639`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VWepModel_NextDownload -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** loads model from disk

#### `CL_ParseBeam`

- **Source:** `cl_tent.c:151`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseBeam -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_CustomModel which reaches FS_LoadTempFile

#### `CL_ParseModellist`

- **Source:** `cl_parse.c:1722`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseModellist -> Sound_NextDownload -> S_PrecacheSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Sound_NextDownload which reaches FS_LoadTempFile

#### `Mod_ParseWadsFromEntityLump`

- **Source:** `r_brushmodel_load.c:906`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_ParseWadsFromEntityLump -> WAD3_LoadWadFile -> FS_OpenVFS`
- **Hint:** calls WAD3_LoadWadFile which reaches FS_OpenVFS

### Texture / image

#### `CL_LoginImageLoad`

- **Source:** `sbar.c:2525`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_LoginImageLoad -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** loads image from disk

#### `Draw_LoadCharset`

- **Source:** `r_draw_charset.c:169`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_LoadCharset -> Load_LMP_Charset -> FS_LoadTempFile`
- **Hint:** calls Load_LMP_Charset which reaches FS_LoadTempFile

#### `Image_LoadJPEG`

- **Source:** `image.c:1657`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadJPEG -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadPCX`

- **Source:** `image.c:1802`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadPCX -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadPCX_As32Bit`

- **Source:** `image.c:1924`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadPCX_As32Bit -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadPNG`

- **Source:** `image.c:906`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadPNG -> Image_LoadPNG_All -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadPNG_All`

- **Source:** `image.c:638`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadPNG_All -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadPNG_Comments`

- **Source:** `image.c:886`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadPNG_Comments -> Image_LoadPNG_All -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_LoadTGA`

- **Source:** `image.c:1200`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_LoadTGA -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `Image_OpenAPNG`

- **Source:** `image.c:982`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_OpenAPNG -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `Load_LMP_Charset`

- **Source:** `r_draw_charset.c:55`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Load_LMP_Charset -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

#### `Load_Locale_Charset`

- **Source:** `r_draw_charset.c:140`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Load_Locale_Charset -> Load_LMP_Charset -> FS_LoadTempFile`
- **Hint:** calls Load_LMP_Charset which reaches FS_LoadTempFile

#### `Movie_BackgroundThread`

- **Source:** `movie.c:578`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Movie_BackgroundThread -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_ScreenshotWrite which reaches FS_OpenVFS

#### `QMB_LoadTextureImage`

- **Source:** `r_particles_qmb.c:322`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QMB_LoadTextureImage -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `R_LoadTextureImage`

- **Source:** `r_texture_load.c:61`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads image from disk

#### `SCR_HUD_LoadGroupPic`

- **Source:** `hud_groups.c:130`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_LoadGroupPic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `SCR_LoadCursorImage`

- **Source:** `cl_screen.c:1038`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_LoadCursorImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** loads image from disk

#### `Skin_PixelsLoad`

- **Source:** `skin.c:252`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls Image_LoadPCX which reaches FS_OpenVFS

#### `CL_ForwardToServer_f`

- **Source:** `cl_cmd.c:84`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_ForwardToServer_f -> SCR_RSShot_f -> Image_WriteTGA -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "cmd"` at `cl_cmd.c:931`
- **Hint:** calls SCR_RSShot_f which reaches FS_OpenVFS

#### `Dev_VidTextureDump`

- **Source:** `gl_debug.c:303`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Dev_VidTextureDump -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "dev_gfxtexturedump"` at `cl_main.c:2033`
- **Hint:** calls SCR_ScreenshotWrite which reaches FS_OpenVFS

#### `SCR_ScreenShot_f`

- **Source:** `cl_screenshot.c:282`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `SCR_ScreenShot_f -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "screenshot"` at `cl_screenshot.c:487`
- **Hint:** calls SCR_Screenshot which reaches FS_OpenVFS

#### `Draw_CachePic`

- **Source:** `r_draw.c:522`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `Draw_CacheWadPic`

- **Source:** `r_draw.c:340`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_CacheWadPic -> R_LoadPicImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadPicImage which reaches FS_OpenVFS

#### `Skin_Cache`

- **Source:** `skin.c:332`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls Skin_PixelsLoad which reaches FS_OpenVFS

### Sound

#### `M_Load_Key`

- **Source:** `menu.c:1052`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Load_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `S_LoadSound`

- **Source:** `snd_mem.c:728`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_LoadSound -> FS_LoadTempFile`
- **Hint:** loads sound from disk

#### `Sound_NextDownload`

- **Source:** `cl_parse.c:754`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sound_NextDownload -> S_PrecacheSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** loads sound from disk

#### `HUD_Editor_Toggle_f`

- **Source:** `hud_editor.c:2457`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `HUD_Editor_Toggle_f -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "hud_editor"` at `hud_editor.c:2795`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `S_Play_f`

- **Source:** `snd_main.c:982`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `S_Play_f -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "play"` at `snd_main.c:451`
- **Registration:** `Cmd_AddCommand "playvol"` at `snd_main.c:452`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `S_Restart_f`

- **Source:** `snd_main.c:396`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `S_Restart_f -> S_Startup -> S_FModCheckExtraSounds -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "s_restart"` at `snd_main.c:449`
- **Hint:** calls S_Startup which reaches FS_LoadTempFile

#### `CL_Parse_TE_BLOOD`

- **Source:** `cl_tent.c:559`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_BLOOD -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_Parse_TE_EXPLOSION`

- **Source:** `cl_tent.c:411`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_EXPLOSION -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_Parse_TE_SPIKE`

- **Source:** `cl_tent.c:357`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_SPIKE -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_Parse_TE_SUPERSPIKE`

- **Source:** `cl_tent.c:384`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_SUPERSPIKE -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_Parse_TE_TAREXPLOSION`

- **Source:** `cl_tent.c:500`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_TAREXPLOSION -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_Parse_TE_WIZSPIKE`

- **Source:** `cl_tent.c:325`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_WIZSPIKE -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_ParsePrint`

- **Source:** `cl_parse.c:3106`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParsePrint -> CL_ProcessPrint -> TP_CheckSoundTrigger -> FS_OpenVFS`
- **Hint:** calls CL_ProcessPrint which reaches FS_OpenVFS

#### `CL_ParseServerMessage`

- **Source:** `cl_parse.c:3595`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseServerMessage -> CL_ParseStartSoundPacket -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_ParseStartSoundPacket which reaches FS_LoadTempFile

#### `CL_ParseStartSoundPacket`

- **Source:** `cl_parse.c:1945`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseStartSoundPacket -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `CL_ParseStaticSound`

- **Source:** `cl_parse.c:1915`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseStaticSound -> S_StaticSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StaticSound which reaches FS_LoadTempFile

#### `CL_ParseTEnt`

- **Source:** `cl_tent.c:625`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseTEnt -> CL_Parse_TE_SUPERSPIKE -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_Parse_TE_SUPERSPIKE which reaches FS_LoadTempFile

#### `Draw_Precache`

- **Source:** `r_draw.c:531`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_Precache -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** precaches asset

#### `NQD_ParsePrint`

- **Source:** `cl_nqdemo.c:387`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `NQD_ParsePrint -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `NQD_ParseStartSoundPacket`

- **Source:** `cl_nqdemo.c:612`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `NQD_ParseStartSoundPacket -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `Precache_Source`

- **Source:** `EX_browser_sources.c:156`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Precache_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** precaches asset

#### `S_Voip_Parse`

- **Source:** `snd_voip.c:235`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_Voip_Parse -> S_RawAudio -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_RawAudio which reaches FS_LoadTempFile

#### `Skins_PreCache`

- **Source:** `skin.c:283`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Skins_PreCache -> Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** precaches asset

### Map / BSP

#### `CM_LoadMap`

- **Source:** `cmodel.c:1384`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** loads map/BSP data

#### `CM_OpenMap`

- **Source:** `cmodel.c:1262`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CM_OpenMap -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `ReloadPaletteAndColormap`

- **Source:** `cl_main.c:2065`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `ReloadPaletteAndColormap -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** loads map/BSP data

#### `SV_Map_f`

- **Source:** `sv_ccmds.c:506`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `SV_Map_f -> SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Registration:** `Cmd_AddCommand "map"` at `sv_ccmds.c:1865`
- **Registration:** `Cmd_AddCommand "devmap"` at `sv_ccmds.c:1870`
- **Hint:** calls SV_Map which reaches FS_LoadHunkFile

### Demo

#### `CL_Open_Demo_File`

- **Source:** `cl_demo.c:3937`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Open_Demo_File -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `HUD_AutoLoad_MVD`

- **Source:** `hud_common.c:425`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_AutoLoad_MVD -> Cmd_Exec_f -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls Cmd_Exec_f which reaches FS_LoadFile

#### `CL_TimeDemo_f`

- **Source:** `cl_demo.c:3979`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_TimeDemo_f -> CL_StartDemoCommand -> PlayQWZDemo -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "timedemo"` at `cl_demo.c:5462`
- **Registration:** `Cmd_AddCommand "timedemo2"` at `cl_demo.c:5463`
- **Hint:** calls CL_StartDemoCommand which reaches FS_OpenVFS

#### `Movie_Demo_Capture_f`

- **Source:** `movie.c:181`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Movie_Demo_Capture_f -> Image_OpenAPNG -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "demo_capture"` at `movie.c:310`
- **Hint:** calls Image_OpenAPNG which reaches FS_OpenVFS

### Config / script

#### `LoadConfig_f`

- **Source:** `config_manager.c:1041`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `LoadConfig_f -> ResetConfigs -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "cfg_load"` at `config_manager.c:1222`
- **Hint:** loads config/script from disk

#### `MOpt_LoadCfg`

- **Source:** `menu_options.c:690`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MOpt_LoadCfg -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** loads config/script from disk

#### `ResetConfigs_f`

- **Source:** `config_manager.c:988`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `ResetConfigs_f -> ResetConfigs -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "cfg_reset"` at `config_manager.c:1223`
- **Hint:** calls ResetConfigs which reaches FS_OpenVFS

### Archive / pack

#### `WAD3_LoadWadFile`

- **Source:** `wad.c:267`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `WAD3_LoadWadFile -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

### VM / QuakeC

#### `PR1_LoadProgs`

- **Source:** `pr_edict.c:1138`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `PR1_LoadProgs -> FS_LoadHunkFile`
- **Hint:** calls FS_LoadHunkFile which reaches FS_LoadHunkFile

#### `PR2_LoadProgs`

- **Source:** `pr2_exec.c:425`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `PR2_LoadProgs -> PR1_LoadProgs -> FS_LoadHunkFile`
- **Hint:** calls PR1_LoadProgs which reaches FS_LoadHunkFile

#### `VM_LoadQVM`

- **Source:** `vm.c:677`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VM_LoadQVM -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

#### `VM_LoadSymbols`

- **Source:** `vm.c:432`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VM_LoadSymbols -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

### HUD

#### `Hud_Add_f`

- **Source:** `hud_262.c:119`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Hud_Add_f -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "hud262_add"` at `hud_262.c:688`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

### Location / loc file

#### `TP_LoadLocFile_f`

- **Source:** `teamplay_locfiles.c:212`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `TP_LoadLocFile_f -> TP_LoadLocFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "locations_loadfile"` at `teamplay_locfiles.c:532`
- **Hint:** calls TP_LoadLocFile which reaches FS_LoadFile

#### `TP_SaveLocFile_f`

- **Source:** `teamplay_locfiles.c:293`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `TP_SaveLocFile_f -> TP_SaveLocFile -> FS_WriteFile`
- **Registration:** `Cmd_AddCommand "locations_savefile"` at `teamplay_locfiles.c:534`
- **Hint:** calls TP_SaveLocFile which reaches FS_WriteFile

### Uncategorized

#### `CL_Download_f`

- **Source:** `cl_cmd.c:648`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_Download_f -> CL_Download_Accept -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "download"` at `cl_cmd.c:932`
- **Hint:** calls CL_Download_Accept which reaches FS_OpenVFS

#### `Load_FragFile_f`

- **Source:** `fragstats.c:485`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Load_FragFile_f -> LoadFragFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "loadFragfile"` at `fragstats.c:861`
- **Hint:** calls LoadFragFile which reaches FS_LoadFile

#### `M_Menu_Load_f`

- **Source:** `menu.c:985`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `M_Menu_Load_f -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "menu_load"` at `menu.c:1305`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `R_ReadPointFile_f`

- **Source:** `r_part.c:197`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `R_ReadPointFile_f -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "dev_pointfile"` at `r_rmain.c:609`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `SV_LoadGame_f`

- **Source:** `sv_save.c:164`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `SV_LoadGame_f -> SV_SpawnServer -> FS_LoadHunkFile`
- **Registration:** `Cmd_AddCommand "load"` at `sv_ccmds.c:1877`
- **Hint:** calls SV_SpawnServer which reaches FS_LoadHunkFile

#### `VID_Reload_f`

- **Source:** `vid_sdl2.c:1801`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `VID_Reload_f -> ReloadPaletteAndColormap -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "vid_reload"` at `vid_sdl2.c:1873`
- **Hint:** calls ReloadPaletteAndColormap which reaches FS_LoadFile

#### `CL_CheckOrDownloadFile`

- **Source:** `cl_parse.c:478`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_CheckOrDownloadFile -> CL_Download_Accept -> FS_OpenVFS`
- **Hint:** generic file load utility reaching FS primitives

#### `CL_Download_Accept`

- **Source:** `cl_cmd.c:627`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Download_Accept -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `CL_ReadPackets`

- **Source:** `cl_main.c:1673`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ReadPackets -> CL_GetMessage -> CL_CheckQizmoCompletion -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls CL_GetMessage which reaches FS_LoadFile

#### `CM_LoadPhysicsNormals`

- **Source:** `cmodel.c:946`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls FS_LoadHunkFile which reaches FS_LoadHunkFile

#### `Cmd_Download_f`

- **Source:** `sv_user.c:1406`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Cmd_Download_f -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `FS_LoadHeapFile`

- **Source:** `fs.c:412`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_LoadFile which reaches FS_LoadFile

#### `LoadColoredLighting`

- **Source:** `r_brushmodel_load.c:89`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `LoadColoredLighting -> FS_LoadHunkFile`
- **Hint:** calls FS_LoadHunkFile which reaches FS_LoadHunkFile

#### `LoadFragFile`

- **Source:** `fragstats.c:221`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `LoadFragFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_LoadHeapFile which reaches FS_LoadFile

#### `M_Load_Draw`

- **Source:** `menu.c:1006`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Load_Draw -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `PF2_FS_OpenFile`

- **Source:** `pr2_cmds.c:1695`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `PF2_FS_OpenFile -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `QTVList_Cache_File_Open`

- **Source:** `EX_browser_qtvlist.c:310`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QTVList_Cache_File_Open -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `QTVList_Download_And_Print_Thread`

- **Source:** `EX_browser_qtvlist.c:487`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QTVList_Download_And_Print_Thread -> QTVList_Refresh_Cache -> QTVList_Cache_File_Open -> FS_OpenVFS`
- **Hint:** calls QTVList_Refresh_Cache which reaches FS_OpenVFS

#### `QTVList_Refresh_Cache_Thread`

- **Source:** `EX_browser_qtvlist.c:480`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QTVList_Refresh_Cache_Thread -> QTVList_Refresh_Cache -> QTVList_Cache_File_Open -> FS_OpenVFS`
- **Hint:** calls QTVList_Refresh_Cache which reaches FS_OpenVFS

#### `Reload_Sources`

- **Source:** `EX_browser_sources.c:880`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Reload_Sources -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `SCR_DrawLoading`

- **Source:** `cl_screen.c:491`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawLoading -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `VID_ReloadCheck`

- **Source:** `vid_sdl2.c:1814`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VID_ReloadCheck -> VID_Reload_f -> ReloadPaletteAndColormap -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls VID_Reload_f which reaches FS_LoadFile

#### `XSD_Document_Load`

- **Source:** `xsd_document.c:1162`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `XSD_Document_Load -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `XSD_LoadDocument`

- **Source:** `xsd.c:183`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `XSD_LoadDocument -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `XSD_LoadDocumentWithXsl`

- **Source:** `xsd.c:261`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `XSD_LoadDocumentWithXsl -> XSD_LoadDocument -> FS_OpenVFS`
- **Hint:** calls XSD_LoadDocument which reaches FS_OpenVFS

#### `CL_Play_f`

- **Source:** `cl_demo.c:3922`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_Play_f -> CL_StartDemoCommand -> PlayQWZDemo -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "playdemo"` at `cl_demo.c:5461`
- **Hint:** calls CL_StartDemoCommand which reaches FS_OpenVFS

#### `Cmd_Exec_f`

- **Source:** `cmd.c:552`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Cmd_Exec_f -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "exec"` at `cmd.c:2504`
- **Registration:** `Cmd_AddCommand "serverexec"` at `cmd.c:2506`
- **Hint:** calls FS_LoadHeapFile which reaches FS_LoadFile

#### `FS_DiffFile_f`

- **Source:** `fs.c:3110`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `FS_DiffFile_f -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "fs_diff"` at `fs.c:1957`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `M_Menu_MultiPlayer_f`

- **Source:** `menu.c:1258`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `M_Menu_MultiPlayer_f -> Draw_BigFontAvailable -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "menu_multiplayer"` at `menu.c:1308`
- **Hint:** calls Draw_BigFontAvailable which reaches FS_LoadTempFile

#### `M_Menu_Save_f`

- **Source:** `menu.c:996`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `M_Menu_Save_f -> M_ScanSaves -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "menu_save"` at `menu.c:1306`
- **Hint:** calls M_ScanSaves which reaches FS_OpenVFS

#### `SB_Source_Add_f`

- **Source:** `EX_browser.c:1831`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `SB_Source_Add_f -> SB_Source_Add -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Registration:** `Cmd_AddCommand "sb_sourceadd"` at `EX_browser.c:3300`
- **Hint:** calls SB_Source_Add which reaches FS_OpenVFS

#### `SV_Gamedir_f`

- **Source:** `sv_ccmds.c:1660`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `SV_Gamedir_f -> FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "gamedir"` at `sv_ccmds.c:1898`
- **Hint:** calls FS_SetGamedir which reaches FS_LoadFile

#### `VID_Restart_f`

- **Source:** `vid_sdl2.c:1821`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `VID_Restart_f -> ReloadPaletteAndColormap -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "vid_restart"` at `vid_sdl2.c:1872`
- **Hint:** calls ReloadPaletteAndColormap which reaches FS_LoadFile

#### `CL_ParseServerData`

- **Source:** `cl_parse.c:1387`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseServerData -> FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_SetGamedir which reaches FS_LoadFile

#### `NQD_ParseServerData`

- **Source:** `cl_nqdemo.c:463`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `NQD_ParseServerData -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CM_LoadMap which reaches FS_LoadHunkFile

#### `NQD_ParseServerMessage`

- **Source:** `cl_nqdemo.c:1077`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `NQD_ParseServerMessage -> NQD_ParseServerData -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls NQD_ParseServerData which reaches FS_LoadHunkFile

#### `QTVList_Refresh_Cache`

- **Source:** `EX_browser_qtvlist.c:363`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QTVList_Refresh_Cache -> QTVList_Cache_File_Open -> FS_OpenVFS`
- **Hint:** calls QTVList_Cache_File_Open which reaches FS_OpenVFS

_Broader plumbing candidates (all other reachable functions) follow. These are functions that transitively call an FS primitive but are less likely to be direct asset-loader entry points._

## Broader plumbing

### Sky / skybox

#### `MT_AddSkyGroups`

- **Source:** `cl_skygroups.c:258`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MT_AddSkyGroups -> MT_SkyGroup_f -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** loads skybox or sky texture

#### `OnChange_r_skyname`

- **Source:** `r_brushmodel_sky.c:127`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnChange_r_skyname -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** loads skybox or sky texture

#### `R_SetSky`

- **Source:** `r_brushmodel_sky.c:93`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** loads skybox or sky texture

### Model

#### `CL_FinishDownload`

- **Source:** `cl_parse.c:1047`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_FinishDownload -> CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CL_RequestNextDownload which reaches FS_LoadHunkFile

#### `CL_ParseChunkedDownload`

- **Source:** `cl_parse.c:897`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseChunkedDownload -> CL_FinishDownload -> CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CL_FinishDownload which reaches FS_LoadHunkFile

#### `CL_ParseDownload`

- **Source:** `cl_parse.c:1079`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseDownload -> CL_FinishDownload -> CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CL_FinishDownload which reaches FS_LoadHunkFile

#### `CL_SendChunkDownloadReq`

- **Source:** `cl_parse.c:832`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_SendChunkDownloadReq -> CL_FinishDownload -> CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CL_FinishDownload which reaches FS_LoadHunkFile

#### `Mod_LoadSpriteGroup`

- **Source:** `r_sprites.c:104`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadSpriteGroup -> Mod_LoadSpriteFrame -> Mod_LoadExternalSpriteSkin -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls Mod_LoadSpriteFrame which reaches FS_OpenVFS

#### `Mod_LoadSpriteModel`

- **Source:** `r_sprites.c:151`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_LoadSpriteModel -> Mod_LoadSpriteFrame -> Mod_LoadExternalSpriteSkin -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** loads model from disk

#### `CL_Disconnect`

- **Source:** `cl_main.c:1285`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Disconnect -> CL_FinishDownload -> CL_RequestNextDownload -> Model_NextDownload -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls CL_FinishDownload which reaches FS_LoadHunkFile

#### `CL_Parse_TE_LIGHTNINGBLOOD`

- **Source:** `cl_tent.c:604`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Parse_TE_LIGHTNINGBLOOD -> CL_ParseBeam -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls CL_ParseBeam which reaches FS_LoadTempFile

#### `CL_ParseParticleEffect`

- **Source:** `cl_nqdemo.c:657`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseParticleEffect -> Classic_ParticleExplosion -> CL_ExplosionSprite -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Classic_ParticleExplosion which reaches FS_LoadTempFile

#### `Classic_ParticleExplosion`

- **Source:** `r_part.c:255`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Classic_ParticleExplosion -> CL_ExplosionSprite -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls CL_ExplosionSprite which reaches FS_LoadTempFile

#### `GL_FlagTexturesForModel`

- **Source:** `glm_texture_arrays.c:207`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GL_FlagTexturesForModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GL_ImportTexturesForModel`

- **Source:** `glm_texture_arrays.c:366`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GL_ImportTexturesForModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAlias3Model`

- **Source:** `glc_md3.c:303`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAlias3Model -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAlias3ModelImmediate`

- **Source:** `glc_md3.c:270`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAlias3ModelImmediate -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAlias3ModelPowerupShell`

- **Source:** `glc_md3.c:412`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAlias3ModelPowerupShell -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAlias3ModelProgram`

- **Source:** `glc_md3.c:184`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAlias3ModelProgram -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasFrame`

- **Source:** `glc_aliasmodel.c:530`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasFrame -> GLC_DrawAliasFrameImpl_Immediate -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls GLC_DrawAliasFrameImpl_Immediate which reaches FS_LoadTempFile

#### `GLC_DrawAliasFrameImpl_Immediate`

- **Source:** `glc_aliasmodel.c:476`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasFrameImpl_Immediate -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasFrameImpl_Program`

- **Source:** `glc_aliasmodel.c:361`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasFrameImpl_Program -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasModelPowerupShell`

- **Source:** `glc_aliasmodel.c:822`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasModelPowerupShell -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasModelShadow`

- **Source:** `glc_aliasmodel.c:719`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasModelShadow -> GLC_DrawAliasModelShadowDrawCall -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls GLC_DrawAliasModelShadowDrawCall which reaches FS_LoadTempFile

#### `GLC_DrawAliasModelShadowDrawCall`

- **Source:** `glc_aliasmodel.c:803`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasModelShadowDrawCall -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasModelShadowDrawCall_Immediate`

- **Source:** `glc_aliasmodel.c:758`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasModelShadowDrawCall_Immediate -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawAliasModelShadowDrawCall_Program`

- **Source:** `glc_aliasmodel.c:742`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawAliasModelShadowDrawCall_Program -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawPowerupShell`

- **Source:** `glc_aliasmodel.c:704`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawPowerupShell -> GLC_DrawPowerupShell_Program -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls GLC_DrawPowerupShell_Program which reaches FS_LoadTempFile

#### `GLC_DrawPowerupShell_Immediate`

- **Source:** `glc_aliasmodel.c:615`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawPowerupShell_Immediate -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawPowerupShell_Program`

- **Source:** `glc_aliasmodel.c:593`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawPowerupShell_Program -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_DrawSpriteModel`

- **Source:** `glc_sprite3d.c:254`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_DrawSpriteModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLC_PrepareModelRendering`

- **Source:** `glc_main.c:211`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_PrepareModelRendering -> R_CreateAliasModelVBO -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_CreateAliasModelVBO which reaches FS_LoadTempFile

#### `GLM_DrawAlias3Model`

- **Source:** `glm_md3.c:31`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_DrawAlias3Model -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLM_DrawAliasFrame`

- **Source:** `glm_aliasmodel.c:440`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_DrawAliasFrame -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLM_DrawSpriteModel`

- **Source:** `glm_sprite.c:43`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_DrawSpriteModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLM_MakeAlias3DisplayLists`

- **Source:** `gl_aliasmodel_md3.c:33`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_MakeAlias3DisplayLists -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `GLM_PrepareModelRendering`

- **Source:** `glm_rmain.c:148`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_PrepareModelRendering -> R_CreateAliasModelVBO -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_CreateAliasModelVBO which reaches FS_LoadTempFile

#### `Mod_CustomModel`

- **Source:** `r_model.c:694`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_ForName which reaches FS_LoadTempFile

#### `Mod_Extradata`

- **Source:** `r_model.c:58`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_LoadModel which reaches FS_LoadTempFile

#### `R_ClearModelTextureData`

- **Source:** `r_texture.c:138`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_ClearModelTextureData -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_ClearModelTextureReferences which reaches FS_LoadTempFile

#### `R_ClearModelTextureReferences`

- **Source:** `r_texture.c:46`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `R_CreateAliasModelVBO`

- **Source:** `r_aliasmodel_mesh.c:230`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_CreateAliasModelVBO -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_CustomModel which reaches FS_LoadTempFile

#### `R_DrawAliasModel`

- **Source:** `r_aliasmodel.c:287`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `R_DrawEntities`

- **Source:** `r_rmain.c:1120`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_DrawEntities -> R_DrawEntitiesOnList -> R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_DrawEntitiesOnList which reaches FS_LoadTempFile

#### `R_DrawEntitiesOnList`

- **Source:** `r_rmain.c:1056`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_DrawEntitiesOnList -> R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_DrawAliasModel which reaches FS_LoadTempFile

#### `R_DrawViewModel`

- **Source:** `r_aliasmodel.c:644`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_DrawViewModel -> R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_DrawAliasModel which reaches FS_LoadTempFile

#### `R_OnDisconnect`

- **Source:** `r_main.c:115`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_OnDisconnect -> R_ClearModelTextureData -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_ClearModelTextureData which reaches FS_LoadTempFile

#### `R_ParticleExplosion`

- **Source:** `r_part.c:868`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_ParticleExplosion -> Classic_ParticleExplosion -> CL_ExplosionSprite -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Classic_ParticleExplosion which reaches FS_LoadTempFile

#### `R_RenderView`

- **Source:** `r_rmain.c:871`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_RenderView -> R_DrawEntities -> R_DrawEntitiesOnList -> R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_DrawEntities which reaches FS_LoadTempFile

#### `R_Shutdown`

- **Source:** `r_main.c:36`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_Shutdown -> R_TexturesInvalidateAllReferences -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_TexturesInvalidateAllReferences which reaches FS_LoadTempFile

#### `SV_CheckModel`

- **Source:** `sv_init.c:182`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SV_CheckModel -> FS_LoadHunkFile`
- **Hint:** calls FS_LoadHunkFile which reaches FS_LoadHunkFile

#### `VID_Shutdown`

- **Source:** `vid_sdl2.c:949`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VID_Shutdown -> R_Shutdown -> R_TexturesInvalidateAllReferences -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_Shutdown which reaches FS_LoadTempFile

#### `VID_SoftRestart`

- **Source:** `vid_sdl2.c:943`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VID_SoftRestart -> R_Shutdown -> R_TexturesInvalidateAllReferences -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_Shutdown which reaches FS_LoadTempFile

### Texture / image

#### `CL_ExplosionSprite`

- **Source:** `cl_tent.c:313`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ExplosionSprite -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_CustomModel which reaches FS_LoadTempFile

#### `CL_NewTranslation`

- **Source:** `cl_parse.c:2036`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_NewTranslation -> R_TranslatePlayerSkin -> Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls R_TranslatePlayerSkin which reaches FS_OpenVFS

#### `CL_ParseStufftext`

- **Source:** `cl_parse.c:3118`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseStufftext -> CL_ReadKtxDamageIndicatorString -> CL_SpawnDamageIndicatorDirect -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_ReadKtxDamageIndicatorString which reaches FS_LoadTempFile

#### `Draw_InitCharset`

- **Source:** `r_draw_charset.c:699`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_InitCharset -> Draw_LoadCharset -> Load_LMP_Charset -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls Draw_LoadCharset

#### `Draw_TextBox`

- **Source:** `r_draw.c:720`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `EZ_button_Create`

- **Source:** `ez_button.c:154`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_Create -> EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls EZ_button_Init which reaches FS_LoadTempFile

#### `EZ_button_SetHoverImage`

- **Source:** `ez_button.c:363`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_SetHoverImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `EZ_button_SetNormalImage`

- **Source:** `ez_button.c:355`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_SetNormalImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `EZ_button_SetPressedImage`

- **Source:** `ez_button.c:371`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `EZ_control_SetBackgroundImage`

- **Source:** `ez_controls.c:1422`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_control_SetBackgroundImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `EZ_scrollbar_Create`

- **Source:** `ez_scrollbar.c:120`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_scrollbar_Create -> EZ_scrollbar_Init -> EZ_button_Create -> EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls EZ_scrollbar_Init which reaches FS_LoadTempFile

#### `EZ_window_Create`

- **Source:** `ez_window.c:40`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_window_Create -> EZ_window_Init -> EZ_control_SetBackgroundImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** loads companion _wind.cfg for skybox wind animation

#### `Frags_DrawText`

- **Source:** `hud_frags.c:698`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Frags_DrawText -> Draw_SColoredAlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredAlphaString which reaches FS_LoadTempFile

#### `GFX_Init`

- **Source:** `cl_main.c:2053`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GFX_Init -> SCR_Init -> ScrollBars_Init -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls SCR_Init

#### `GLM_BuildCommonTextureArrays`

- **Source:** `glm_texture_arrays.c:535`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLM_BuildCommonTextureArrays -> Mod_CustomModel -> Mod_ForName -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_CustomModel which reaches FS_LoadTempFile

#### `Image_WriteJPEG`

- **Source:** `image.c:1472`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_WriteJPEG -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `Image_WritePCX`

- **Source:** `image.c:1951`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_WritePCX -> FS_WriteFile_2 -> FS_WriteFileRelative -> FS_OpenVFS`
- **Hint:** calls FS_WriteFile_2 which reaches FS_OpenVFS

#### `Image_WritePNG`

- **Source:** `image.c:924`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `Image_WriteTGA`

- **Source:** `image.c:1359`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Image_WriteTGA -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `Key_EventEx`

- **Source:** `keys.c:2100`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls M_Keydown which reaches FS_OpenVFS

#### `M_DrawTextBox`

- **Source:** `menu.c:165`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_DrawTextBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Movie_FinishFrame`

- **Source:** `movie.c:343`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Movie_FinishFrame -> SCR_Movieshot -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_Movieshot which reaches FS_OpenVFS

#### `OnChange_crosshairimage`

- **Source:** `r_draw.c:192`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnChange_crosshairimage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `OnChange_scr_conpicture`

- **Source:** `r_draw.c:175`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnChange_scr_conpicture -> R_LoadPicImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** calls R_LoadPicImage which reaches FS_OpenVFS

#### `OnChange_scr_scoreboard_login_flagfile`

- **Source:** `sbar.c:2629`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnChange_scr_scoreboard_login_flagfile -> CL_LoginImageLoad -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls CL_LoginImageLoad which reaches FS_LoadFile

#### `R_InitOtherTextures`

- **Source:** `r_rmisc.c:62`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_InitOtherTextures -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_LoadTextureImage

#### `R_SetSkinForPlayerEntity`

- **Source:** `skin.c:846`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_SetSkinForPlayerEntity -> CL_NewTranslation -> R_TranslatePlayerSkin -> Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls CL_NewTranslation which reaches FS_OpenVFS

#### `R_TexturesInvalidateAllReferences`

- **Source:** `r_texture.c:125`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_TexturesInvalidateAllReferences -> R_ClearModelTextureReferences -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_ClearModelTextureReferences which reaches FS_LoadTempFile

#### `R_TranslatePlayerSkin`

- **Source:** `skin.c:661`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_TranslatePlayerSkin -> Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls Skin_Cache which reaches FS_OpenVFS

#### `SCR_CheckAutoScreenshot`

- **Source:** `cl_screenshot.c:371`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_CheckAutoScreenshot -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_Screenshot which reaches FS_OpenVFS

#### `SCR_HUD_DrawStaticText`

- **Source:** `hud_common.c:745`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawStaticText -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_OnChangePic_GroupX`

- **Source:** `hud_groups.c:151`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_OnChangePic_GroupX -> SCR_HUD_LoadGroupPic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_LoadGroupPic which reaches FS_LoadTempFile

#### `SCR_Movieshot`

- **Source:** `cl_screenshot.c:424`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_Movieshot -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_Screenshot which reaches FS_OpenVFS

#### `SCR_RSShot_f`

- **Source:** `cl_screenshot.c:312`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_RSShot_f -> Image_WriteTGA -> FS_OpenVFS`
- **Hint:** calls Image_WriteTGA which reaches FS_OpenVFS

#### `SCR_Screenshot`

- **Source:** `cl_screenshot.c:139`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_ScreenshotWrite which reaches FS_OpenVFS

#### `SCR_ScreenshotWrite`

- **Source:** `cl_screenshot.c:170`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls Image_WritePNG which reaches FS_OpenVFS

#### `SCR_UpdateScreen`

- **Source:** `cl_screen.c:1016`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_UpdateScreen -> SCR_UpdateScreenPostPlayerView -> SCR_CheckAutoScreenshot -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_UpdateScreenPostPlayerView which reaches FS_OpenVFS

#### `SCR_UpdateScreenPlayerView`

- **Source:** `cl_screen.c:909`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_UpdateScreenPlayerView -> Skins_PreCache -> Skin_Cache -> Skin_PixelsLoad -> Image_LoadPCX -> FS_OpenVFS`
- **Hint:** calls Skins_PreCache which reaches FS_OpenVFS

#### `SCR_UpdateScreenPostPlayerView`

- **Source:** `cl_screen.c:1001`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_UpdateScreenPostPlayerView -> SCR_CheckAutoScreenshot -> SCR_Screenshot -> SCR_ScreenshotWrite -> Image_WritePNG -> FS_OpenVFS`
- **Hint:** calls SCR_CheckAutoScreenshot which reaches FS_OpenVFS

#### `Setting_DrawSkinPreview`

- **Source:** `settings_page.c:564`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

### Sound

#### `CL_ReadKtxDamageIndicatorString`

- **Source:** `cl_screen.c:1345`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ReadKtxDamageIndicatorString -> CL_SpawnDamageIndicatorDirect -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_SpawnDamageIndicatorDirect which reaches FS_LoadTempFile

#### `M_Load_Mouse_Event`

- **Source:** `menu.c:1151`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Load_Mouse_Event -> M_Load_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls M_Load_Key which reaches FS_LoadTempFile

#### `CL_Say_f`

- **Source:** `cl_cmd.c:288`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_Say_f -> TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "say"` at `cl_cmd.c:938`
- **Registration:** `Cmd_AddCommand "say_team"` at `cl_cmd.c:939`
- **Hint:** calls TP_ParseMacroString which reaches FS_LoadTempFile

#### `Cmd_Echo_f`

- **Source:** `cmd.c:623`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Cmd_Echo_f -> TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "echo"` at `cmd.c:2508`
- **Hint:** calls TP_ParseMacroString which reaches FS_LoadTempFile

#### `Cvar_Set_ex_f`

- **Source:** `cvar.c:1147`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `Cvar_Set_ex_f -> TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Registration:** `Cmd_AddCommand "set_ex"` at `cvar.c:1583`
- **Registration:** `Cmd_AddCommand "set_ex2"` at `cvar.c:1584`
- **Hint:** calls TP_ParseMacroString which reaches FS_LoadTempFile

#### `CL_ParseDamageDone`

- **Source:** `cl_parse.c:4458`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ParseDamageDone -> CL_SpawnDamageIndicator -> CL_SpawnDamageIndicatorDirect -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_SpawnDamageIndicator which reaches FS_LoadTempFile

#### `CL_ProcessPrint`

- **Source:** `cl_parse.c:2864`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ProcessPrint -> TP_CheckSoundTrigger -> FS_OpenVFS`
- **Hint:** calls TP_CheckSoundTrigger which reaches FS_OpenVFS

#### `CL_SpawnDamageIndicator`

- **Source:** `cl_screen.c:1332`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_SpawnDamageIndicator -> CL_SpawnDamageIndicatorDirect -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CL_SpawnDamageIndicatorDirect which reaches FS_LoadTempFile

#### `CL_SpawnDamageIndicatorDirect`

- **Source:** `cl_screen.c:1299`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_SpawnDamageIndicatorDirect -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `CTab_Key`

- **Source:** `Ctrl_Tab.c:177`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `CTab_Mouse_Event`

- **Source:** `Ctrl_Tab.c:265`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CTab_Mouse_Event -> CTab_Navi_Mouse_Event -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Navi_Mouse_Event which reaches FS_LoadTempFile

#### `CTab_Navi_Mouse_Event`

- **Source:** `Ctrl_Tab.c:241`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CTab_Navi_Mouse_Event -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Key which reaches FS_LoadTempFile

#### `DemoControls_Toggle`

- **Source:** `demo_controls.c:419`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `DemoControls_Toggle -> DemoControls_Init -> EZ_button_Create -> EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls DemoControls_Init which reaches FS_LoadTempFile

#### `EZ_button_SetToggledHoverImage`

- **Source:** `ez_button.c:379`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_SetToggledHoverImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `M_Main_Key`

- **Source:** `menu.c:477`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Main_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `M_Main_Mouse_Event`

- **Source:** `menu.c:527`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Main_Mouse_Event -> M_Main_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls M_Main_Key which reaches FS_LoadTempFile

#### `M_MultiPlayerSub_Key`

- **Source:** `menu.c:1189`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_MultiPlayerSub_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `M_MultiPlayerSub_Mouse_Event`

- **Source:** `menu.c:1244`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_MultiPlayerSub_Mouse_Event -> M_MultiPlayerSub_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls M_MultiPlayerSub_Key which reaches FS_LoadTempFile

#### `M_Options_Key`

- **Source:** `menu.c:544`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Options_Key -> Menu_Options_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Menu_Options_Key which reaches FS_LoadTempFile

#### `M_Save_Key`

- **Source:** `menu.c:1099`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Save_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `M_Save_Mouse_Event`

- **Source:** `menu.c:1141`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Save_Mouse_Event -> M_Save_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls M_Save_Key which reaches FS_LoadTempFile

#### `Menu_Help_Key`

- **Source:** `help_files.c:219`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Help_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Key which reaches FS_LoadTempFile

#### `Menu_Help_Mouse_Event`

- **Source:** `help_files.c:239`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Help_Mouse_Event -> Menu_Help_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Menu_Help_Key which reaches FS_LoadTempFile

#### `Menu_MultiPlayer_Key`

- **Source:** `menu_multiplayer.c:417`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_MultiPlayer_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Key which reaches FS_LoadTempFile

#### `Menu_MultiPlayer_Mouse_Event`

- **Source:** `menu_multiplayer.c:424`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_MultiPlayer_Mouse_Event -> Menu_MultiPlayer_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Menu_MultiPlayer_Key which reaches FS_LoadTempFile

#### `Menu_Options_Key`

- **Source:** `menu_options.c:852`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Options_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Key which reaches FS_LoadTempFile

#### `Menu_Options_Mouse_Event`

- **Source:** `menu_options.c:1386`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Options_Mouse_Event -> Menu_Options_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Menu_Options_Key which reaches FS_LoadTempFile

#### `QTV_ForwardToServerEx`

- **Source:** `qtv.c:172`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QTV_ForwardToServerEx -> TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls TP_ParseMacroString which reaches FS_LoadTempFile

#### `S_FModCheckExtraSounds`

- **Source:** `snd_main.c:313`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_FModCheckExtraSounds -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

#### `S_LocalSound`

- **Source:** `snd_main.c:1067`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `S_LocalSoundWithVol`

- **Source:** `snd_main.c:1082`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `S_PaintChannels`

- **Source:** `snd_mix.c:215`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_PaintChannels -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LoadSound which reaches FS_LoadTempFile

#### `S_RawAudio`

- **Source:** `snd_main.c:1194`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_RawAudio -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_StartSound which reaches FS_LoadTempFile

#### `S_SDL_callback`

- **Source:** `snd_main.c:165`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_SDL_callback -> S_Update_ -> S_PaintChannels -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_Update_ which reaches FS_LoadTempFile

#### `S_StartSound`

- **Source:** `snd_main.c:643`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LoadSound which reaches FS_LoadTempFile

#### `S_Startup`

- **Source:** `snd_main.c:337`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_Startup -> S_FModCheckExtraSounds -> FS_LoadTempFile`
- **Hint:** calls S_FModCheckExtraSounds which reaches FS_LoadTempFile

#### `S_StaticSound`

- **Source:** `snd_main.c:747`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_StaticSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LoadSound which reaches FS_LoadTempFile

#### `S_Update_`

- **Source:** `snd_main.c:953`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_Update_ -> S_PaintChannels -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_PaintChannels which reaches FS_LoadTempFile

#### `SB_Select_QWfwd`

- **Source:** `EX_browser.c:257`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Select_QWfwd -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `Serverinfo_Key`

- **Source:** `EX_browser.c:2179`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Serverinfo_Key -> SB_Select_QWfwd -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls SB_Select_QWfwd which reaches FS_LoadTempFile

#### `TP_CheckSoundTrigger`

- **Source:** `tp_triggers.c:146`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_CheckSoundTrigger -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `TP_ParseMacroString`

- **Source:** `teamplay.c:1457`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls TP_PrintHiddenMessage which reaches FS_LoadTempFile

#### `TP_PrintHiddenMessage`

- **Source:** `teamplay.c:997`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSoundWithVol which reaches FS_LoadTempFile

#### `WAVCaptureStart`

- **Source:** `movie.c:414`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `WAVCaptureStart -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

### Map / BSP

#### `HUD_NewMap`

- **Source:** `hud_common.c:522`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_NewMap -> HUD_NewRadarMap -> Image_LoadPNG_Comments -> Image_LoadPNG_All -> FS_OpenVFS`
- **Hint:** calls HUD_NewRadarMap which reaches FS_OpenVFS

#### `HUD_NewRadarMap`

- **Source:** `hud_radar.c:121`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_NewRadarMap -> Image_LoadPNG_Comments -> Image_LoadPNG_All -> FS_OpenVFS`
- **Hint:** calls Image_LoadPNG_Comments which reaches FS_OpenVFS

#### `R_NewMap`

- **Source:** `r_rmisc.c:214`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_NewMap -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** calls R_SetSky which reaches FS_LoadTempFile

#### `SCR_HUD_DrawScoreMapName`

- **Source:** `hud_gamesummary.c:200`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawScoreMapName -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `Stats_NewMap`

- **Source:** `fragstats.c:787`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Stats_NewMap -> LoadFragFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls LoadFragFile which reaches FS_LoadFile

#### `SV_Map`

- **Source:** `sv_ccmds.c:406`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls SV_SpawnServer which reaches FS_LoadHunkFile

#### `TP_LocFiles_NewMap`

- **Source:** `teamplay_locfiles.c:545`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_LocFiles_NewMap -> TP_LoadLocFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls TP_LoadLocFile which reaches FS_LoadFile

#### `TP_NewMap`

- **Source:** `teamplay.c:2026`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_NewMap -> TP_LocFiles_NewMap -> TP_LoadLocFile -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls TP_LocFiles_NewMap which reaches FS_LoadFile

### Demo

#### `CL_StartDemoCommand`

- **Source:** `cl_demo.c:3762`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_StartDemoCommand -> PlayQWZDemo -> FS_OpenVFS`
- **Hint:** calls PlayQWZDemo which reaches FS_OpenVFS

#### `CT_Demo_Entry_Draw`

- **Source:** `menu_demo.c:391`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Demo_Entry_Draw -> M_DrawTextBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_DrawTextBox which reaches FS_LoadTempFile

#### `CT_Demo_Options_Draw`

- **Source:** `menu_demo.c:439`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Demo_Options_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Demo_Playlist_Draw`

- **Source:** `menu_demo.c:363`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Demo_Playlist_Draw -> M_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_DrawCharacter which reaches FS_LoadTempFile

#### `Menu_Demo_Key`

- **Source:** `menu_demo.c:809`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Demo_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls CTab_Key which reaches FS_LoadTempFile

#### `Menu_Demo_Mouse_Event`

- **Source:** `menu_demo.c:825`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Demo_Mouse_Event -> Menu_Demo_Key -> CTab_Key -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls Menu_Demo_Key which reaches FS_LoadTempFile

#### `MVD_ClockList_TopItems_Draw`

- **Source:** `mvd_utils.c:741`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MVD_ClockList_TopItems_Draw -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `MVD_Info`

- **Source:** `mvd_utils.c:1047`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MVD_Info -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `MVD_Status`

- **Source:** `mvd_utils.c:1741`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MVD_Status -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `SCR_DrawDemoClock`

- **Source:** `hud_clock.c:330`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawDemoClock -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_HUD_DrawDemoClock`

- **Source:** `hud_clock.c:146`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawDemoClock -> SCR_DrawBigClock -> Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawBigClock which reaches FS_LoadTempFile

### Config / script

#### `Browser_Init2`

- **Source:** `EX_browser.c:3313`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Browser_Init2 -> Reload_Sources -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls Reload_Sources

#### `CL_Init`

- **Source:** `cl_main.c:2089`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Init -> ReloadPaletteAndColormap -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** initializes subsystem that calls ReloadPaletteAndColormap

#### `CL_InitTEnts`

- **Source:** `cl_tent.c:74`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_InitTEnts -> S_PrecacheSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls S_PrecacheSound

#### `Commands_For_Configs_Init`

- **Source:** `host.c:514`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Commands_For_Configs_Init -> MT_AddSkyGroups -> MT_SkyGroup_f -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls MT_AddSkyGroups

#### `CT_Opt_Config_Draw`

- **Source:** `menu_options.c:722`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_Config_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `customCrosshair_Init`

- **Source:** `r_draw.c:212`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `customCrosshair_Init -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `DemoControls_Init`

- **Source:** `demo_controls.c:223`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `DemoControls_Init -> EZ_button_Create -> EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls EZ_button_Create

#### `Draw_Init`

- **Source:** `r_draw.c:546`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_Init -> Draw_InitCrosshairs -> customCrosshair_Init -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls Draw_InitCrosshairs

#### `Draw_InitConback`

- **Source:** `r_draw.c:1017`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** initializes subsystem that calls FS_LoadHeapFile

#### `Draw_InitCrosshairs`

- **Source:** `r_draw.c:285`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_InitCrosshairs -> customCrosshair_Init -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls customCrosshair_Init

#### `EZ_button_Init`

- **Source:** `ez_button.c:195`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls EZ_button_SetPressedImage

#### `EZ_scrollbar_Init`

- **Source:** `ez_scrollbar.c:144`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_scrollbar_Init -> EZ_button_Create -> EZ_button_Init -> EZ_button_SetPressedImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls EZ_button_Create

#### `EZ_window_Init`

- **Source:** `ez_window.c:64`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_window_Init -> EZ_control_SetBackgroundImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** loads companion _wind.cfg for skybox wind animation

#### `FS_InitFilesystem`

- **Source:** `fs.c:821`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_InitFilesystem -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `FS_InitFilesystemEx`

- **Source:** `fs.c:697`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_InitFilesystemEx -> FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** initializes subsystem that calls FS_SetGamedir

#### `Host_Init`

- **Source:** `host.c:633`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Host_Init -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `HUD_Editor_Init`

- **Source:** `hud_editor.c:2627`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_Init -> SCR_LoadCursorImage -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls SCR_LoadCursorImage

#### `InitVXStuff`

- **Source:** `vx_stuff.c:262`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `InitVXStuff -> R_LoadTextureImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_LoadTextureImage

#### `MOpt_CfgSaveAllOn`

- **Source:** `menu_options.c:674`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MOpt_CfgSaveAllOn -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `MOpt_SaveCfg`

- **Source:** `menu_options.c:694`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MOpt_SaveCfg -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls S_LocalSound which reaches FS_LoadTempFile

#### `QMB_InitParticles`

- **Source:** `r_particles_qmb.c:329`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `QMB_InitParticles -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_LoadImagePixels

#### `R_Init`

- **Source:** `r_rmain.c:604`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_Init -> R_InitChatIcons -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_InitChatIcons

#### `R_InitChatIcons`

- **Source:** `r_chaticons.c:221`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_InitChatIcons -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_LoadImagePixels

#### `R_InitParticles`

- **Source:** `r_part.c:730`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_InitParticles -> QMB_InitParticles -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls QMB_InitParticles

#### `ResetConfigs`

- **Source:** `config_manager.c:775`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `ResetConfigs -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `S_Init`

- **Source:** `snd_main.c:477`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `S_Init -> S_Startup -> S_FModCheckExtraSounds -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls S_Startup

#### `SB_Confirmation_Draw`

- **Source:** `EX_browser.c:480`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Confirmation_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Sbar_Init`

- **Source:** `sbar.c:211`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_Init -> CL_LoginImageLoad -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** initializes subsystem that calls CL_LoginImageLoad

#### `SCR_Init`

- **Source:** `cl_screen.c:1074`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_Init -> ScrollBars_Init -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls ScrollBars_Init

#### `ScrollBars_Init`

- **Source:** `Ctrl_ScrollBar.c:41`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `ScrollBars_Init -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** initializes subsystem that calls Draw_CachePicSafe

#### `VX_TrackerInit`

- **Source:** `vx_tracker.c:1358`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VX_TrackerInit -> R_LoadPicImage -> R_LoadImagePixels -> FS_OpenVFS`
- **Hint:** initializes subsystem that calls R_LoadPicImage

### Font / charset

#### `Draw_BigFontAvailable`

- **Source:** `common_draw.c:882`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_BigFontAvailable -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `OnChange_gl_consolefont`

- **Source:** `r_draw_charset.c:215`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnChange_gl_consolefont -> Draw_LoadCharset -> Load_LMP_Charset -> FS_LoadTempFile`
- **Hint:** calls Draw_LoadCharset which reaches FS_LoadTempFile

### VM / QuakeC

#### `VM_Create`

- **Source:** `vm.c:1238`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VM_Create -> VM_LoadQVM -> FS_LoadTempFile`
- **Hint:** calls VM_LoadQVM which reaches FS_LoadTempFile

### HUD

#### `FrameStats_DrawElement`

- **Source:** `hud_performance.c:227`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FrameStats_DrawElement -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `HUD_Draw`

- **Source:** `hud.c:1518`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Draw -> HUD_AutoLoad_MVD -> Cmd_Exec_f -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls HUD_AutoLoad_MVD which reaches FS_LoadFile

#### `HUD_DrawFrame`

- **Source:** `hud.c:905`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `HUD_Editor`

- **Source:** `hud_editor.c:2381`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor -> HUD_Editor_DrawHelp -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_Editor_DrawHelp which reaches FS_LoadTempFile

#### `HUD_Editor_Draw`

- **Source:** `hud_editor.c:2818`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_Draw -> HUD_Editor -> HUD_Editor_DrawHelp -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_Editor which reaches FS_LoadTempFile

#### `HUD_Editor_DrawGreps`

- **Source:** `hud_editor.c:1639`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_DrawGreps -> Draw_ColoredString3 -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString3 which reaches FS_LoadTempFile

#### `HUD_Editor_DrawHelp`

- **Source:** `hud_editor.c:2244`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_DrawHelp -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `HUD_Editor_DrawHoverList`

- **Source:** `hud_editor.c:302`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_DrawHoverList -> Draw_ColoredString3 -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString3 which reaches FS_LoadTempFile

#### `HUD_Editor_DrawTooltip`

- **Source:** `hud_editor.c:373`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_DrawTooltip -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `HUD_Editor_Key`

- **Source:** `hud_editor.c:2558`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_Editor_Key -> HUD_Editor_Toggle_f -> S_LocalSound -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls HUD_Editor_Toggle_f which reaches FS_LoadTempFile

#### `HUD_PrepareDraw`

- **Source:** `hud.c:952`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_DrawFrame which reaches FS_LoadTempFile

#### `HUD_PrepareDrawByName`

- **Source:** `hud.c:937`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `HUD_PrepareDrawByName -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `OnAutoHudChange`

- **Source:** `hud_common.c:517`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `OnAutoHudChange -> HUD_AutoLoad_MVD -> Cmd_Exec_f -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls HUD_AutoLoad_MVD which reaches FS_LoadFile

#### `R_Render3DHud`

- **Source:** `r_rmain.c:859`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_Render3DHud -> R_DrawViewModel -> R_DrawAliasModel -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls R_DrawViewModel which reaches FS_LoadTempFile

#### `Sbar_DeathmatchOverlay`

- **Source:** `sbar.c:1322`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DeathmatchOverlay -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `Sbar_FinaleOverlay`

- **Source:** `sbar.c:2379`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_FinaleOverlay -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `Sbar_IntermissionOverlay`

- **Source:** `sbar.c:2330`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_IntermissionOverlay -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `Sbar_MiniDeathmatchOverlay`

- **Source:** `sbar.c:2173`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_MiniDeathmatchOverlay -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `Sbar_TeamOverlay`

- **Source:** `sbar.c:1966`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_TeamOverlay -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `SCR_DrawElements`

- **Source:** `cl_screen.c:731`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawElements -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_Draw which reaches FS_LoadTempFile

#### `SCR_DrawHud`

- **Source:** `hud_262.c:578`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawHud -> TP_ParseMacroString -> TP_PrintHiddenMessage -> S_LocalSoundWithVol -> S_StartSound -> S_LoadSound -> FS_LoadTempFile`
- **Hint:** calls TP_ParseMacroString which reaches FS_LoadTempFile

#### `SCR_DrawHUDSpeed`

- **Source:** `hud_speed.c:56`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawHUDSpeed -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_DrawMultiviewIndividualElements`

- **Source:** `cl_screen.c:699`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawMultiviewIndividualElements -> Draw_Crosshair -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** loads companion _wind.cfg for skybox wind animation

#### `SCR_HUD_DrawAmmo`

- **Source:** `hud_ammo.c:107`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawAmmo -> Draw_SStringAligned -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SStringAligned which reaches FS_LoadTempFile

#### `SCR_HUD_DrawAmmoIcon`

- **Source:** `hud_ammo.c:323`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawAmmoIcon -> Draw_SAlt_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SAlt_String which reaches FS_LoadTempFile

#### `SCR_HUD_DrawArmorIcon`

- **Source:** `hud_armor.c:92`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawArmorIcon -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `SCR_HUD_DrawBarArmor`

- **Source:** `hud_armor.c:175`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawBarArmor -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawBarHealth`

- **Source:** `hud_health.c:72`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawBarHealth -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawCenterPrint`

- **Source:** `hud_centerprint.c:198`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawCenterPrint -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawFace`

- **Source:** `hud_face.c:25`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawFace -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawFPS`

- **Source:** `hud_performance.c:37`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawFPS -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawFrags`

- **Source:** `hud_frags.c:780`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawFrags -> Frags_DrawColors -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Frags_DrawColors which reaches FS_LoadTempFile

#### `SCR_HUD_DrawFrameTime`

- **Source:** `hud_performance.c:101`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawFrameTime -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGroup`

- **Source:** `hud_groups.c:48`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGroup -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun2`

- **Source:** `hud_guns.c:182`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun2 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun3`

- **Source:** `hud_guns.c:201`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun3 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun4`

- **Source:** `hud_guns.c:220`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun4 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun5`

- **Source:** `hud_guns.c:239`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun5 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun6`

- **Source:** `hud_guns.c:258`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun6 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun7`

- **Source:** `hud_guns.c:277`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun7 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGun8`

- **Source:** `hud_guns.c:296`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGun8 -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGunByNum`

- **Source:** `hud_guns.c:30`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGunCurrent`

- **Source:** `hud_guns.c:316`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGunCurrent -> SCR_HUD_DrawGunByNum -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawGunByNum which reaches FS_LoadTempFile

#### `SCR_HUD_DrawKey1`

- **Source:** `hud_items.c:70`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawKey1 -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawKey2`

- **Source:** `hud_items.c:84`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawKey2 -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawKeys`

- **Source:** `hud_common.c:684`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawKeys -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawNetStats`

- **Source:** `hud_net.c:29`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawNetStats -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawNotify`

- **Source:** `hud_common.c:189`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawNotify -> SCR_DrawNotify -> Draw_ConsoleString -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawNotify which reaches FS_LoadTempFile

#### `SCR_HUD_DrawNum2`

- **Source:** `hud_common.c:229`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawNum2 -> Draw_SColoredAlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredAlphaString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawOwnFrags`

- **Source:** `hud_scores.c:730`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawOwnFrags -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawPent`

- **Source:** `hud_items.c:112`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawPent -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawPing`

- **Source:** `hud_net.c:234`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawPing -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawPowerup`

- **Source:** `hud_items.c:28`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `SCR_HUD_DrawQTVBuffer`

- **Source:** `hud_qtv.c:50`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawQTVBuffer -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawQuad`

- **Source:** `hud_items.c:140`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawQuad -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawRadar`

- **Source:** `hud_radar.c:1202`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawRadar -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawRing`

- **Source:** `hud_items.c:98`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawRing -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawScoresBar`

- **Source:** `hud_scores.c:537`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawScoresBar -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSigil`

- **Source:** `hud_items.c:157`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSigil -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSigil1`

- **Source:** `hud_items.c:185`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSigil1 -> SCR_HUD_DrawSigil -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawSigil which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSigil2`

- **Source:** `hud_items.c:199`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSigil2 -> SCR_HUD_DrawSigil -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawSigil which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSigil3`

- **Source:** `hud_items.c:213`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSigil3 -> SCR_HUD_DrawSigil -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawSigil which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSigil4`

- **Source:** `hud_items.c:227`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSigil4 -> SCR_HUD_DrawSigil -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawSigil which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSpeed`

- **Source:** `hud_speed.c:344`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSpeed -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSpeed2`

- **Source:** `hud_speed.c:411`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSpeed2 -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawSuit`

- **Source:** `hud_items.c:126`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawSuit -> SCR_HUD_DrawPowerup -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_DrawPowerup which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTeamFrags`

- **Source:** `hud_frags.c:1231`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTeamFrags -> Frags_DrawColors -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Frags_DrawColors which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTeamHoldBar`

- **Source:** `stats_grid.c:1292`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTeamHoldBar -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTeamHoldInfo`

- **Source:** `stats_grid.c:1144`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTeamHoldInfo -> Draw_SColoredStringBasic -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredStringBasic which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTeamInfo`

- **Source:** `hud_teaminfo.c:88`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTeamInfo -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTracker`

- **Source:** `vx_tracker.c:1502`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTracker -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawTracking`

- **Source:** `hud_tracking.c:32`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawTracking -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_DrawVidLag`

- **Source:** `hud_performance.c:159`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawVidLag -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_Hud_GameSummary`

- **Source:** `hud_gamesummary.c:25`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_Hud_GameSummary -> Draw_SStringAligned -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SStringAligned which reaches FS_LoadTempFile

#### `SCR_HUD_Groups_Draw`

- **Source:** `hud_groups.c:166`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_Groups_Draw -> SCR_HUD_LoadGroupPic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_HUD_LoadGroupPic which reaches FS_LoadTempFile

#### `SCR_HUD_MultiLineString`

- **Source:** `hud_common.c:791`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_MultiLineString -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_HUD_NetProblem`

- **Source:** `hud_net.c:207`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_NetProblem -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_Hud_StackBar`

- **Source:** `hud_common.c:549`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_Hud_StackBar -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_WeaponStats`

- **Source:** `hud_weapon_stats.c:159`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_WeaponStats -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HudDrawTeamInfoPlayer`

- **Source:** `hud_teaminfo.c:249`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HudDrawTeamInfoPlayer -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_UpdateScreenHudOnly`

- **Source:** `cl_screen.c:983`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_UpdateScreenHudOnly -> SCR_DrawElements -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawElements which reaches FS_LoadTempFile

### Location / loc file

#### `GLC_AllocateAliasPoseBuffer`

- **Source:** `glc_aliasmodel.c:115`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GLC_AllocateAliasPoseBuffer -> Mod_Extradata -> Mod_LoadModel -> FS_LoadTempFile`
- **Hint:** calls Mod_Extradata which reaches FS_LoadTempFile

#### `SCR_DrawBigClock`

- **Source:** `hud_clock.c:438`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawBigClock -> Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacter which reaches FS_LoadTempFile

#### `SCR_DrawClock`

- **Source:** `hud_clock.c:244`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawClock -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawGameClock`

- **Source:** `hud_clock.c:269`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawGameClock -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawSmallClock`

- **Source:** `hud_clock.c:473`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawSmallClock -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `SCR_HUD_DrawClock`

- **Source:** `hud_clock.c:47`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawClock -> SCR_DrawBigClock -> Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawBigClock which reaches FS_LoadTempFile

#### `SCR_HUD_DrawGameClock`

- **Source:** `hud_clock.c:99`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawGameClock -> SCR_DrawBigClock -> Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawBigClock which reaches FS_LoadTempFile

#### `SCR_HUD_DrawItemsClock`

- **Source:** `hud_common.c:637`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawItemsClock -> HUD_PrepareDraw -> HUD_DrawFrame -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls HUD_PrepareDraw which reaches FS_LoadTempFile

#### `SCR_HUD_DrawScoreClock`

- **Source:** `hud_clock.c:188`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_HUD_DrawScoreClock -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `TP_SaveLocFile`

- **Source:** `teamplay_locfiles.c:221`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TP_SaveLocFile -> FS_WriteFile`
- **Hint:** calls FS_WriteFile which reaches FS_WriteFile

### Uncategorized

#### `NQD_ReadPackets`

- **Source:** `cl_nqdemo.c:1337`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `NQD_ReadPackets -> NQD_ParseServerMessage -> NQD_ParseServerData -> CM_LoadMap -> CM_LoadPhysicsNormals -> FS_LoadHunkFile`
- **Hint:** calls NQD_ParseServerMessage which reaches FS_LoadHunkFile

#### `CL_Userdir_f`

- **Source:** `cl_cmd.c:846`
- **Discovered by:** Pass 1 (call graph), Pass 2 (registered callback)
- **Reach trace:** `CL_Userdir_f -> FS_SetUserDirectory -> FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Registration:** `Cmd_AddCommand "userdir"` at `cl_cmd.c:953`
- **Hint:** calls FS_SetUserDirectory which reaches FS_LoadFile

#### `Add_Server_Draw`

- **Source:** `EX_browser.c:883`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Add_Server_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Add_Source_Draw`

- **Source:** `EX_browser.c:1568`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Add_Source_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Add_Source_Key`

- **Source:** `EX_browser.c:1867`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Add_Source_Key -> SB_Source_Add -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls SB_Source_Add which reaches FS_OpenVFS

#### `AuthUsernameChanged`

- **Source:** `cl_main.c:2990`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `AuthUsernameChanged -> FS_LoadTempFile`
- **Hint:** calls FS_LoadTempFile which reaches FS_LoadTempFile

#### `CEditBox_Draw`

- **Source:** `Ctrl_EditBox.c:36`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CEditBox_Draw -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `CL_CheckQizmoCompletion`

- **Source:** `cl_demo.c:3044`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_CheckQizmoCompletion -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_LoadHeapFile which reaches FS_LoadFile

#### `CL_Frame`

- **Source:** `cl_main.c:2400`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Frame -> CL_ServerFrame -> SV_Frame -> SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls CL_ServerFrame which reaches FS_LoadHunkFile

#### `CL_GetMessage`

- **Source:** `cl_main.c:1660`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_GetMessage -> CL_CheckQizmoCompletion -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls CL_CheckQizmoCompletion which reaches FS_LoadFile

#### `CL_Prespawn`

- **Source:** `cl_parse.c:588`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_Prespawn -> R_NewMap -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** calls R_NewMap which reaches FS_LoadTempFile

#### `CL_ServerFrame`

- **Source:** `cl_main.c:2385`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CL_ServerFrame -> SV_Frame -> SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls SV_Frame which reaches FS_LoadHunkFile

#### `Con_DrawConsole`

- **Source:** `console.c:901`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Con_DrawConsole -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ConsoleBackground which reaches FS_LoadTempFile

#### `Con_DrawInput`

- **Source:** `console.c:704`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Con_DrawInput -> Draw_ConsoleString -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ConsoleString which reaches FS_LoadTempFile

#### `Con_DrawNotify`

- **Source:** `console.c:837`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Con_DrawNotify -> SCR_DrawNotify -> Draw_ConsoleString -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SCR_DrawNotify which reaches FS_LoadTempFile

#### `Con_NotifyMessageLine`

- **Source:** `console.c:758`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Con_NotifyMessageLine -> Draw_CharacterWSP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterWSP which reaches FS_LoadTempFile

#### `CPageViewer_Draw`

- **Source:** `Ctrl_PageViewer.c:195`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CPageViewer_Draw -> RenderDocument -> XSD_LoadDocumentWithXsl -> XSD_LoadDocument -> FS_OpenVFS`
- **Hint:** calls RenderDocument which reaches FS_OpenVFS

#### `CreateGame_Draw`

- **Source:** `menu_multiplayer.c:451`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CreateGame_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_Binds_Draw`

- **Source:** `menu_options.c:326`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_Binds_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_FPS_Draw`

- **Source:** `menu_options.c:444`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_FPS_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_Player_Draw`

- **Source:** `menu_options.c:299`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_Player_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_Settings_Draw`

- **Source:** `menu_options.c:264`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_Settings_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_System_Draw`

- **Source:** `menu_options.c:592`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_System_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `CT_Opt_View_Draw`

- **Source:** `menu_options.c:284`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `CT_Opt_View_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `Draw_AlphaString`

- **Source:** `r_draw_charset.c:578`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_AlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_Alt_String`

- **Source:** `r_draw_charset.c:572`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_Alt_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_BigString`

- **Source:** `r_draw_charset.c:403`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_BigString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_Character`

- **Source:** `r_draw_charset.c:292`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_CharacterBaseW`

- **Source:** `r_draw_charset.c:251`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls R_Draw_CharacterBase which reaches FS_LoadTempFile

#### `Draw_CharacterW`

- **Source:** `r_draw_charset.c:286`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_CharacterW -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_CharacterWSP`

- **Source:** `r_draw_charset.c:279`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_CharacterWSP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_ColoredString`

- **Source:** `r_draw_charset.c:561`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_ColoredString3`

- **Source:** `r_draw_charset.c:556`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_ColoredString3 -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_ConsoleBackground`

- **Source:** `r_draw.c:1056`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `Draw_ConsoleString`

- **Source:** `r_draw_charset.c:462`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_ConsoleString -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_Crosshair`

- **Source:** `r_draw.c:604`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_Crosshair -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `Draw_SAlt_String`

- **Source:** `r_draw_charset.c:457`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SAlt_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SCharacter`

- **Source:** `r_draw_charset.c:266`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_SCharacterP`

- **Source:** `r_draw_charset.c:272`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `Draw_SColoredAlphaString`

- **Source:** `r_draw_charset.c:408`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SColoredAlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SColoredStringAligned`

- **Source:** `r_draw_charset.c:413`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SColoredStringAligned -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SColoredStringBasic`

- **Source:** `r_draw_charset.c:566`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SColoredStringBasic -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SString`

- **Source:** `r_draw_charset.c:447`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SStringAligned`

- **Source:** `r_draw_charset.c:430`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SStringAligned -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_SStringAlpha`

- **Source:** `r_draw_charset.c:452`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_SStringAlpha -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_String`

- **Source:** `r_draw_charset.c:583`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_StringBase which reaches FS_LoadTempFile

#### `Draw_StringBase`

- **Source:** `r_draw_charset.c:303`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CharacterBaseW which reaches FS_LoadTempFile

#### `EZ_label_OnDraw`

- **Source:** `ez_label.c:523`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_label_OnDraw -> Draw_SColoredAlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredAlphaString which reaches FS_LoadTempFile

#### `EZ_slider_OnDraw`

- **Source:** `ez_slider.c:237`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `EZ_slider_OnDraw -> Draw_SCharacter -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacter which reaches FS_LoadTempFile

#### `Frags_DrawColors`

- **Source:** `hud_frags.c:275`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Frags_DrawColors -> Draw_SCharacterP -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SCharacterP which reaches FS_LoadTempFile

#### `Frags_DrawExtraSpecInfo`

- **Source:** `hud_frags.c:511`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Frags_DrawExtraSpecInfo -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `FS_SetGamedir`

- **Source:** `fs.c:594`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls Draw_InitConback which reaches FS_LoadFile

#### `FS_SetUserDirectory`

- **Source:** `fs.c:423`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_SetUserDirectory -> FS_SetGamedir -> Draw_InitConback -> FS_LoadHeapFile -> FS_LoadFile`
- **Hint:** calls FS_SetGamedir which reaches FS_LoadFile

#### `FS_WriteFile_2`

- **Source:** `fs.c:249`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_WriteFile_2 -> FS_WriteFileRelative -> FS_OpenVFS`
- **Hint:** calls FS_WriteFileRelative which reaches FS_OpenVFS

#### `FS_WriteFileRelative`

- **Source:** `fs.c:215`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `FS_WriteFileRelative -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `GetServerPingsAndInfosProc`

- **Source:** `EX_browser_net.c:556`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `GetServerPingsAndInfosProc -> SB_Sources_Update -> Update_Multiple_Sources -> Update_Multiple_Sources_Proc -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls SB_Sources_Update which reaches FS_OpenVFS

#### `Help_Browser_Draw`

- **Source:** `help_files.c:62`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Help_Browser_Draw -> CPageViewer_Draw -> RenderDocument -> XSD_LoadDocumentWithXsl -> XSD_LoadDocument -> FS_OpenVFS`
- **Hint:** calls CPageViewer_Draw which reaches FS_OpenVFS

#### `Host_Frame`

- **Source:** `host.c:473`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Host_Frame -> CL_Frame -> CL_ServerFrame -> SV_Frame -> SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls CL_Frame which reaches FS_LoadHunkFile

#### `IN_Commands`

- **Source:** `in_sdl2.c:290`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `IN_Commands -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `Join_Server`

- **Source:** `EX_browser.c:294`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Join_Server -> SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Browser_Hide which reaches FS_LoadTempFile

#### `Join_Server_Direct`

- **Source:** `EX_browser.c:308`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Join_Server_Direct -> SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Browser_Hide which reaches FS_LoadTempFile

#### `Key_ClearStates`

- **Source:** `keys.c:2400`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Key_ClearStates -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `Key_Event`

- **Source:** `keys.c:2338`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_EventEx which reaches FS_OpenVFS

#### `keyb_event`

- **Source:** `vid_sdl2.c:741`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `keyb_event -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `M_BigMenu_DrawItems`

- **Source:** `menu.c:402`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_BigMenu_DrawItems -> Draw_BigString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_BigString which reaches FS_LoadTempFile

#### `M_Draw`

- **Source:** `menu.c:1326`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ConsoleBackground which reaches FS_LoadTempFile

#### `M_DrawCharacter`

- **Source:** `menu.c:122`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `M_DrawSlider`

- **Source:** `menu.c:169`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_DrawSlider -> M_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_DrawCharacter which reaches FS_LoadTempFile

#### `M_Ingame_Draw`

- **Source:** `menu_ingame.c:172`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Ingame_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `M_Keydown`

- **Source:** `menu.c:1427`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls M_SinglePlayer_Key which reaches FS_OpenVFS

#### `M_Main_Draw`

- **Source:** `menu.c:423`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Main_Draw -> Draw_BigFontAvailable -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_BigFontAvailable which reaches FS_LoadTempFile

#### `M_Main_Enter`

- **Source:** `menu.c:462`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Main_Enter -> M_Menu_MultiPlayer_f -> Draw_BigFontAvailable -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_Menu_MultiPlayer_f which reaches FS_LoadTempFile

#### `M_MultiPlayerSub_Draw`

- **Source:** `menu.c:1172`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_MultiPlayerSub_Draw -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `M_Print_GetPoint`

- **Source:** `menu.c:126`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Print_GetPoint -> Draw_Alt_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Alt_String which reaches FS_LoadTempFile

#### `M_PrintWhite`

- **Source:** `menu.c:144`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_PrintWhite -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `M_Quit_Draw`

- **Source:** `menu.c:658`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Quit_Draw -> M_DrawTextBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_DrawTextBox which reaches FS_LoadTempFile

#### `M_Save_Draw`

- **Source:** `menu.c:1029`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_Save_Draw -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `M_ScanSaves`

- **Source:** `menu.c:955`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_ScanSaves -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `M_SinglePlayer_Draw`

- **Source:** `menu.c:709`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_SinglePlayer_Draw -> Draw_BigFontAvailable -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_BigFontAvailable which reaches FS_LoadTempFile

#### `M_SinglePlayer_Key`

- **Source:** `menu.c:793`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls M_Menu_Load_f which reaches FS_OpenVFS

#### `M_SinglePlayer_Mouse_Event`

- **Source:** `menu.c:888`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `M_SinglePlayer_Mouse_Event -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls M_SinglePlayer_Key which reaches FS_OpenVFS

#### `main`

- **Source:** `sys_posix.c:318`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `main -> Host_Init -> FS_OpenVFS`
- **Hint:** calls Host_Init which reaches FS_OpenVFS

#### `Menu_Mouse_Event`

- **Source:** `menu.c:1451`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_Mouse_Event -> M_SinglePlayer_Mouse_Event -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls M_SinglePlayer_Mouse_Event which reaches FS_OpenVFS

#### `Menu_MultiPlayer_Draw`

- **Source:** `menu_multiplayer.c:396`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Menu_MultiPlayer_Draw -> SB_Specials_Draw -> PingPhase_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Specials_Draw which reaches FS_LoadTempFile

#### `MOpt_FilenameInputBoxDraw`

- **Source:** `menu_options.c:704`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `MOpt_FilenameInputBoxDraw -> UI_DrawBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls UI_DrawBox which reaches FS_LoadTempFile

#### `mouse_button_event`

- **Source:** `vid_sdl2.c:776`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `mouse_button_event -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `Mouse_ButtonEvent`

- **Source:** `keys.c:2032`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mouse_ButtonEvent -> Mouse_EventDispatch -> Menu_Mouse_Event -> M_SinglePlayer_Mouse_Event -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Mouse_EventDispatch which reaches FS_OpenVFS

#### `Mouse_EventDispatch`

- **Source:** `keys.c:2003`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mouse_EventDispatch -> Menu_Mouse_Event -> M_SinglePlayer_Mouse_Event -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Menu_Mouse_Event which reaches FS_OpenVFS

#### `Mouse_MoveEvent`

- **Source:** `keys.c:2054`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Mouse_MoveEvent -> Mouse_EventDispatch -> Menu_Mouse_Event -> M_SinglePlayer_Mouse_Event -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Mouse_EventDispatch which reaches FS_OpenVFS

#### `mouse_wheel_event`

- **Source:** `vid_sdl2.c:806`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `mouse_wheel_event -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `Movie_Start`

- **Source:** `movie.c:110`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Movie_Start -> WAVCaptureStart -> FS_OpenVFS`
- **Hint:** calls WAVCaptureStart which reaches FS_OpenVFS

#### `Observe_Server`

- **Source:** `EX_browser.c:317`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Observe_Server -> SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Browser_Hide which reaches FS_LoadTempFile

#### `Options_Draw`

- **Source:** `menu_multiplayer.c:391`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Options_Draw -> Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Settings_Draw which reaches FS_LoadTempFile

#### `PingPhase_Draw`

- **Source:** `EX_browser.c:1154`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `PingPhase_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `PR2_GameSystemCalls`

- **Source:** `pr2_cmds.c:2519`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `PR2_GameSystemCalls -> PF2_FS_OpenFile -> FS_OpenVFS`
- **Hint:** calls PF2_FS_OpenFile which reaches FS_OpenVFS

#### `R_Draw_CharacterBase`

- **Source:** `r_draw_charset.c:800`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePicSafe which reaches FS_LoadTempFile

#### `R_MQW_NetGraph`

- **Source:** `r_netgraph.c:37`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `R_MQW_NetGraph -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `Radar_DrawEntities`

- **Source:** `hud_radar.c:382`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Radar_DrawEntities -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `RenderDocument`

- **Source:** `Ctrl_PageViewer.c:116`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `RenderDocument -> XSD_LoadDocumentWithXsl -> XSD_LoadDocument -> FS_OpenVFS`
- **Hint:** calls XSD_LoadDocumentWithXsl which reaches FS_OpenVFS

#### `SB_Browser_Hide`

- **Source:** `EX_browser.c:282`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls M_Draw which reaches FS_LoadTempFile

#### `SB_Players_Key`

- **Source:** `EX_browser.c:2513`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Players_Key -> Observe_Server -> SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Observe_Server which reaches FS_LoadTempFile

#### `SB_Servers_Draw`

- **Source:** `EX_browser.c:1000`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Servers_Draw -> Add_Server_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Add_Server_Draw which reaches FS_LoadTempFile

#### `SB_Servers_Key`

- **Source:** `EX_browser.c:2054`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Servers_Key -> Observe_Server -> SB_Browser_Hide -> M_Draw -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Observe_Server which reaches FS_LoadTempFile

#### `SB_Source_Add`

- **Source:** `EX_browser_sources.c:814`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Source_Add -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Source which reaches FS_OpenVFS

#### `SB_Sources_Draw`

- **Source:** `EX_browser.c:1612`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Sources_Draw -> Add_Source_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Add_Source_Draw which reaches FS_LoadTempFile

#### `SB_Sources_Key`

- **Source:** `EX_browser.c:2391`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Sources_Key -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Source which reaches FS_OpenVFS

#### `SB_Sources_Mouse_Event`

- **Source:** `EX_browser.c:2671`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Sources_Mouse_Event -> SB_Sources_Key -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls SB_Sources_Key which reaches FS_OpenVFS

#### `SB_Sources_Update`

- **Source:** `EX_browser_sources.c:699`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Sources_Update -> Update_Multiple_Sources -> Update_Multiple_Sources_Proc -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Multiple_Sources which reaches FS_OpenVFS

#### `SB_Specials_Draw`

- **Source:** `EX_browser.c:2694`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Specials_Draw -> PingPhase_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls PingPhase_Draw which reaches FS_LoadTempFile

#### `SB_Specials_Key`

- **Source:** `EX_browser.c:2702`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SB_Specials_Key -> Add_Source_Key -> SB_Source_Add -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Add_Source_Key which reaches FS_OpenVFS

#### `Sbar_Draw`

- **Source:** `sbar.c:2389`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_Draw -> Sbar_DeathmatchOverlay -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Sbar_DeathmatchOverlay which reaches FS_LoadTempFile

#### `Sbar_DrawAltString`

- **Source:** `sbar.c:400`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawAltString -> Draw_Alt_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Alt_String which reaches FS_LoadTempFile

#### `Sbar_DrawCharacter`

- **Source:** `sbar.c:390`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `Sbar_DrawFrags_DrawCellPlayer`

- **Source:** `sbar.c:882`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawFrags_DrawCellPlayer -> Sbar_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Sbar_DrawCharacter which reaches FS_LoadTempFile

#### `Sbar_DrawFrags_DrawTeamCell`

- **Source:** `sbar.c:903`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawFrags_DrawTeamCell -> Sbar_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Sbar_DrawCharacter which reaches FS_LoadTempFile

#### `Sbar_DrawInventory`

- **Source:** `sbar.c:769`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawInventory -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `Sbar_DrawString`

- **Source:** `sbar.c:395`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sbar_DrawString -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawAccel`

- **Source:** `cl_screen.c:423`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawAccel -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawAutoID`

- **Source:** `hud_autoid.c:401`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawAutoID -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_DrawAutoIDStatus`

- **Source:** `hud_autoid.c:182`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawAutoIDStatus -> Draw_SColoredStringBasic -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredStringBasic which reaches FS_LoadTempFile

#### `SCR_DrawCenterString`

- **Source:** `hud_centerprint.c:89`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawCenterString -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `SCR_DrawConsole`

- **Source:** `cl_screen.c:565`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawConsole -> Con_DrawConsole -> Draw_ConsoleBackground -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Con_DrawConsole which reaches FS_LoadTempFile

#### `SCR_DrawDamageIndicators`

- **Source:** `cl_screen.c:1234`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawDamageIndicators -> Draw_SStringAligned -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SStringAligned which reaches FS_LoadTempFile

#### `SCR_DrawFPS`

- **Source:** `hud_performance.c:363`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawFPS -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawMVStatusStrings`

- **Source:** `cl_multiview.c:796`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawMVStatusStrings -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawMVStatusView`

- **Source:** `cl_multiview.c:515`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawMVStatusView -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawNotify`

- **Source:** `console.c:845`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawNotify -> Draw_ConsoleString -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ConsoleString which reaches FS_LoadTempFile

#### `SCR_DrawPause`

- **Source:** `cl_screen.c:473`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawPause -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_CachePic which reaches FS_LoadTempFile

#### `SCR_DrawQTVBuffer`

- **Source:** `hud_qtv.c:30`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawQTVBuffer -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_DrawSpeed`

- **Source:** `hud_speed.c:727`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_DrawSpeed -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_MV_DrawArmor`

- **Source:** `cl_multiview.c:312`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_MV_DrawArmor -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `SCR_MV_DrawCurrentAmmo`

- **Source:** `cl_multiview.c:465`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_MV_DrawCurrentAmmo -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `SCR_MV_DrawHealth`

- **Source:** `cl_multiview.c:366`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_MV_DrawHealth -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_MV_DrawName`

- **Source:** `cl_multiview.c:303`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_MV_DrawName -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `SCR_VoiceMeter`

- **Source:** `cl_screen.c:660`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SCR_VoiceMeter -> Draw_String -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_String which reaches FS_LoadTempFile

#### `Serverinfo_Draw`

- **Source:** `EX_browser.c:1246`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Serverinfo_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Serverinfo_Help_Draw`

- **Source:** `EX_browser.c:1205`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Serverinfo_Help_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `Serverinfo_Sources_Draw`

- **Source:** `EX_browser.c:1515`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Serverinfo_Sources_Draw -> UI_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls UI_DrawCharacter which reaches FS_LoadTempFile

#### `Servers_Draw`

- **Source:** `menu_multiplayer.c:332`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Servers_Draw -> SB_Servers_Draw -> Add_Server_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Servers_Draw which reaches FS_LoadTempFile

#### `Setting_DrawHelpBox`

- **Source:** `settings_page.c:503`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Setting_DrawHelpBox -> UI_DrawBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls UI_DrawBox which reaches FS_LoadTempFile

#### `Setting_DrawString`

- **Source:** `settings_page.c:201`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Setting_DrawString -> CEditBox_Draw -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls CEditBox_Draw which reaches FS_LoadTempFile

#### `Settings_Draw`

- **Source:** `settings_page.c:817`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Settings_Draw -> Setting_DrawSkinPreview -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Setting_DrawSkinPreview which reaches FS_LoadTempFile

#### `Sources_Draw`

- **Source:** `menu_multiplayer.c:352`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sources_Draw -> SB_Sources_Draw -> Add_Source_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls SB_Sources_Draw which reaches FS_LoadTempFile

#### `Sources_Key`

- **Source:** `menu_multiplayer.c:357`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sources_Key -> SB_Sources_Key -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls SB_Sources_Key which reaches FS_OpenVFS

#### `Sources_Mouse_Event`

- **Source:** `menu_multiplayer.c:362`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sources_Mouse_Event -> SB_Sources_Mouse_Event -> SB_Sources_Key -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls SB_Sources_Mouse_Event which reaches FS_OpenVFS

#### `SV_Frame`

- **Source:** `sv_null.c:29`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SV_Frame -> SV_Map -> SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls SV_Map which reaches FS_LoadHunkFile

#### `SV_SpawnServer`

- **Source:** `sv_init.c:219`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `SV_SpawnServer -> FS_LoadHunkFile`
- **Hint:** calls FS_LoadHunkFile which reaches FS_LoadHunkFile

#### `Sys_SendDeferredKeyEvents`

- **Source:** `vid_sdl2.c:392`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Sys_SendDeferredKeyEvents -> Key_Event -> Key_EventEx -> M_Keydown -> M_SinglePlayer_Key -> M_Menu_Load_f -> FS_OpenVFS`
- **Hint:** calls Key_Event which reaches FS_OpenVFS

#### `TeamFrags_DrawExtraSpecInfo`

- **Source:** `hud_frags.c:429`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TeamFrags_DrawExtraSpecInfo -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `TeamHold_DrawPercentageBar`

- **Source:** `stats_grid.c:931`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `TeamHold_DrawPercentageBar -> Draw_SString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SString which reaches FS_LoadTempFile

#### `UI_DrawBox`

- **Source:** `Ctrl.c:137`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UI_DrawBox -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `UI_DrawCharacter`

- **Source:** `Ctrl.c:28`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UI_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_Character which reaches FS_LoadTempFile

#### `UI_DrawSlider`

- **Source:** `Ctrl.c:52`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UI_DrawSlider -> UI_DrawCharacter -> Draw_Character -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls UI_DrawCharacter which reaches FS_LoadTempFile

#### `UI_Print`

- **Source:** `Ctrl.c:33`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UI_Print -> Draw_ColoredString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString which reaches FS_LoadTempFile

#### `UI_Print3`

- **Source:** `Ctrl.c:66`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UI_Print3 -> Draw_ColoredString3 -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_ColoredString3 which reaches FS_LoadTempFile

#### `Update_Multiple_Sources`

- **Source:** `EX_browser_sources.c:693`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Update_Multiple_Sources -> Update_Multiple_Sources_Proc -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Multiple_Sources_Proc which reaches FS_OpenVFS

#### `Update_Multiple_Sources_Proc`

- **Source:** `EX_browser_sources.c:496`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Update_Multiple_Sources_Proc -> Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Source which reaches FS_OpenVFS

#### `Update_Source`

- **Source:** `EX_browser_sources.c:340`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Update_Source -> Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls Update_Source_From_File which reaches FS_OpenVFS

#### `Update_Source_From_File`

- **Source:** `EX_browser_sources.c:90`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `Update_Source_From_File -> FS_OpenVFS`
- **Hint:** calls FS_OpenVFS which reaches FS_OpenVFS

#### `UpdatingSources_Draw`

- **Source:** `EX_browser.c:1180`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `UpdatingSources_Draw -> Draw_TextBox -> Draw_CachePic -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_TextBox which reaches FS_LoadTempFile

#### `VID_Startup`

- **Source:** `vid_sdl2.c:1760`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VID_Startup -> R_NewMap -> R_SetSky -> Skywind_Load_f -> FS_LoadTempFile`
- **Hint:** calls R_NewMap which reaches FS_LoadTempFile

#### `VXSCR_DrawTrackerString`

- **Source:** `vx_tracker.c:1229`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `VXSCR_DrawTrackerString -> Draw_SColoredAlphaString -> Draw_StringBase -> Draw_CharacterBaseW -> R_Draw_CharacterBase -> Draw_CachePicSafe -> FS_LoadTempFile`
- **Hint:** calls Draw_SColoredAlphaString which reaches FS_LoadTempFile

#### `WinMain`

- **Source:** `sys_win.c:1254`
- **Discovered by:** Pass 1 (call graph)
- **Reach trace:** `WinMain -> Host_Init -> FS_OpenVFS`
- **Hint:** calls Host_Init which reaches FS_OpenVFS
