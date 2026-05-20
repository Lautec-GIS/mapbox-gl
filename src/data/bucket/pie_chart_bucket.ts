// Stub — full implementation added in Task 8.
import {ProgramConfigurationSet} from '../program_configuration';

import type {Bucket, BucketParameters, IndexedFeature, PopulateParameters} from '../bucket';
import type {FeatureStates} from '../../source/source_state';
import type Context from '../../gl/context';
import type {TypedStyleLayer} from '../../style/style_layer/typed_style_layer';
import type {SpritePositions} from '../../util/image';
import type {VectorTileLayer} from '@mapbox/vector-tile';
import type {CanonicalTileID, UnwrappedTileID} from '../../source/tile_id';
import type {TileTransform} from '../../geo/projection/tile_transform';
import type {TileFootprint} from '../../../3d-style/util/conflation';
import type {ImageId} from '../../style-spec/expression/types/image_id';
import type {GlobalProperties} from '../../style-spec/expression';
import type ImageManager from '../../render/image_manager';
import type {FeatureState} from '../../style-spec/expression/index';
import type PieChartStyleLayer from '../../style/style_layer/pie_chart_style_layer';

class PieChartBucket<Layer extends TypedStyleLayer = PieChartStyleLayer> implements Bucket {
    layers: Array<Layer>;
    layerIds: Array<string>;
    stateDependentLayers: Array<TypedStyleLayer>;
    stateDependentLayerIds: Array<string>;
    hasAppearances: boolean | null;
    hasPattern: boolean;
    worldview: string | undefined;
    programConfigurations: ProgramConfigurationSet<Layer>;

    constructor(options: BucketParameters<Layer>) {
        this.layers = options.layers;
        this.layerIds = this.layers.map(layer => layer.id);
        this.stateDependentLayers = [];
        this.stateDependentLayerIds = [];
        this.hasAppearances = null;
        this.hasPattern = false;
        this.worldview = undefined;
        this.programConfigurations = new ProgramConfigurationSet(options.layers, {zoom: options.zoom, lut: options.lut});
    }

    populate(_features: Array<IndexedFeature>, _options: PopulateParameters, _canonical: CanonicalTileID, _tileTransform: TileTransform): void {}

    update(
        _states: FeatureStates,
        _vtLayer: VectorTileLayer,
        _availableImages: ImageId[],
        _imagePositions: SpritePositions,
        _layers: ReadonlyArray<TypedStyleLayer>,
        _isBrightnessChanged: boolean,
        _brightness?: number | null,
        _canonical?: CanonicalTileID
    ): void {}

    isEmpty(): boolean { return true; }

    uploadPending(): boolean { return false; }

    upload(_context: Context, _canonical?: CanonicalTileID, _featureState?: FeatureStates, _availableImages?: Array<ImageId>, _globalProperties?: GlobalProperties): void {}

    destroy(_reload?: boolean): void {
        this.programConfigurations.destroy();
    }

    updateFootprints(_id: UnwrappedTileID, _footprints: Array<TileFootprint>): void {}

    updateAppearances(_canonical?: CanonicalTileID, _featureState?: FeatureStates, _availableImages?: Array<ImageId>, _globalProperties?: GlobalProperties, _imageManager?: ImageManager): void {}
}

export default PieChartBucket;
