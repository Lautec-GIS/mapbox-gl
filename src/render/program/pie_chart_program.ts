import {
    Uniform1f,
    Uniform2f,
    Uniform3f,
    Uniform4fv,
    UniformMatrix2f,
    UniformMatrix4f,
} from "../uniform_binding";
import browser from "../../util/browser";
import {mat4} from "gl-matrix";
import {
    globePixelsToTileUnits,
} from "../../geo/projection/globe_util";

import type {mat2} from "gl-matrix";
import type {OverscaledTileID} from "../../source/tile_id";
import type Context from "../../gl/context";
import type {UniformValues} from "../uniform_binding";
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
    ['u_segment_count']: Uniform1f
};

export type PieChartDefinesType =
    | "PITCH_WITH_MAP"
    | "SCALE_WITH_MAP"
    | "PROJECTION_GLOBE_VIEW";

function parseColor(color: string | object): {r: number, g: number, b: number, a: number} {
    if (typeof color === "object") {
        return color as {r: number, g: number, b: number, a: number};
    }

    // Handle hex colors (#RGB, #RRGGBB, #RRGGBBAA)
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            // #RGB -> #RRGGBB
            return {
                r: parseInt(hex[0] + hex[0], 16) / 255,
                g: parseInt(hex[1] + hex[1], 16) / 255,
                b: parseInt(hex[2] + hex[2], 16) / 255,
                a: 1.0
            };
        } else if (hex.length === 6) {
            // #RRGGBB
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255,
                a: 1.0
            };
        } else if (hex.length === 8) {
            // #RRGGBBAA
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255,
                a: parseInt(hex.slice(6, 8), 16) / 255
            };
        }
    }

    // Handle rgb() and rgba()
    const rgbMatch =  color.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
        const values = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
        return {
            r: values[0] / 255,
            g: values[1] / 255,
            b: values[2] / 255,
            a: values[3] !== undefined ? values[3] : 1.0
        };
    }

    // Handle named colors
    const namedColors: Record<string, {r: number, g: number, b: number, a: number}> = {
        'black': {r: 0, g: 0, b: 0, a: 1},
        'white': {r: 1, g: 1, b: 1, a: 1},
        'red': {r: 1, g: 0, b: 0, a: 1},
        'green': {r: 0, g: 0.5, b: 0, a: 1},
        'blue': {r: 0, g: 0, b: 1, a: 1},
        'yellow': {r: 1, g: 1, b: 0, a: 1},
        'cyan': {r: 0, g: 1, b: 1, a: 1},
        'magenta': {r: 1, g: 0, b: 1, a: 1},
        'orange': {r: 1, g: 0.647, b: 0, a: 1},
        'purple': {r: 0.5, g: 0, b: 0.5, a: 1},
        'pink': {r: 1, g: 0.753, b: 0.796, a: 1},
        'brown': {r: 0.647, g: 0.165, b: 0.165, a: 1},
        'gray': {r: 0.5, g: 0.5, b: 0.5, a: 1},
        'grey': {r: 0.5, g: 0.5, b: 0.5, a: 1},
        'transparent': {r: 0, g: 0, b: 0, a: 0},
    };

    const normalizedColor = color.toLowerCase().trim();
    if (namedColors[normalizedColor]) {
        return namedColors[normalizedColor];
    }

    // Fallback to black if parsing fails
    console.warn(`Could not parse color: ${color}, using black as fallback`);
    return {r: 0, g: 0, b: 0, a: 1};
}

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
    'u_segment_count': new Uniform1f(context)
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

    const colors = layer.paint.get("pie-chart-colors");

    const pieColors = colors.value.kind === "constant" ?
        colors.value.value
            .map(color => parseColor(color as never))
            .map(({r, g, b, a}) => [r, g, b, a])
            .flat() :
        [];

    const values = {
        'u_camera_to_center_distance': transform.cameraToCenterDistance,
        'u_matrix': coord.projMatrix,
        'u_device_pixel_ratio': browser.devicePixelRatio,
        'u_extrude_scale': extrudeScale,
        'u_inv_rot_matrix': identityMatrix,
        'u_merc_center': [0, 0],
        'u_tile_id': [0, 0, 0],
        'u_zoom_transition': 0,
        'u_up_dir': [0, 0, 0],
        'u_colors': pieColors,
        'u_segment_count': colors.value.kind === "constant" ? colors.value.value.length : 0
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return values;
};

const pieChartDefinesValues = (
    layer: PieChartStyleLayer
): PieChartDefinesType[] => {
    const values: PieChartDefinesType[] = [];
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

export {pieChartUniforms, pieChartUniformValues, pieChartDefinesValues};
