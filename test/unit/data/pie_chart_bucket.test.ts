// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {test, expect} from '../../util/vitest';
import Point from '@mapbox/point-geometry';
import PieChartBucket from '../../../src/data/bucket/pie_chart_bucket';
import PieChartStyleLayer from '../../../src/style/style_layer/pie_chart_style_layer';

function createLayer(options = {}) {
    const layer = new PieChartStyleLayer({
        id: 'test',
        type: 'pie-chart',
        paint: {
            'pie-chart-size': 50,
            'pie-chart-colors': ['red', 'green', 'blue'],
            ...options
        }
    });
    layer.recalculate({zoom: 0});
    return layer;
}

test('PieChartBucket - basic construction', () => {
    const layer = createLayer();
    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    expect(bucket.zoom).toEqual(0);
    expect(bucket.overscaling).toEqual(1);
    expect(bucket.layerIds).toEqual(['test']);
    expect(bucket.isEmpty()).toBeTruthy();
});

test('PieChartBucket - addFeature creates quad geometry per point', () => {
    const layer = createLayer();
    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    const feature = {
        id: 1,
        properties: {},
        type: 1,
        sortKey: undefined
    };

    bucket.addFeature(feature, [[new Point(100, 100)]], 0, [], {x: 0, y: 0, z: 0});

    expect(bucket.layoutVertexArray.length).toEqual(4);
    expect(bucket.indexArray.length).toEqual(2);
    expect(bucket.isEmpty()).toBeFalsy();
});

test('PieChartBucket - addFeature skips out-of-bounds points', () => {
    const layer = createLayer();
    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    const feature = {
        id: 1,
        properties: {},
        type: 1,
        sortKey: undefined
    };

    bucket.addFeature(feature, [[new Point(-1, -1)]], 0, [], {x: 0, y: 0, z: 0});
    expect(bucket.layoutVertexArray.length).toEqual(0);

    bucket.addFeature(feature, [[new Point(8192, 0)]], 0, [], {x: 0, y: 0, z: 0});
    expect(bucket.layoutVertexArray.length).toEqual(0);
});

test('PieChartBucket - addFeature handles multiple points', () => {
    const layer = createLayer();
    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    const feature = {
        id: 1,
        properties: {},
        type: 1,
        sortKey: undefined
    };

    bucket.addFeature(feature, [[
        new Point(100, 100),
        new Point(200, 200),
        new Point(300, 300)
    ]], 0, [], {x: 0, y: 0, z: 0});

    expect(bucket.layoutVertexArray.length).toEqual(12);
    expect(bucket.indexArray.length).toEqual(6);
});

test('PieChartBucket - uploadPending', () => {
    const layer = createLayer();
    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    expect(bucket.uploadPending()).toBeTruthy();
});

test('PieChartStyleLayer - constructor', () => {
    const layer = createLayer();
    expect(layer.type).toEqual('pie-chart');
});

test('PieChartStyleLayer - getProgramIds', () => {
    const layer = createLayer();
    expect(layer.getProgramIds()).toEqual(['pieChart']);
});

test('PieChartStyleLayer - createBucket', () => {
    const layer = createLayer();
    const bucket = layer.createBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    expect(bucket).toBeInstanceOf(PieChartBucket);
});

test('PieChartStyleLayer - isTileClipped', () => {
    const layer = createLayer();
    expect(layer.isTileClipped()).toBeTruthy();
});

test('PieChartStyleLayer - queryRadius', () => {
    const layer = new PieChartStyleLayer({
        id: 'test',
        type: 'pie-chart',
        paint: {
            'pie-chart-size': 100,
        }
    });
    layer.recalculate({zoom: 0});

    const bucket = new PieChartBucket({
        layers: [layer],
        zoom: 0,
        overscaling: 1,
        index: 0,
        projection: {name: 'mercator'}
    });

    const radius = layer.queryRadius(bucket);
    expect(radius).toEqual(50);
});
