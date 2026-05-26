// Stub — fully implemented below. This class is registered with the worker transfer system.
import {CircleLayoutArray, CircleGlobeExtArray} from '../array_types';
import {pieChartAttributes, pieChartGlobeAttributesExt} from './pie_chart_attributes';
import SegmentVector from '../segment';
import {ProgramConfigurationSet} from '../program_configuration';
import {TriangleIndexArray} from '../index_array_type';
import loadGeometry from '../load_geometry';
import toEvaluationFeature from '../evaluation_feature';
import EXTENT from '../../style-spec/data/extent';
import {register} from '../../util/web_worker_transfer';
import EvaluationParameters from '../../style/evaluation_parameters';

import type Point from '@mapbox/point-geometry';
import type {CanonicalTileID, UnwrappedTileID} from '../../source/tile_id';
import type {
    Bucket,
    BucketParameters,
    BucketFeature,
    IndexedFeature,
    PopulateParameters
} from '../bucket';
import type PieChartStyleLayer from '../../style/style_layer/pie_chart_style_layer';
import type Context from '../../gl/context';
import type IndexBuffer from '../../gl/index_buffer';
import type VertexBuffer from '../../gl/vertex_buffer';
import type {FeatureStates} from '../../source/source_state';
import type {SpritePositions} from '../../util/image';
import type {TypedStyleLayer} from '../../style/style_layer/typed_style_layer';
import type {TileTransform} from '../../geo/projection/tile_transform';
import type {ProjectionSpecification} from '../../style-spec/types';
import type Projection from '../../geo/projection/projection';
import type {vec3} from 'gl-matrix';
import type {VectorTileLayer} from '@mapbox/vector-tile';
import type {TileFootprint} from '../../../3d-style/util/conflation';
import type {ImageId} from '../../style-spec/expression/types/image_id';
import type {GlobalProperties} from '../../style-spec/expression';

export const PIE_CHART_COLORS_PROP = 'pie-chart-colors' as const;

const filterPaintProps = (property: string): boolean =>
    property !== PIE_CHART_COLORS_PROP && property !== 'pie-chart-labels';

class PieChartBucket implements Bucket {
    index: number;
    zoom: number;
    overscaling: number;
    layerIds: Array<string>;
    layers: Array<PieChartStyleLayer>;
    stateDependentLayers: Array<PieChartStyleLayer>;
    stateDependentLayerIds: Array<string>;

    layoutVertexArray: CircleLayoutArray;
    layoutVertexBuffer: VertexBuffer;
    globeExtVertexArray: CircleGlobeExtArray | null | undefined;
    globeExtVertexBuffer: VertexBuffer | null | undefined;

    indexArray: TriangleIndexArray;
    indexBuffer: IndexBuffer;

    hasPattern: boolean;
    programConfigurations: ProgramConfigurationSet<PieChartStyleLayer>;
    segments: SegmentVector;
    uploaded: boolean;
    projection: ProjectionSpecification;

    worldview: string | undefined;
    hasAppearances: boolean | null;

    constructor(options: BucketParameters<PieChartStyleLayer>) {
        this.zoom = options.zoom;
        this.overscaling = options.overscaling;
        this.layers = options.layers;
        this.layerIds = this.layers.map(layer => layer.fqid);
        this.index = options.index;
        this.hasPattern = false;
        this.projection = options.projection;

        this.layoutVertexArray = new CircleLayoutArray();
        this.indexArray = new TriangleIndexArray();
        this.segments = new SegmentVector();
        this.programConfigurations = new ProgramConfigurationSet(
            options.layers,
            {zoom: options.zoom, lut: options.lut},
            filterPaintProps
        );
        this.stateDependentLayerIds = this.layers.filter(l => l.isStateDependent()).map(l => l.id);
        this.worldview = options.worldview;
        this.hasAppearances = null;
    }

    updateFootprints(_id: UnwrappedTileID, _footprints: Array<TileFootprint>) {}

    updateAppearances(_canonical?: CanonicalTileID, _featureState?: FeatureStates, _availableImages?: Array<ImageId>, _globalProperties?: GlobalProperties) {
        return {hasLayoutChanges: false, hasUboChanges: false};
    }

