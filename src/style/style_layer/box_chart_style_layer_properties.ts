// This file is generated. Edit build/generate-style-code.ts, then run `npm run codegen`.
/* eslint-disable */

import styleSpec from '../../style-spec/reference/latest';

import {
    Properties,
    ColorRampProperty,
    DataDrivenProperty,
    DataConstantProperty
} from '../properties';


import type Color from '../../style-spec/util/color';
import type Formatted from '../../style-spec/expression/types/formatted';
import type ResolvedImage from '../../style-spec/expression/types/resolved_image';
import type {StylePropertySpecification} from '../../style-spec/style-spec';

export type LayoutProps = {
    "visibility": DataConstantProperty<"visible" | "none">;
};
let layout: Properties<LayoutProps>;
export const getLayoutProperties = (): Properties<LayoutProps> => layout || (layout = new Properties({
    "visibility": new DataConstantProperty(styleSpec["layout_box-chart"]["visibility"]),
}));

export type PaintProps = {
    "box-chart-size": DataDrivenProperty<number>;
    "box-chart-colors": DataDrivenProperty<Array<Color>>;
    "box-chart-labels": DataDrivenProperty<Array<string>>;
    "box-chart-mask": DataDrivenProperty<number>;
    "box-chart-columns": DataDrivenProperty<number>;
    "box-chart-rows": DataDrivenProperty<number>;
    "box-chart-stroke-width": DataDrivenProperty<number>;
    "box-chart-stroke-color": DataDrivenProperty<Color>;
    "box-chart-stroke-color-use-theme": DataDrivenProperty<string>;
};

let paint: Properties<PaintProps>;
export const getPaintProperties = (): Properties<PaintProps> => paint || (paint = new Properties({
    "box-chart-size": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-size"]),
    "box-chart-colors": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-colors"]),
    "box-chart-labels": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-labels"]),
    "box-chart-mask": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-mask"]),
    "box-chart-columns": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-columns"]),
    "box-chart-rows": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-rows"]),
    "box-chart-stroke-width": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-stroke-width"]),
    "box-chart-stroke-color": new DataDrivenProperty(styleSpec["paint_box-chart"]["box-chart-stroke-color"]),
    "box-chart-stroke-color-use-theme": new DataDrivenProperty({"type":"string","default":"default","property-type":"data-driven"}),
}));
