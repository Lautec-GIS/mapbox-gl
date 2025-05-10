import StyleLayer from "../style_layer.js";
import PieChartBucket from "../../data/bucket/pie_chart_bucket.js";
import {getMaximumPaintValue} from "../query_utils.js";
import {getLayoutProperties, getPaintProperties} from "./pie_chart_style_layer_properties.js";

import type {Transitionable, Transitioning, Layout, PossiblyEvaluated,ConfigOptions} from "../properties.js";
import type {Bucket, BucketParameters} from "../../data/bucket.js";
import type {LayoutProps, PaintProps} from "./pie_chart_style_layer_properties.js";
import type {LayerSpecification} from "../../style-spec/types.js";
import type {LUT} from "../../util/lut";

class PieChartStyleLayer extends StyleLayer {
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

    override getProgramIds(): string[] {
        return ["pieChart"];
    }

    createBucket(parameters: BucketParameters<PieChartStyleLayer>): PieChartBucket<PieChartStyleLayer> {
        return new PieChartBucket(parameters);
    }

    override queryRadius(bucket: Bucket): number {
        const pieChartBucket = bucket as PieChartBucket<PieChartStyleLayer>;
        return getMaximumPaintValue('pie-chart-size', this, pieChartBucket);
    }

    override isTileClipped(): boolean {
        return true;
    }
}

export default PieChartStyleLayer;
