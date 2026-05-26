import {CircleLayoutArray, CircleGlobeExtArray, TriangleIndexArray} from '../array_types';
import {pieChartAttributes, pieChartGlobeAttributesExt} from './pie_chart_attributes';
import SegmentVector from '../segment';
import {ProgramConfigurationSet} from '../program_configuration';
import loadGeometry from '../load_geometry';
import toEvaluationFeature from '../evaluation_feature';
import {register} from '../../util/web_worker_transfer';
import EvaluationParameters from '../../style/evaluation_parameters';

import type {TileTransform} from '../../geo/projection/tile_transform';
import type {CanonicalTileID, UnwrappedTileID} from '../../source/tile_id';
import type {
    Bucket,
    BucketParameters,
    BucketFeature,
    IndexedFeature,
    PopulateParameters
} from '../bucket';
import type Context from '../../gl/context';
import type IndexBuffer from '../../gl/index_buffer';
import type VertexBuffer from '../../gl/vertex_buffer';
import type Point from '@mapbox/point-geometry';
import type {ProjectionSpecification} from '../../style-spec/types';
import type Projection from '../../geo/projection/projection';
import type {FeatureStates} from "../../source/source_state";
import type {SpritePositions} from "../../util/image";
import type PieChartStyleLayer from "../../style/style_layer/pie_chart_style_layer";
import type {VectorTileLayer} from "@mapbox/vector-tile";
import type {TileFootprint} from '../../../3d-style/util/conflation';
import type {TypedStyleLayer} from '../../style/style_layer/typed_style_layer';
import type {ImageId} from '../../style-spec/expression/types/image_id';
import type {GlobalProperties} from "../../style-spec/expression";

const EXTENT = 8192;

function addCircleVertex(layoutVertexArray: CircleLayoutArray, x: number, y: number, extrudeX: number, extrudeY: number) {
    layoutVertexArray.emplaceBack(
        (x * 2) + ((extrudeX + 1) / 2),
        (y * 2) + ((extrudeY + 1) / 2));
}

function addGlobeExtVertex(vertexArray: CircleGlobeExtArray, pos: {
    x: number,
    y: number,
    z: number
}, normal: [number, number, number]) {
    const encode = 1 << 14;
    vertexArray.emplaceBack(
        pos.x, pos.y, pos.z,
        normal[0] * encode, normal[1] * encode, normal[2] * encode);
}

class PieChartBucket<Layer extends PieChartStyleLayer = PieChartStyleLayer> implements Bucket {
    index: number;
    worldview: string;
    zoom: number;
    overscaling: number;
    layerIds: Array<string>;
    layers: Array<Layer>;
    stateDependentLayers: Array<Layer>;
    stateDependentLayerIds: Array<string>;

    layoutVertexArray: CircleLayoutArray;
    layoutVertexBuffer: VertexBuffer;
    globeExtVertexArray: CircleGlobeExtArray | null;
    globeExtVertexBuffer: VertexBuffer | null;

    indexArray: TriangleIndexArray;
    indexBuffer: IndexBuffer;

    hasPattern: boolean;
    programConfigurations: ProgramConfigurationSet<Layer>;
    segments: SegmentVector;
    uploaded: boolean;
    projection: ProjectionSpecification;

    constructor(options: BucketParameters<Layer>) {
        this.zoom = options.zoom;
        this.overscaling = options.overscaling;
        this.layers = options.layers;
        this.layerIds = this.layers.map(layer => layer.id);
        this.index = options.index;
        this.hasPattern = false;
        this.hasAppearances = false;
        this.projection = options.projection;

        this.layoutVertexArray = new CircleLayoutArray();
        this.indexArray = new TriangleIndexArray();
        this.segments = new SegmentVector();
        this.programConfigurations = new ProgramConfigurationSet(options.layers, {
            zoom: options.zoom,
            lut: options.lut,
        }, (prop) => prop !== 'pie-chart-colors');

        this.stateDependentLayerIds = this.layers.filter((l) => l.isStateDependent()).map((l) => l.id);
    }

    hasAppearances: boolean;
    evaluateQueryRenderedFeaturePadding?: () => number;
    prepare?: () => Promise<unknown>;
    updateAppearances(_canonical?: CanonicalTileID, _featureState?: FeatureStates, _availableImages?: Array<ImageId>, _globalProperties?: GlobalProperties) {
        return {hasLayoutChanges: false, hasUboChanges: false};
    }
    updateFootprints(_id: UnwrappedTileID, _footprints: Array<TileFootprint>) {
    }

