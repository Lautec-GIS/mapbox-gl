import styleSpec from '../../style-spec/reference/latest.js';
import {
    Properties,
    DataDrivenProperty,
} from '../properties.js';

import type Color from '../../style-spec/util/color.js';

export type LayoutProps = {
    "circle-sort-key": DataDrivenProperty<number>,
};

let layout: Properties<LayoutProps>;
export const getLayoutProperties = (): Properties<LayoutProps> => layout || (layout = new Properties({
    "circle-sort-key": new DataDrivenProperty(styleSpec["layout_circle"]["circle-sort-key"]),
}));

export type PaintProps = {
    "pie-chart-size": DataDrivenProperty<number>,
    "pie-chart-center-size": DataDrivenProperty<number>,
    "pie-chart-colors": DataDrivenProperty<Array<Color>>,
    "pie-chart-mask": DataDrivenProperty<number>,
    "pie-chart-stroke-width": DataDrivenProperty<number>,
    "pie-chart-stroke-color": DataDrivenProperty<Color>,
    "pie-chart-divider-width": DataDrivenProperty<number>,
};

let paint: Properties<PaintProps>;
export const getPaintProperties = (): Properties<PaintProps> => paint || (paint = new Properties({
    "pie-chart-size": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-size"]),
    "pie-chart-center-size": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-center-size"]),
    "pie-chart-colors": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-colors"]),
    "pie-chart-mask": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-mask"]),
    "pie-chart-stroke-width": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-stroke-width"]),
    "pie-chart-stroke-color": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-stroke-color"]),
    "pie-chart-divider-width": new DataDrivenProperty(styleSpec["paint_pie-chart"]["pie-chart-divider-width"]),
}));