    populate(features: Array<IndexedFeature>, options: PopulateParameters, canonical: CanonicalTileID, tileTransform: TileTransform) {
        let globeProjection: Projection | null = null;
        if (tileTransform.projection.name === 'globe') {
            this.globeExtVertexArray = new CircleGlobeExtArray();
            globeProjection = tileTransform.projection;
        }

        for (const {feature, id, index, sourceLayerIndex} of features) {
            const needGeometry = this.layers[0]._featureFilter.needGeometry;
            const evaluationFeature = toEvaluationFeature(feature, needGeometry);
            if (!this.layers[0]._featureFilter.filter(
                new EvaluationParameters(this.zoom, {worldview: this.worldview, activeFloors: options.activeFloors}),
                evaluationFeature, canonical
            )) continue;

            const bucketFeature: BucketFeature = {
                id,
                properties: feature.properties,
                type: feature.type,
                sourceLayerIndex,
                index,
                geometry: needGeometry ? evaluationFeature.geometry : loadGeometry(feature, canonical, tileTransform),
                patterns: {},
                sortKey: undefined
            };

            this.addFeature(bucketFeature, bucketFeature.geometry, index, options.availableImages, canonical, globeProjection, options.brightness, []);
            options.featureIndex.insert(feature, bucketFeature.geometry, index, sourceLayerIndex, this.index);
        }
    }

    update(states: FeatureStates, vtLayer: VectorTileLayer, availableImages: ImageId[], imagePositions: SpritePositions, layers: ReadonlyArray<TypedStyleLayer>, isBrightnessChanged: boolean, brightness?: number | null) {
        this.programConfigurations.updatePaintArrays(states, vtLayer, layers, availableImages, imagePositions, isBrightnessChanged, brightness, this.worldview);
    }

    updateExpressions(layers: ReadonlyArray<TypedStyleLayer>) {
        this.programConfigurations.updateExpressions(layers);
    }

    isEmpty(): boolean {
        return this.layoutVertexArray.length === 0;
    }

    uploadPending(): boolean {
        return !this.uploaded || this.programConfigurations.needsUpload;
    }

    upload(context: Context) {
        if (!this.uploaded) {
            this.layoutVertexBuffer = context.createVertexBuffer(this.layoutVertexArray, pieChartAttributes.members);
            this.indexBuffer = context.createIndexBuffer(this.indexArray);
            if (this.globeExtVertexArray) {
                this.globeExtVertexBuffer = context.createVertexBuffer(this.globeExtVertexArray, pieChartGlobeAttributesExt.members);
            }
        }
        this.programConfigurations.upload(context);
        this.uploaded = true;
    }

    destroy() {
        if (!this.layoutVertexBuffer) return;
        this.layoutVertexBuffer.destroy();
        this.indexBuffer.destroy();
        this.programConfigurations.destroy();
        this.segments.destroy();
        if (this.globeExtVertexBuffer) this.globeExtVertexBuffer.destroy();
    }

    addFeature(feature: BucketFeature, geometry: Array<Array<Point>>, index: number, availableImages: ImageId[], canonical: CanonicalTileID, projection?: Projection | null, brightness?: number | null, _elevationFeatures?: any[]) {
        for (const ring of geometry) {
            for (const point of ring) {
                const x = point.x;
                const y = point.y;
                if (x < 0 || x >= EXTENT || y < 0 || y >= EXTENT) continue;

                if (projection) {
                    const projectedPoint = projection.projectTilePoint(x, y, canonical);
                    const normal = projection.upVector(canonical, x, y);
                    this.addGlobeExtVertex(projectedPoint, normal);
                    this.addGlobeExtVertex(projectedPoint, normal);
                    this.addGlobeExtVertex(projectedPoint, normal);
                    this.addGlobeExtVertex(projectedPoint, normal);
                }

                const segment = this.segments.prepareSegment(4, this.layoutVertexArray, this.indexArray, feature.sortKey);
                const idx = segment.vertexLength;

                this.addVertex(x, y, -1, -1);
                this.addVertex(x, y,  1, -1);
                this.addVertex(x, y,  1,  1);
                this.addVertex(x, y, -1,  1);

                this.indexArray.emplaceBack(idx, idx + 1, idx + 2);
                this.indexArray.emplaceBack(idx, idx + 2, idx + 3);

                segment.vertexLength += 4;
                segment.primitiveLength += 2;
            }
        }

        this.programConfigurations.populatePaintArrays(
            this.layoutVertexArray.length, feature, index, {}, availableImages, canonical, brightness, undefined, this.worldview
        );
    }

    private addVertex(x: number, y: number, extrudeX: number, extrudeY: number) {
        this.layoutVertexArray.emplaceBack(
            (x * 2) + ((extrudeX + 1) / 2),
            (y * 2) + ((extrudeY + 1) / 2)
        );
    }

    private addGlobeExtVertex(pos: {x: number; y: number; z: number}, normal: vec3) {
        const encode = 1 << 14;
        this.globeExtVertexArray.emplaceBack(
            pos.x, pos.y, pos.z,
            normal[0] * encode, normal[1] * encode, normal[2] * encode
        );
    }
}

register(PieChartBucket, 'PieChartBucket', {omit: ['layers']});

export default PieChartBucket;
