# Pie-Chart Layer Type — Design Spec

**Date:** 2026-05-26  
**Branch:** `piechart`  
**Reference:** `remotes/origin/feat/add-support-for-pie-charts-and-box-charts`  
**Approach:** Fresh implementation (equal slices, bitmask, clean TypeScript, WebGL 2)

---

## Overview

Add a `pie-chart` layer type to Mapbox GL JS that renders a screen-aligned pie (or donut) chart at each point feature. Up to 24 equal-sized slices are toggled on/off per feature via a bitmask property. Colors and labels are layer-level constants (same for all features). The implementation follows the standard GL JS worker→main-thread pipeline, modelled on the `circle` layer.

---

## Slice Model

**Equal slices with bitmask.** The circle is divided into N equal sectors (N = `pie-chart-colors.length`). Each feature carries an integer bitmask — bit N set means slice N is visible for that feature. This makes the chart a "which categories apply to this feature" visualization, not a proportional-value chart.

- Maximum 24 slices (24-bit bitmask)
- Default 6 slices (matching default colors/labels arrays)
- All slices same angular size (1/N of 360°)

---

## Paint Properties

All properties are `data-driven` (support expressions).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pie-chart-mask` | `number` | — | Integer bitmask: bit N set → slice N visible. Use `["get", "col"]` to read from feature data. The raw integer (e.g. `7` for slices 0,1,2) is stored as-is in the feature property; GL JS's paint system normalises it to `[0,1]` in the vertex attribute, and the vertex shader recovers the integer by multiplying by `16777215` (2²⁴−1). |
| `pie-chart-colors` | `string[]` | `["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#a65628"]` | Per-slice CSS color strings. Constant across all features; passed as uniform `u_colors[24]`. |
| `pie-chart-labels` | `string[]` | `["Slice 1","Slice 2","Slice 3","Slice 4","Slice 5","Slice 6"]` | Per-slice label strings. Metadata only — not rendered; used for feature querying. |
| `pie-chart-size` | `number` (px) | `50` | Outer diameter in pixels. |
| `pie-chart-center-size` | `number` (px) | `0` | Inner hole diameter. `0` = solid pie; `>0` = donut. |
| `pie-chart-stroke-color` | `color` | `"black"` | Color for outer ring and slice divider lines. |
| `pie-chart-stroke-width` | `number` (px) | `2` | Outer border thickness. |
| `pie-chart-divider-width` | `number` (px) | `2` | Divider line thickness between slices. |

**Note:** `pie-chart-colors` is excluded from `ProgramConfigurationSet` — it is not a per-vertex attribute. A named filter constant (`PIE_CHART_COLORS_PROP`) is used in both the bucket constructor and `getProgramConfiguration` to keep this consistent without inline string comparisons.

---

## Architecture

### Pipeline

```
Worker thread                          Main thread
─────────────────────────────────────────────────────────────────
PieChartBucket.populate()
  → addFeature() per point
    → 4 verts (billboard quad)         draw_pie_chart.ts
    → programConfigurations            → pieChartUniformValues()
       .populatePaintArrays()             → u_colors[], u_segment_count
                                          → u_opacity, u_matrix, ...
                                       program.draw()
                                         → pie_chart.vertex.glsl
                                         → pie_chart.fragment.glsl
