import StyleLayer from "../style_layer";
import PieChartBucket from "../../data/bucket/pie_chart_bucket";
import {polygonIntersectsBufferedPoint} from "../../util/intersection_tests";
import {
    getMaximumPaintValue,
    tilespaceTranslate,
} from "../query_utils";
import {getLayoutProperties, getPaintProperties} from "./pie_chart_style_layer_properties";
import {vec4, vec3} from "gl-matrix";
import Point from "@mapbox/point-geometry";
import ProgramConfiguration from "../../data/program_configuration";

import type {
    Transitionable,
    Transitioning,
    Layout,
    PossiblyEvaluated, ConfigOptions,
} from "../properties";
import type {FeatureState} from "../../style-spec/expression/index";
import type {BucketParameters, Bucket} from "../../data/bucket";
import type {LayoutProps, PaintProps} from "./pie_chart_style_layer_properties";
import type Transform from "../../geo/transform";
import type {LayerSpecification} from "../../style-spec/types";
import type {TilespaceQueryGeometry} from "../query_geometry";
import type {VectorTileFeature} from "@mapbox/vector-tile";
import type {DEMSampler} from "../../terrain/elevation";
import type {Ray} from "../../util/primitives";
import type {LUT} from "../../util/lut";
import type {ProgramName} from "../../render/program";

class PieChartStyleLayer extends StyleLayer {
    override _unevaluatedLayout: Layout<LayoutProps>;
    override layout: PossiblyEvaluated<LayoutProps>;
    override type: "pie-chart";
    override _transitionablePaint: Transitionable<PaintProps>;
    override _transitioningPaint: Transitioning<PaintProps>;
    override paint: PossiblyEvaluated<PaintProps>;

    constructor(layer: LayerSpecification, scope: string, lut: LUT | null, options?: ConfigOptions | null) {
        const properties = {
            layout: getLayoutProperties(),
            paint: getPaintProperties()
        };
        super(layer, properties, scope, lut, options);
    }

    override getProgramIds(): ProgramName[] | null {
        return ["pieChart"];
    }

    getProgramConfiguration(zoom: number): ProgramConfiguration {
        return new ProgramConfiguration(this, {zoom, lut: this.lut});
    }

    createBucket(parameters: BucketParameters<PieChartStyleLayer>): PieChartBucket<PieChartStyleLayer> {
        return new PieChartBucket(parameters);
    }

    override queryRadius(bucket: Bucket): number {
        const pieChartBucket: PieChartBucket<PieChartStyleLayer> = bucket as PieChartBucket<PieChartStyleLayer>;
        return getMaximumPaintValue('pie-chart-size', this, pieChartBucket) / 2;
    }

    override queryIntersectsFeature(
        queryGeometry: TilespaceQueryGeometry,
        feature: VectorTileFeature,
        featureState: FeatureState,
        geometry: Array<Array<Point>>,
        zoom: number,
        transform: Transform,
        pixelPosMatrix: Float32Array,
        elevationHelper: DEMSampler | null
    ): boolean {
        const translation = tilespaceTranslate(
            [0, 0],
            'viewport',
            transform.angle,
            queryGeometry.pixelToTileUnitsFactor
        );

        const size = this.paint.get('pie-chart-size').evaluate(feature, featureState);

        return queryIntersectsCircle(
            queryGeometry,
            geometry,
            transform,
            pixelPosMatrix,
            elevationHelper,
            translation,
            size
        );
    }

    override isTileClipped(): boolean {
        return true;
    }
}

function queryIntersectsCircle(
    queryGeometry: TilespaceQueryGeometry,
    geometry: Array<Array<Point>>,
    transform: Transform,
    pixelPosMatrix: Float32Array,
    elevationHelper: DEMSampler | null,
    translation: Point,
    size: number
): boolean {
    const tileId = queryGeometry.tileID.canonical;
    const elevationScale = transform.projection.upVectorScale(tileId, transform.center.lat, transform.worldSize).metersToTile;

    for (const ring of geometry) {
        for (const point of ring) {
            const translatedPoint = point.add(translation);
            const z = (elevationHelper && transform.elevation) ?
                transform.elevation.exaggeration() * elevationHelper.getElevationAt(translatedPoint.x, translatedPoint.y, true) :
                0;

            // Reproject tile coordinate to the local coordinate space used by the projection
            const reproj = transform.projection.projectTilePoint(translatedPoint.x, translatedPoint.y, tileId);

            if (z > 0) {
                const dir = transform.projection.upVector(tileId, translatedPoint.x, translatedPoint.y);
                reproj.x += dir[0] * elevationScale * z;
                reproj.y += dir[1] * elevationScale * z;
                reproj.z += dir[2] * elevationScale * z;
            }

            const transformedPoint = projectPoint(reproj.x, reproj.y, reproj.z, pixelPosMatrix);
            const transformedPolygon = queryGeometry.queryGeometry.screenGeometry;

            if (polygonIntersectsBufferedPoint(transformedPolygon, transformedPoint, size)) return true;
        }
    }

    return false;
}

function projectPoint(x: number, y: number, z: number, pixelPosMatrix: Float32Array): Point {
    const point = vec4.transformMat4(new Float32Array(), [x, y, z, 1], pixelPosMatrix);
    return new Point(point[0] / point[3], point[1] / point[3]);
}

const origin = vec3.fromValues(0, 0, 0);
const up = vec3.fromValues(0, 0, 1);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function intersectAtHeight(r: Ray, z: number): Point {
    const intersectionPt = vec3.create();
    origin[2] = z;
    const intersects = r.intersectsPlane(origin, up, intersectionPt);
    console.assert(intersects, 'tilespacePoint should always be below horizon, and since camera cannot have pitch >90, ray should always intersect');

    return new Point(intersectionPt[0], intersectionPt[1]);
}

export default PieChartStyleLayer;
