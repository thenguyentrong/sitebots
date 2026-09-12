# 3D viewer maintenance

The viewer restores URDF joint pivots before applying poses. glTF quantization can move a leaf mesh node away from its joint origin. `lib/models/rig.ts` preserves the mesh decode transform below a separate pivot. Each viewer clones the cached scene hierarchy and shares read-only geometry/materials.

Camera controls: orbit, pan, cursor zoom, pinch zoom, two-finger pan, front/side/top, reset, expansion. Joint controls honor recorded limits and mimic relationships, with sliders for revolute, continuous, and prismatic joints. Posing does not simulate balance, collision, dynamics, or training. Missing 3D geometry does not establish whether a robot can be bought or trained.

Variant pages use variant-specific poses. Presets without effective movement are omitted. Scale and camera controls preserve the current pose. Model-load failures have an isolated retry UI.

Verified on 2026-09-12: 32 published models and 82 available browser poses; 29 catalogue thumbnails regenerated; 44 unit checks; 8 browser tests; mobile pinch/pan; production build. The build has existing file-tracing warnings from the scraper/admin refresh route.

From the project root:

```powershell
npx vitest run lib/models/rig.test.ts lib/models/kinematics.test.ts lib/models/poses.test.ts
npx playwright test tests/models.spec.ts tests/viewer-controls.spec.ts --workers=1
# With next dev running on port 3000:
node --import tsx tests/model-audit.ts
node --import tsx tests/viewer-touch.ts
node --import tsx scripts/assets/render-models.ts
npm run shot -- http://localhost:3000/robots/unitree/g1 .out/g1.png
npm run build
```

The audit writes `.out/model-audit/report.json` and screenshots. Existing render URLs remain valid, so thumbnail regeneration needs no database update. Do not open the live PGlite directory from another process while the dev server runs.
