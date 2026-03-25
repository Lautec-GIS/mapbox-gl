// This file is generated. Edit build/generate-style-code.ts, then run `npm run codegen`.
/* eslint-disable */

import styleSpec from '../../style-spec/reference/latest';

import {
    Properties,
    DataDrivenProperty,
    DataConstantProperty
} from '../properties';


import type Color from '../../style-spec/util/color';

export type LayoutProps = {
    "visibility": DataConstantProperty<"visible" | "none">;
};
let layout: Properties<LayoutProps>;
export const getLayoutProperties = (): Properties<LayoutProps> => layout || (layout = new Properties({
    "visibility": new DataConstantProperty(styleSpec["layout_pie-chart"]["visibility"]),
}));

export type PaintProps = {
    "pie-chart-size": DataDrivenProperty<number>;
    "pie-chart-colors": DataDrivenProperty<Array<string>>;
    "pie-chart-labels": DataDrivenProperty<Array<string>>;
    "pie-chart-mask": DataDrivenProperty<number>;
    "pie-chart-center-size": DataDrivenProperty<number>;
    "pie-chart-stroke-width": DataDrivenProperty<number>;
    "pie-chart-stroke-color": DataDrivenProperty<Color>;
    "pie-chart-divider-width": DataDrivenProperty<number>;
    "pie-chart-opacity": DataDrivenProperty<number>;
    "pie-chart-stroke-color-use-theme": DataDrivenProperty<string>;
};

let paint: Properties<PaintProps>;
export const getPaintProperties = (): Properties<PaintProps> => paint || (paint = new Properties({
    "pie-chart-size": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-size"]),
    "pie-chart-colors": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-colors"]),
    "pie-chart-labels": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-labels"]),
    "pie-chart-mask": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-mask"]),
    "pie-chart-center-size": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-center-size"]),
    "pie-chart-stroke-width": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-stroke-width"]),
    "pie-chart-stroke-color": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-stroke-color"]),
    "pie-chart-divider-width": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-divider-width"]),
    "pie-chart-opacity": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-opacity"]),
    "pie-chart-stroke-color-use-theme": new DataDrivenProperty({"type":"string","default":"default","property-type":"data-driven"}),
}));
