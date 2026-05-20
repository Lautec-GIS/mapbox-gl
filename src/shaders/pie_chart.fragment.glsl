in float flags[24];
in vec2 v_extrude;
in float v_size;
uniform vec4 u_colors[24];
uniform float u_segment_count;
uniform float u_opacity;

#pragma mapbox: define lowp float size
#pragma mapbox: define lowp float center_size
#pragma mapbox: define highp vec4 stroke_color
#pragma mapbox: define lowp float stroke_width
#pragma mapbox: define lowp float divider_width

void main() {
    #pragma mapbox: initialize lowp float size
    #pragma mapbox: initialize lowp float center_size
    #pragma mapbox: initialize highp vec4 stroke_color
    #pragma mapbox: initialize lowp float stroke_width
    #pragma mapbox: initialize lowp float divider_width

    vec2 frag_position = v_extrude * 0.5;

    float current_angle = atan(frag_position.y, frag_position.x);
    if(current_angle < 0.0) {
        current_angle += 2.0 * PI;
    }

    float angle_of_segment = 2.0 * PI / float(u_segment_count);
    int segment_index = int(current_angle / angle_of_segment);

    vec4 out_color = u_colors[segment_index] * flags[segment_index];

    float frag_position_length = length(frag_position);

    float one_pixel_size = (1.0 / v_size);

    float delta = fwidth(frag_position_length);

    float borderThreshold = one_pixel_size * (divider_width * 0.5);

    float thetaStart = angle_of_segment * float(segment_index);
    float thetaEnd = angle_of_segment * float(segment_index + 1);

    vec2 borderStartDir = vec2(cos(thetaStart), sin(thetaStart));
    vec2 borderEndDir = vec2(cos(thetaEnd), sin(thetaEnd));

    vec2 borderStartPosition = borderStartDir * frag_position_length;
    vec2 borderEndPosition = borderEndDir * frag_position_length;

    float distanceToStart = length(frag_position - borderStartPosition);
    float distanceToEnd = length(frag_position - borderEndPosition);

    bool is_on_segment_border = distanceToStart < borderThreshold || distanceToEnd < borderThreshold;
    float on_border = float(is_on_segment_border);

    out_color = mix(out_color, stroke_color, on_border);

    float outerBorderStart = 0.5 - one_pixel_size * stroke_width;
    float isOnOuterBorder = smoothstep(outerBorderStart - delta, outerBorderStart + delta, frag_position_length);

    out_color = mix(out_color, stroke_color, isOnOuterBorder);

    float isOnOuterCircle = 1.0 - smoothstep(0.5 - delta, 0.5 + delta, frag_position_length);

    out_color = out_color * isOnOuterCircle;

    float innerBorderStart = (center_size / v_size) * 0.5;
    float isOnInnerBorder = 1.0 - smoothstep(innerBorderStart - delta, innerBorderStart + delta, frag_position_length);

    out_color = mix(out_color, stroke_color, isOnInnerBorder);

    float centerEdge = ((center_size - stroke_width * 2.0) / v_size) * 0.5;
    float isOnInnerCircle = smoothstep(centerEdge - delta, centerEdge + delta, frag_position_length);

    out_color = out_color * isOnInnerCircle;

    if (out_color.a < 0.001) discard;

#ifdef OVERDRAW_INSPECTOR
    glFragColor = vec4(1.0);
#else
    glFragColor = out_color * u_opacity;
#endif
}
