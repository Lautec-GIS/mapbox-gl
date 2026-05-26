import StencilMode from '../gl/stencil_mode';
import DepthMode from '../gl/depth_mode';
import CullFaceMode from '../gl/cull_face_mode';
import {pieChartUniformValues} from './program/pie_chart_program';

import type {OverscaledTileID} from '../source/tile_id';
import type Painter from './painter';
import type SourceCache from '../source/source_cache';
import type PieChartStyleLayer from '../style/style_layer/pie_chart_style_layer';
import type PieChartBucket from '../data/bucket/pie_chart_bucket';
import type {DynamicDefinesType} from './program/program_uniforms';

export default function drawPieCharts(
    painter: Painter,
    sourceCache: SourceCache,
    layer: PieChartStyleLayer,
    coords: Array<OverscaledTileID>
) {
    if (painter.renderPass !== 'translucent') return;

    const context = painter.context;
    const gl = context.gl;
    const tr = painter.transform;

    const depthMode = painter.depthModeForSublayer(0, DepthMode.ReadOnly);
    const stencilMode = StencilMode.disabled;
    const colorMode = painter.colorModeForRenderPass();
    const isGlobeProjection = tr.projection.name === 'globe';

    for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        const tile = sourceCache.getTile(coord);
        const bucket = tile.getBucket(layer) as PieChartBucket;
        if (!bucket || bucket.isEmpty()) continue;
        if (bucket.projection.name !== tr.projection.name) continue;

        const programConfiguration = bucket.programConfigurations.get(layer.id);
        const layoutVertexBuffer = bucket.layoutVertexBuffer;
        const globeExtVertexBuffer = bucket.globeExtVertexBuffer;
        const indexBuffer = bucket.indexBuffer;
        const segments = bucket.segments;

        const definesValues: DynamicDefinesType[] = [];
        if (isGlobeProjection) definesValues.push('PROJECTION_GLOBE_VIEW');

        const affectedByFog = painter.isTileAffectedByFog(coord);
        const program = painter.getOrCreateProgram('pieChart', {config: programConfiguration, defines: definesValues, overrideFog: affectedByFog});
        const uniformValues = pieChartUniformValues(painter, coord, tile, layer);

        const dynamicBuffers = [globeExtVertexBuffer];

        painter.uploadCommonUniforms(context, program, tile.tileID.toUnwrapped());

        program.draw(
            painter, gl.TRIANGLES, depthMode, stencilMode, colorMode,
            CullFaceMode.disabled, uniformValues, layer.id,
            layoutVertexBuffer, indexBuffer, segments,
            layer.paint, tr.zoom, programConfiguration, dynamicBuffers
        );
    }
}
