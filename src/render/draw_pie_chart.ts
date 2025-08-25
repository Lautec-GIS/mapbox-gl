import StencilMode from "../gl/stencil_mode";
import DepthMode from "../gl/depth_mode";
import CullFaceMode from "../gl/cull_face_mode";
import ColorMode from '../gl/color_mode';
import Color from '../style-spec/util/color';
import {pieChartUniformValues, pieChartDefinesValues} from "./program/pie_chart_program";

import type Program from "./program";
import type SegmentVector from "../data/segment";
import type {OverscaledTileID} from "../source/tile_id";
import type Painter from "./painter";
import type SourceCache from "../source/source_cache";
import type PieChartStyleLayer from "../style/style_layer/pie_chart_style_layer";
import type PieChartBucket from "../data/bucket/pie_chart_bucket";
import type ProgramConfiguration from "../data/program_configuration";
import type VertexBuffer from "../gl/vertex_buffer";
import type IndexBuffer from "../gl/index_buffer";
import type {UniformValues} from "./uniform_binding";
import type {PieChartUniformsType} from "./program/pie_chart_program";
import type Tile from "../source/tile";

export default drawPieCharts;

type TileRenderState = {
    programConfiguration: ProgramConfiguration,
    program: Program<PieChartUniformsType>,
    layoutVertexBuffer: VertexBuffer,
    globeExtVertexBuffer?: VertexBuffer | null,
    indexBuffer: IndexBuffer,
    uniformValues: UniformValues<PieChartUniformsType>,
    tile: Tile,
};

type SegmentsTileRenderState = {
    segments: SegmentVector,
    sortKey: number,
    state: TileRenderState,
};

function drawPieCharts(
    painter: Painter,
    sourceCache: SourceCache,
    layer: PieChartStyleLayer,
    coords: Array<OverscaledTileID>
) {
    if (painter.renderPass !== "translucent") return;

    const context = painter.context;
    const gl = context.gl;
    const tr = painter.transform;

    const depthMode = painter.depthModeForSublayer(0, DepthMode.ReadOnly);
    const stencilMode = StencilMode.disabled;

    const numOverdrawSteps = 8;
    const a = 1 / numOverdrawSteps;

    const colorMode = new ColorMode(
        [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
        new Color(a, a, a, 1),
        [true, true, true, true]
    );
    const isGlobeProjection = tr.projection.name === "globe";

    const segmentsRenderStates: Array<SegmentsTileRenderState> = [];

    for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];

        const tile = sourceCache.getTile(coord);

        const bucket = (tile.getBucket(layer) as PieChartBucket);
        if (!bucket || bucket.projection.name !== tr.projection.name) continue;

        const programConfiguration = bucket.programConfigurations.get(layer.id);
        const definesValues = pieChartDefinesValues(layer);
        if (isGlobeProjection) {
            definesValues.push("PROJECTION_GLOBE_VIEW");
        }
        const program = painter.getOrCreateProgram(
            "pieChart",
            {
                config: programConfiguration,
                defines: definesValues,
            }

        );
        const layoutVertexBuffer = bucket.layoutVertexBuffer;
        const globeExtVertexBuffer = bucket.globeExtVertexBuffer;
        const indexBuffer = bucket.indexBuffer;
        const uniformValues = pieChartUniformValues(
            painter,
            coord,
            tile,
            layer
        );

        const state: TileRenderState = {
            programConfiguration,
            program,
            layoutVertexBuffer,
            globeExtVertexBuffer,
            indexBuffer,
            uniformValues,
            tile,
        };

        segmentsRenderStates.push({
            segments: bucket.segments,
            sortKey: 0,
            state,
        });
    }

    const terrainOptions = {useDepthForOcclusion: !isGlobeProjection};

    for (const segmentsState of segmentsRenderStates) {
        const {
            programConfiguration,
            program,
            layoutVertexBuffer,
            globeExtVertexBuffer,
            indexBuffer,
            uniformValues,
            tile,
        } = segmentsState.state;
        const segments = segmentsState.segments;

        if (painter.terrain) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            painter.terrain.setupElevationDraw(tile, program, terrainOptions);
        }

        painter.uploadCommonUniforms(context, program, tile.tileID.toUnwrapped());

        program.draw(
            painter,
            gl.POINTS,
            depthMode,
            stencilMode,
            colorMode,
            CullFaceMode.disabled,
            uniformValues,
            layer.id,
            layoutVertexBuffer,
            indexBuffer,
            segments,
            layer.paint,
            tr.zoom,
            programConfiguration,
            [globeExtVertexBuffer]
        );
    }
}
