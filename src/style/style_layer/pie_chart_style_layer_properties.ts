// Hand-written — do not run codegen for this file.
/* eslint-disable */

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
    "visibility": new DataConstantProperty({
        "type": "enum",
        "values": {"visible": {}, "none": {}},
        "default": "visible",
        "property-type": "constant"
    } as any),
}));

export type PaintProps = {
    "pie-chart-mask": DataDrivenProperty<number>;
    "pie-chart-colors": DataConstantProperty<string[]>;
    "pie-chart-labels": DataConstantProperty<string[]>;
    "pie-chart-size": DataDrivenProperty<number>;
    "pie-chart-center-size": DataConstantProperty<number>;
    "pie-chart-stroke-color": DataConstantProperty<Color>;
    "pie-chart-stroke-width": DataConstantProperty<number>;
    "pie-chart-divider-width": DataConstantProperty<number>;
};

let paint: Properties<PaintProps>;
export const getPaintProperties = (): Properties<PaintProps> => paint || (paint = new Properties({
    "pie-chart-mask": new DataDrivenProperty({
        "type": "number", "default": 0, "property-type": "data-driven",
        "expression": {"interpolated": false, "parameters": ["zoom", "feature"]}, "transition": false
    } as any),
    "pie-chart-colors": new DataConstantProperty({
        "type": "array", "value": "string",
        "default": ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#a65628"],
        "property-type": "data-constant", "transition": false
    } as any),
    "pie-chart-labels": new DataConstantProperty({
        "type": "array", "value": "string",
        "default": ["Slice 1","Slice 2","Slice 3","Slice 4","Slice 5","Slice 6"],
        "property-type": "data-constant", "transition": false
    } as any),
    "pie-chart-size": new DataDrivenProperty({
        "type": "number", "default": 50, "minimum": 0, "property-type": "data-driven",
        "expression": {"interpolated": true, "parameters": ["zoom", "feature"]}, "transition": false
    } as any),
    "pie-chart-center-size": new DataConstantProperty({
        "type": "number", "default": 0, "minimum": 0, "property-type": "data-constant",
        "expression": {"interpolated": true, "parameters": ["zoom"]}, "transition": false
    } as any),
    "pie-chart-stroke-color": new DataConstantProperty({
        "type": "color", "default": "#000000", "property-type": "data-constant",
        "expression": {"interpolated": true, "parameters": ["zoom"]}, "transition": false
    } as any),
    "pie-chart-stroke-width": new DataConstantProperty({
        "type": "number", "default": 2, "minimum": 0, "property-type": "data-constant",
        "expression": {"interpolated": true, "parameters": ["zoom"]}, "transition": false
    } as any),
    "pie-chart-divider-width": new DataConstantProperty({
        "type": "number", "default": 2, "minimum": 0, "property-type": "data-constant",
        "expression": {"interpolated": true, "parameters": ["zoom"]}, "transition": false
    } as any),
}));
