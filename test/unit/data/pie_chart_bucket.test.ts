// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {describe, test, expect} from '../../util/vitest';
import Point from '@mapbox/point-geometry';
import PieChartBucket from '../../../src/data/bucket/pie_chart_bucket';
import PieChartStyleLayer from '../../../src/style/style_layer/pie_chart_style_layer';

function makeLayer() {
    const layer = new PieChartStyleLayer({id: 'test-pie', type: 'pie-chart', source: 'src', paint: {}}, '', null);
    layer.recalculate({zoom: 0});
    return layer;
}

function makeBucket(layer) {
    return new PieChartBucket({
        zoom: 0,
        overscaling: 1,
        layers: [layer],
        index: 0,
        hasPattern: false,
        projection: {name: 'mercator'},
        lut: null,
        worldview: undefined
    });
}

function makeCanonical() {
    return {x: 0, y: 0, z: 0};
}

describe('PieChartBucket', () => {
    test('isEmpty() returns true before any features are added', () => {
        const bucket = makeBucket(makeLayer());
        expect(bucket.isEmpty()).toBe(true);
    });

    test('uploadPending() returns true before upload', () => {
        const bucket = makeBucket(makeLayer());
        expect(bucket.uploadPending()).toBe(true);
    });

    test('addFeature for a single point produces 4 vertices and 2 triangles', () => {
        const bucket = makeBucket(makeLayer());

        const feature = {
            id: 1,
            properties: {col: 7},
            type: 1,
            sourceLayerIndex: 0,
            index: 0,
            geometry: [[new Point(2048, 2048)]],
            patterns: {},
            sortKey: undefined
        };

        bucket.addFeature(feature, [[new Point(2048, 2048)]], 0, [], makeCanonical(), null, null, []);

        expect(bucket.layoutVertexArray.length).toBe(4);
        expect(bucket.indexArray.length).toBe(2);
    });

    test('isEmpty() returns false after addFeature', () => {
        const bucket = makeBucket(makeLayer());

        const feature = {
            id: 1, properties: {}, type: 1, sourceLayerIndex: 0, index: 0,
            geometry: [[new Point(2048, 2048)]], patterns: {}, sortKey: undefined
        };

        bucket.addFeature(feature, [[new Point(2048, 2048)]], 0, [], makeCanonical(), null, null, []);
        expect(bucket.isEmpty()).toBe(false);
    });

    test('points outside EXTENT are skipped', () => {
        const bucket = makeBucket(makeLayer());

        const feature = {
            id: 1, properties: {}, type: 1, sourceLayerIndex: 0, index: 0,
            geometry: [[new Point(-1, 2048)]], patterns: {}, sortKey: undefined
        };

        bucket.addFeature(feature, [[new Point(-1, 2048)]], 0, [], makeCanonical(), null, null, []);
        expect(bucket.isEmpty()).toBe(true);
    });
});
