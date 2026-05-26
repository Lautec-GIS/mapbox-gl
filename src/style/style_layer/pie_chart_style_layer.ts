import StyleLayer from '../style_layer';
import {getLayoutProperties, getPaintProperties} from './pie_chart_style_layer_properties';
import {queryIntersectsCircle} from './circle_style_layer';
import ProgramConfiguration from '../../data/program_configuration';
import PieChartBucket from '../../data/bucket/pie_chart_bucket';
import Point from '@mapbox/point-geometry';

import type {Transitionable, Transitioning, Layout, PossiblyEvaluated, ConfigOptions} from '../properties';
import type {Bucket, BucketParameters} from '../../data/bucket';
import type {LayoutProps, PaintProps} from './pie_chart_style_layer_properties';
import type {LayerSpecification} from '../../style-spec/types';
import type {TilespaceQueryGeometry} from '../query_geometry';
import type {VectorTileFeature} from '@mapbox/vector-tile';
import type {FeatureState} from '../../style-spec/expression/index';
import type Transform from '../../geo/transform';
import type {DEMSampler} from '../../terrain/elevation';
import type {CreateProgramParams} from '../../render/painter';
import type {LUT} from '../../util/lut';
import type {ProgramName} from '../../render/program';

export const PIE_CHART_COLORS_PROP = 'pie-chart-colors' as const;

const filterPaintProps = (property: string): boolean => property !== PIE_CHART_COLORS_PROP && property !== 'pie-chart-labels';

const NO_TRANSLATE = new Point(0, 0);

class PieChartStyleLayer extends StyleLayer {
    override type: 'pie-chart';

    override _unevaluatedLayout: Layout<LayoutProps>;
    override layout: PossiblyEvaluated<LayoutProps>;

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

    override createBucket(parameters: BucketParameters<this>): PieChartBucket {
        return new PieChartBucket(parameters);
    }

    override queryRadius(bucket: Bucket): number {
        const pieChartBucket = bucket as PieChartBucket;
        const sizeValue = this.paint.get('pie-chart-size').value;
        const maxSize = sizeValue.kind === 'constant' ?
            sizeValue.value :
            pieChartBucket.programConfigurations.get(this.id).getMaxValue('pie-chart-size');
        return maxSize / 2 + this.paint.get('pie-chart-stroke-width');
    }

    override queryIntersectsFeature(
        queryGeometry: TilespaceQueryGeometry,
        feature: VectorTileFeature,
        featureState: FeatureState,
        geometry: Array<Array<Point>>,
        zoom: number,
        transform: Transform,
        pixelPosMatrix: Float32Array,
        elevationHelper?: DEMSampler | null,
    ): boolean {
        const size = this.paint.get('pie-chart-size').evaluate(feature, featureState) / 2 +
            this.paint.get('pie-chart-stroke-width');

        return queryIntersectsCircle(
            queryGeometry, geometry, transform, pixelPosMatrix, elevationHelper,
            false, false, NO_TRANSLATE, size
        );
    }

    override getProgramIds(): ProgramName[] {
        return ['pieChart'];
    }

    override getDefaultProgramParams(_name: string, zoom: number, lut: LUT | null): CreateProgramParams | null {
        return {
            config: new ProgramConfiguration(this, {zoom, lut}, filterPaintProps),
            defines: [],
            overrideFog: false
        };
    }
}

export default PieChartStyleLayer;