```

### Files Created

| File | Role |
|------|------|
| `src/data/bucket/pie_chart_attributes.ts` | Vertex layout: `a_pos` (Int16×2). Globe ext: `a_pos_3`, `a_pos_normal_3`. |
| `src/data/bucket/pie_chart_bucket.ts` | Worker bucket. Stores one screen-aligned quad per point. Populates paint arrays for all properties except `pie-chart-colors`. |
| `src/style/style_layer/pie_chart_style_layer.ts` | Layer class. Owns properties, creates bucket, implements `queryRadius` and `queryIntersectsFeature` (circle hit-test). |
| `src/style/style_layer/pie_chart_style_layer_properties.ts` | Hand-written in codegen output format. Defines `LayoutProps` (visibility only) and `PaintProps`. |
| `src/shaders/pie_chart.vertex.glsl` | Positions billboard quad. Decodes mask float → `out float flags[24]`. |
| `src/shaders/pie_chart.fragment.glsl` | Polar sector math, divider/stroke/inner-hole compositing. |
| `src/render/program/pie_chart_program.ts` | Uniform type declarations and `pieChartUniformValues()`. |
| `src/render/draw_pie_chart.ts` | Translucent-pass render loop. One draw call per tile. |
| `debug/pie-chart.html` | Interactive debug page with Tweakpane controls for all paint properties. |
| `test/unit/data/pie_chart_bucket.test.ts` | Unit tests for vertex count, `isEmpty()`, `uploadPending()`. |
| `test/integration/render-tests/pie-chart/basic/` | Render baseline: 3 features, different masks, default colors. |
| `test/integration/render-tests/pie-chart/donut/` | Render baseline: center-size > 0. |
| `test/integration/render-tests/pie-chart/stroke/` | Render baseline: stroke color and width. |

### Files Modified

| File | Change |
|------|--------|
| `src/style-spec/reference/v8.json` | Add `layout_pie-chart`, `paint_pie-chart`, and `pie-chart` to `layer.type.values`. |
| `src/style-spec/types.ts` | Add `PieChartLayerSpecification` and include in `LayerSpecification` union. |
| `src/style/create_style_layer.ts` | Add `pie-chart` → `PieChartStyleLayer` to `subclasses` map. |
| `src/style/style_layer/typed_style_layer.ts` | Add `PieChartStyleLayer` to `CoreStyleLayer` union. |
| `src/render/painter.ts` | Import `drawPieCharts` and add `'pie-chart': drawPieCharts` to `draw` map. |
| `src/shaders/shaders.ts` | Import and export `pieChart` vertex + fragment shader strings. |
| `src/render/program.ts` | Register `pieChart` program with its uniforms. |
| `src/render/program/program_uniforms.ts` | Add `PieChartUniformsType` to program uniforms map. |

---

## Shader Design

### Vertex Shader

- `a_pos` encodes center + extrude in one `Int16×2` pair (same encoding as circle)
- `#pragma mapbox: initialize` reads `size` and `mask` from paint arrays
- Mask float is multiplied by `16777215.0` (2²⁴ − 1) to recover integer, then 24 bits extracted into `out float flags[24]`
- Billboard scaled: `extrude * (size * 0.5) * u_extrude_scale * projected_center.w`
- Globe support: `#ifdef PROJECTION_GLOBE_VIEW` block with `a_pos_3` / `a_pos_normal_3`

### Fragment Shader

```glsl
vec2 p = v_extrude * 0.5;              // [-0.5, 0.5]
float angle = atan(p.y, p.x);
if (angle < 0.0) angle += 2.0 * PI;
int seg = int(angle / (2.0 * PI / u_segment_count));
vec4 color = u_colors[seg] * flags[seg];
```

Four composited layers (applied with `smoothstep` + `fwidth` anti-aliasing):
1. **Divider lines** — blend to `stroke_color` near each sector boundary
2. **Outer stroke** — blend to `stroke_color` from `(0.5 - stroke_width/size)` outward
3. **Outer clip** — `discard` beyond radius 0.5
4. **Inner hole** — when `center_size > 0`, punch hole and apply stroke at inner edge

**WebGL 2 / Metal compliance:**
- `out vec4 glFragColor` declared explicitly (no implicit global)
- `#if defined(A) && defined(B)` for compound conditionals
- `#define MAX_SLICES 24` — no bare magic numbers in comparisons
- `OVERDRAW_INSPECTOR` guard kept

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `pie-chart-mask` returns non-numeric | Expression evaluator falls back to default `0` — all slices hidden, no crash |
| Colors array shorter than active mask bits | Excess `u_colors[i]` slots are `vec4(0)` — transparent, visually absent |
| Point outside tile bounds | Skipped in `addFeature` (`x < 0 || x >= EXTENT || y < 0 || y >= EXTENT`) |
| Empty bucket | `isEmpty()` guard in `draw_pie_chart.ts` skips tile without GPU call |

---

## Testing

### Unit Tests (`test/unit/data/pie_chart_bucket.test.ts`)
- `addFeature` with a single point → 4 vertices, 2 triangles in index array
- `isEmpty()` returns true before any features, false after
- `uploadPending()` returns true before upload, false after

### Render Tests
Each test has a `style.json` with a `_comment`, minimum image size, and must fail without the fix.

| Test path | What it checks |
|-----------|----------------|
| `pie-chart/basic/` | 3 point features, masks 1/3/7, default 6 colors, no donut |
| `pie-chart/donut/` | `center-size: 20` produces visible donut hole |
| `pie-chart/stroke/` | Red stroke color, width 4 — visible outer ring |

### TypeScript / Lint
- `npm run tsc` — no errors, no `@ts-expect-error` suppressions
- `npm run lint` — no warnings
