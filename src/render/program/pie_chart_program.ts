import {Uniform1f, Uniform2f, Uniform3f, Uniform4fv, UniformMatrix2f, UniformMatrix4f,} from "../uniform_binding";
import browser from "../../util/browser";
import {mat4} from "gl-matrix";
import {globePixelsToTileUnits,} from "../../geo/projection/globe_util";
import Color from "../../style-spec/util/color";

import type {UniformValues} from "../uniform_binding";
import type {OverscaledTileID} from "../../source/tile_id";
import type Context from "../../gl/context";
import type Tile from "../../source/tile";
import type Painter from "../painter";
import type PieChartStyleLayer from "../../style/style_layer/pie_chart_style_layer";

export type PieChartUniformsType = {
    ['u_camera_to_center_distance']: Uniform1f,
    ['u_extrude_scale']: UniformMatrix2f,
    ['u_device_pixel_ratio']: Uniform1f,
    ['u_matrix']: UniformMatrix4f,
    ['u_inv_rot_matrix']: UniformMatrix4f,
    ['u_merc_center']: Uniform2f,
    ['u_tile_id']: Uniform3f,
    ['u_zoom_transition']: Uniform1f,
    ['u_up_dir']: Uniform3f,
    ['u_colors']: Uniform4fv,
    ['u_segment_count']: Uniform1f,
    ['u_opacity']: Uniform1f
};

const pieChartUniforms = (context: Context): PieChartUniformsType => ({
    'u_camera_to_center_distance': new Uniform1f(context),
    'u_extrude_scale': new UniformMatrix2f(context),
    'u_device_pixel_ratio': new Uniform1f(context),
    'u_matrix': new UniformMatrix4f(context),
    'u_inv_rot_matrix': new UniformMatrix4f(context),
    'u_merc_center': new Uniform2f(context),
    'u_tile_id': new Uniform3f(context),
    'u_zoom_transition': new Uniform1f(context),
    'u_up_dir': new Uniform3f(context),
    'u_colors': new Uniform4fv(context),
    'u_segment_count': new Uniform1f(context),
    'u_opacity': new Uniform1f(context)
});

const identityMatrix = mat4.create();

const pieChartUniformValues = (
    painter: Painter,
    coord: OverscaledTileID,
    tile: Tile,
    layer: PieChartStyleLayer,
): UniformValues<PieChartUniformsType> => {
    const transform = painter.transform;
    const isGlobe = transform.projection.name === "globe";

    // Pie charts are always viewport-aligned
    let extrudeScale: Float32Array;
    if (isGlobe) {
        const s =
            globePixelsToTileUnits(transform.zoom, coord.canonical) *
            transform._pixelsPerMercatorPixel;
        extrudeScale = Float32Array.from([s, 0, 0, s]);
    } else {
        extrudeScale = new Float32Array([
            transform.pixelsToGLUnits[0],
            0,
            0,
            transform.pixelsToGLUnits[1],
        ]);
    }

    const colors = layer.paint.get("pie-chart-colors");
    const defaultColor = new Color(0, 0, 0, 1);
    const constantColors: unknown = colors.constantOr(null);
    const isConstantArray = Array.isArray(constantColors);
    const pieColors: Array<number> = isConstantArray ?
        (constantColors as Array<string>)
            .map((color: string) => Color.parse(color) || defaultColor)
            .map(({r, g, b, a}) => [r, g, b, a])
            .flat() :
        [];
    return {
        'u_camera_to_center_distance': transform.cameraToCenterDistance,
        'u_matrix': coord.projMatrix as Float32Array,
        'u_device_pixel_ratio': browser.devicePixelRatio,
        'u_extrude_scale': extrudeScale,
        'u_inv_rot_matrix': identityMatrix as Float32Array,
        'u_merc_center': [0, 0] as [number, number],
        'u_tile_id': [0, 0, 0] as [number, number, number],
        'u_zoom_transition': 0,
        'u_up_dir': [0, 0, 0] as [number, number, number],
        'u_colors': pieColors,
        'u_segment_count': isConstantArray ? (constantColors as Array<string>).length : 0,
        'u_opacity': layer.paint.get('pie-chart-opacity').constantOr(1.0)
    };
};

export {pieChartUniforms, pieChartUniformValues};
