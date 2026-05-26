// Stub — fully implemented in Task 7.
import {Uniform1f, Uniform1i, Uniform4f, UniformMatrix2f, UniformMatrix4f} from '../uniform_binding';

import type Context from '../../gl/context';
import type {UniformValues} from '../uniform_binding';
import type {OverscaledTileID} from '../../source/tile_id';
import type Tile from '../../source/tile';
import type PieChartStyleLayer from '../../style/style_layer/pie_chart_style_layer';
import type Painter from '../painter';

export type PieChartUniformsType = {
    ['u_matrix']: UniformMatrix4f;
    ['u_extrude_scale']: UniformMatrix2f;
    ['u_camera_to_center_distance']: Uniform1f;
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
    'u_segment_count': new Uniform1i(context),
    'u_stroke_width_frac': new Uniform1f(context),
    'u_divider_width_frac': new Uniform1f(context),
    'u_center_size_frac': new Uniform1f(context),
    'u_stroke_color': new Uniform4f(context),
});

export const pieChartUniformValues = (
    _painter: Painter,
    _coord: OverscaledTileID,
    _tile: Tile,
    _layer: PieChartStyleLayer,
): UniformValues<PieChartUniformsType> => {
    return {
        'u_matrix': new Float32Array(16) as any,
        'u_extrude_scale': new Float32Array(4) as any,
        'u_camera_to_center_distance': 0,
        'u_segment_count': 6,
        'u_stroke_width_frac': 0,
        'u_divider_width_frac': 0,
        'u_center_size_frac': 0,
        'u_stroke_color': [0, 0, 0, 1],
    };
};
