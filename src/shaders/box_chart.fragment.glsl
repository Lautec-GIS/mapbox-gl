in float flags[24];
uniform vec4 colors[24];

#pragma mapbox: define lowp float size
#pragma mapbox: define lowp float columns
#pragma mapbox: define lowp float rows
#pragma mapbox: define highp vec4 stroke_color
#pragma mapbox: define lowp float stroke_width

void main() {
    #pragma mapbox: initialize lowp float size
    #pragma mapbox: initialize lowp float columns
    #pragma mapbox: initialize lowp float rows
    #pragma mapbox: initialize highp vec4 stroke_color
    #pragma mapbox: initialize lowp float stroke_width

    //calculate the relative size of one pixel
    float one_pixel_size = (1.0 / size);

    float horizontalSize = 1.0 / columns;
    float verticalSize = 1.0 / rows;

    int horizontalIndex = int(gl_PointCoord.x / horizontalSize);
    int verticalIndex = int(gl_PointCoord.y / verticalSize);

    int index = horizontalIndex + (verticalIndex * int(columns));

    //outer border needs to be twice a wide as inner border, because inner border is on each side of segment bounderies
    float outer_border = one_pixel_size * stroke_width * 2.0;
    float inner_border = one_pixel_size * stroke_width;

    //these will be 1 we're on the outer border
    float startBorderX = step(0.1, gl_PointCoord.x);
    float endBorderX = step(0.9, gl_PointCoord.x);
    float startBorderY = step(0.1, gl_PointCoord.y);
    float endBorderY = step(0.9, gl_PointCoord.y);

    // mix between inner and outer border based on if we're on the outer border
    float border_size_left = mix(outer_border, inner_border, startBorderX);
    float border_size_right = mix(1.0 - inner_border,1.0 - outer_border, endBorderX);
    float border_size_top = mix(outer_border, inner_border, startBorderY);
    float border_size_bottom = mix(1.0 - inner_border,1.0 - outer_border, endBorderY);

    float x_position_within_segment = (gl_PointCoord.x / horizontalSize) - float(horizontalIndex);
    float y_position_within_segment = (gl_PointCoord.y / verticalSize) - float(verticalIndex);

    float onLeftBorder = step(border_size_left, x_position_within_segment);
    float onRightBorder = step(border_size_right, x_position_within_segment);

    float onTopBorder = step(border_size_top, y_position_within_segment);
    float onBottomBorder = step(border_size_bottom, y_position_within_segment);

    vec4 out_color = colors[index] * flags[index];

    out_color = mix(stroke_color, out_color, onLeftBorder);
    out_color = mix(out_color, stroke_color, onRightBorder);
    out_color = mix(stroke_color, out_color, onTopBorder);
    out_color = mix(out_color, stroke_color, onBottomBorder);

    glFragColor = out_color;
}