    populate(features: Array<IndexedFeature>, options: PopulateParameters, canonical: CanonicalTileID, tileTransform: TileTransform) {
        const bucketFeatures = [];
        for (const {feature, id, index, sourceLayerIndex} of features) {
            const needGeometry = this.layers[0]._featureFilter.needGeometry;
            const evaluationFeature = toEvaluationFeature(feature, needGeometry);

            if (!this.layers[0]._featureFilter.filter(new EvaluationParameters(this.zoom), evaluationFeature, canonical)) continue;

            const bucketFeature: BucketFeature = {
                id,
                properties: feature.properties,
                type: feature.type,
                sourceLayerIndex,
                index,
                geometry: needGeometry ? evaluationFeature.geometry : loadGeometry(feature, canonical, tileTransform),
                patterns: {}
            };

            bucketFeatures.push(bucketFeature);
        }

        let globeProjection: Projection | null | undefined = null;

        if (tileTransform.projection.name === 'globe') {
            this.globeExtVertexArray = new CircleGlobeExtArray();
            globeProjection = tileTransform.projection;
        }

        for (const bucketFeature of bucketFeatures) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const {geometry, index, sourceLayerIndex} = bucketFeature;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const feature = features[index].feature;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.addFeature(bucketFeature, geometry, index, options.availableImages, canonical, globeProjection, options.brightness);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            options.featureIndex.insert(feature, geometry, index, sourceLayerIndex, this.index);
        }
    }

    update(states: FeatureStates, vtLayer: VectorTileLayer, availableImages: ImageId[], imagePositions: SpritePositions, layers: Array<TypedStyleLayer>, isBrightnessChanged: boolean, brightness?: number | null) {
        this.programConfigurations.updatePaintArrays(states, vtLayer, layers, availableImages, imagePositions, isBrightnessChanged, brightness);
    }

    isEmpty(): boolean {
        return this.layoutVertexArray.length === 0;
    }

    uploadPending(): boolean {
        return !this.uploaded || this.programConfigurations.needsUpload;
    }

    upload(context: Context) {
        if (!this.uploaded) {
            if (this.layoutVertexArray.length > 0) {
                this.layoutVertexBuffer = context.createVertexBuffer(this.layoutVertexArray, pieChartAttributes.members);
                this.indexBuffer = context.createIndexBuffer(this.indexArray);

                if (this.globeExtVertexArray) {
                    this.globeExtVertexBuffer = context.createVertexBuffer(this.globeExtVertexArray, pieChartGlobeAttributesExt.members);
                }
            }
        }
        this.programConfigurations.upload(context);
        this.uploaded = true;
    }

    updateExpressions(layers: ReadonlyArray<TypedStyleLayer>) {
        this.programConfigurations.updateExpressions(layers);
    }

    destroy() {
        if (!this.layoutVertexBuffer) return;
        this.layoutVertexBuffer.destroy();
        this.indexBuffer.destroy();
        this.programConfigurations.destroy();
        this.segments.destroy();
        if (this.globeExtVertexBuffer) {
            this.globeExtVertexBuffer.destroy();
        }
    }

    addFeature(feature: BucketFeature, geometry: Array<Array<Point>>, index: number, availableImages: ImageId[], canonical: CanonicalTileID, projection?: Projection | null, brightness?: number | null) {
        for (const ring of geometry) {
            for (const point of ring) {
                const x = point.x;
                const y = point.y;

                if (x < 0 || x >= EXTENT || y < 0 || y >= EXTENT) continue;

                if (projection && this.globeExtVertexArray) {
                    const projectedPoint = projection.projectTilePoint(x, y, canonical);
                    const normal = projection.upVector(canonical, x, y);

                    addGlobeExtVertex(this.globeExtVertexArray, projectedPoint, normal);
                    addGlobeExtVertex(this.globeExtVertexArray, projectedPoint, normal);
                    addGlobeExtVertex(this.globeExtVertexArray, projectedPoint, normal);
                    addGlobeExtVertex(this.globeExtVertexArray, projectedPoint, normal);
                }
                const segment = this.segments.prepareSegment(4, this.layoutVertexArray, this.indexArray, feature.sortKey);
                const vertexIndex = segment.vertexLength;

                addCircleVertex(this.layoutVertexArray, x, y, -1, -1);
                addCircleVertex(this.layoutVertexArray, x, y, 1, -1);
                addCircleVertex(this.layoutVertexArray, x, y, 1, 1);
                addCircleVertex(this.layoutVertexArray, x, y, -1, 1);

                this.indexArray.emplaceBack(vertexIndex, vertexIndex + 1, vertexIndex + 2);
                this.indexArray.emplaceBack(vertexIndex, vertexIndex + 2, vertexIndex + 3);

                segment.vertexLength += 4;
                segment.primitiveLength += 2;
            }
        }

        this.programConfigurations.populatePaintArrays(this.layoutVertexArray.length, feature, index, {}, availableImages, canonical, brightness);
    }
}

register(PieChartBucket, 'PieChartBucket', {omit: ['layers']});

export default PieChartBucket;
