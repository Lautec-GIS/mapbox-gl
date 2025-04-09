import StyleLayer from "../style_layer.js";
import PieChartBucket from "../../data/bucket/pie_chart_bucket.js";
import {getMaximumPaintValue} from "../query_utils.js";
import properties from "./pie_chart_style_layer_properties.js";

import type {Transitionable, Transitioning, Layout, PossiblyEvaluated} from "../properties.js";
import type {Bucket, BucketParameters} from "../../data/bucket.js";
import type {LayoutProps, PaintProps} from "./pie_chart_style_layer_properties.js";
import type {LayerSpecification} from "../../style-spec/types.js";

class PieChartStyleLayer extends StyleLayer {
    override _unevaluatedLayout: Layout<LayoutProps>;
    override layout: PossiblyEvaluated<LayoutProps>;

    override _transitionablePaint: Transitionable<PaintProps>;
    override _transitioningPaint: Transitioning<PaintProps>;
    override paint: PossiblyEvaluated<PaintProps>;

    constructor(layer: LayerSpecification) {
        super(layer, properties, 'pie-chart', null);
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
