import {
    Uniform1f,
    Uniform2f,
    Uniform3f,
    Uniform4fv,
    UniformMatrix2f,
    UniformMatrix4f,
} from "../uniform_binding";
import browser from "../../util/browser";
import {type mat2, mat4} from "gl-matrix";
import {
    globePixelsToTileUnits,
} from "../../geo/projection/globe_util";

import type {OverscaledTileID} from "../../source/tile_id";
import type Context from "../../gl/context";
import type {UniformValues} from "../uniform_binding";
import type Tile from "../../source/tile";
import type BoxChartStyleLayer from "../../style/style_layer/box_chart_style_layer";
import type Painter from "../painter";

export type BoxChartUniformsType = {
    ['u_camera_to_center_distance']: Uniform1f;
    ['u_extrude_scale']: UniformMatrix2f;
    ['u_device_pixel_ratio']: Uniform1f;
    ['u_matrix']: UniformMatrix4f;
    ['u_inv_rot_matrix']: UniformMatrix4f;
    ['u_merc_center']: Uniform2f;
    ['u_tile_id']: Uniform3f;
    ['u_zoom_transition']: Uniform1f;
    ['u_up_dir']: Uniform3f;
    ['colors']: Uniform4fv;
};

export type BoxChartDefinesType =
    | "PITCH_WITH_MAP"
    | "SCALE_WITH_MAP"
    | "PROJECTION_GLOBE_VIEW";

const boxChartUniforms = (context: Context): BoxChartUniformsType => ({
    'u_camera_to_center_distance': new Uniform1f(context),
    'u_extrude_scale': new UniformMatrix2f(context),
    'u_device_pixel_ratio': new Uniform1f(context),
    'u_matrix': new UniformMatrix4f(context),
    'u_inv_rot_matrix': new UniformMatrix4f(context),
    'u_merc_center': new Uniform2f(context),
    'u_tile_id': new Uniform3f(context),
    'u_zoom_transition': new Uniform1f(context),
    'u_up_dir': new Uniform3f(context),
    'colors': new Uniform4fv(context)
});

const identityMatrix = mat4.create();

const boxChartUniformValues = (
    painter: Painter,
    coord: OverscaledTileID,
    tile: Tile,
    invMatrix: Float32Array,
    mercatorCenter: [number, number],
    layer: BoxChartStyleLayer
): UniformValues<BoxChartUniformsType> => {
    const transform = painter.transform;
    const isGlobe = transform.projection.name === "globe";

    let extrudeScale: mat2;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (layer.paint.get("circle-pitch-alignment") === "map") {
        if (isGlobe) {
            const s =
                globePixelsToTileUnits(transform.zoom, coord.canonical) *
                transform._pixelsPerMercatorPixel;
            extrudeScale = Float32Array.from([s, 0, 0, s]);
        } else {
            extrudeScale = transform.calculatePixelsToTileUnitsMatrix(tile);
        }
    } else {
        extrudeScale = new Float32Array([
            transform.pixelsToGLUnits[0],
            0,
            0,
            transform.pixelsToGLUnits[1],
        ]);
    }

    const colors = layer.paint.get("box-chart-colors");

    const boxColors = colors.value.kind === "constant" ? colors.value.value.map(({r, g, b, a}) => [r, g, b, a]).flat() : new Float32Array(0);

    const values = {
        'u_camera_to_center_distance': transform.cameraToCenterDistance,
        'u_matrix': coord.projMatrix,
        'u_device_pixel_ratio': browser.devicePixelRatio,
        'u_extrude_scale': extrudeScale,
        'u_inv_rot_matrix': identityMatrix,
        'u_merc_center': [0, 0] as [number, number],
        'u_tile_id': [0, 0, 0] as [number, number, number],
        'u_zoom_transition': 0,
        'u_up_dir': [0, 0, 0] as [number, number, number],
        'colors': boxColors
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return values;
};

const boxChartDefinesValues = (
    layer: BoxChartStyleLayer
): BoxChartDefinesType[] => {
    const values: BoxChartDefinesType[] = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (layer.paint.get("circle-pitch-alignment") === "map")
        values.push("PITCH_WITH_MAP");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (layer.paint.get("circle-pitch-scale") === "map")
        values.push("SCALE_WITH_MAP");

    return values;
};

export {boxChartUniforms, boxChartUniformValues, boxChartDefinesValues};
