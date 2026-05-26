import {Uniform1f, Uniform1i, Uniform4f, Uniform4fv, UniformMatrix2f, UniformMatrix4f} from '../uniform_binding';
import Color from '../../style-spec/util/color';

import type Context from '../../gl/context';
import type {UniformValues} from '../uniform_binding';
import type {OverscaledTileID} from '../../source/tile_id';
import type Tile from '../../source/tile';
import type PieChartStyleLayer from '../../style/style_layer/pie_chart_style_layer';
import type Painter from '../painter';

const MAX_SLICES = 24;

export type PieChartUniformsType = {
    ['u_matrix']: UniformMatrix4f;
    ['u_extrude_scale']: UniformMatrix2f;
    ['u_camera_to_center_distance']: Uniform1f;
    ['u_colors']: Uniform4fv;
    ['u_segment_count']: Uniform1i;
    ['u_stroke_width_frac']: Uniform1f;
    ['u_divider_width_frac']: Uniform1f;
    ['u_center_size_frac']: Uniform1f;
    ['u_stroke_color']: Uniform4f;
};

export const pieChartUniforms = (context: Context): PieChartUniformsType => ({
    'u_matrix': new UniformMatrix4f(context),
    'u_extrude_scale': new UniformMatrix2f(context),
    'u_camera_to_center_distance': new Uniform1f(context),
    'u_colors': new Uniform4fv(context, MAX_SLICES),
    'u_segment_count': new Uniform1i(context),
    'u_stroke_width_frac': new Uniform1f(context),
    'u_divider_width_frac': new Uniform1f(context),
    'u_center_size_frac': new Uniform1f(context),
    'u_stroke_color': new Uniform4f(context),
});

export const pieChartUniformValues = (
    painter: Painter,
    coord: OverscaledTileID,
    tile: Tile,
    layer: PieChartStyleLayer,
): UniformValues<PieChartUniformsType> => {
    const transform = painter.transform;

    const extrudeScale = new Float32Array([
        transform.pixelsToGLUnits[0], 0,
        0, transform.pixelsToGLUnits[1]
    ]);

    const colorsRaw = layer.paint.get('pie-chart-colors') as unknown as string[];
    const colorData = new Float32Array(MAX_SLICES * 4);
    for (let i = 0; i < Math.min(colorsRaw.length, MAX_SLICES); i++) {
        const c = Color.parse(colorsRaw[i]);
        if (c) {
            colorData[i * 4]     = c.r;
            colorData[i * 4 + 1] = c.g;
            colorData[i * 4 + 2] = c.b;
            colorData[i * 4 + 3] = c.a;
        }
    }

    const segmentCount = Math.min(colorsRaw.length, MAX_SLICES);
    const size = layer.paint.get('pie-chart-size').constantOr(50);
    const halfSize = size * 0.5;
    const strokeWidth = layer.paint.get('pie-chart-stroke-width');
    const dividerWidth = layer.paint.get('pie-chart-divider-width');
    const centerSize = layer.paint.get('pie-chart-center-size');
    const strokeColorRaw = layer.paint.get('pie-chart-stroke-color');
    const sc = strokeColorRaw.toPremultipliedRenderColor(null);

    return {
        'u_matrix': painter.translatePosMatrix(coord.projMatrix, tile, [0, 0], 'viewport') as Float32Array,
        'u_extrude_scale': extrudeScale,
        'u_camera_to_center_distance': transform.getCameraToCenterDistance(transform.projection),
        'u_colors': colorData,
        'u_segment_count': segmentCount,
        'u_stroke_width_frac': halfSize > 0 ? strokeWidth / halfSize : 0,
        'u_divider_width_frac': halfSize > 0 ? dividerWidth / halfSize : 0,
        'u_center_size_frac': halfSize > 0 ? (centerSize * 0.5) / halfSize : 0,
        'u_stroke_color': [sc.r, sc.g, sc.b, sc.a],
    };
};
