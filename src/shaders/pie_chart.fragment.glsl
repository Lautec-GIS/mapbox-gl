#define MAX_SLICES 24

uniform int u_segment_count;
uniform vec4 u_colors[MAX_SLICES];
uniform float u_stroke_width_frac;
uniform float u_divider_width_frac;
uniform float u_center_size_frac;
uniform vec4 u_stroke_color;

in vec2 v_extrude;
in float v_mask;

out vec4 fragColor;

const float PI = 3.141592653589793;

void main() {
    float dist = length(v_extrude);
    if (dist > 1.0) discard;

    // Recover integer bitmask from normalised float attribute
    int mask_i = int(floor(v_mask * 16777215.0 + 0.5));

    // Polar angle in [0, 2*PI)
    float angle = atan(v_extrude.y, v_extrude.x);
    if (angle < 0.0) angle += 2.0 * PI;

    int seg = int(floor(angle / (2.0 * PI / float(u_segment_count))));
    seg = clamp(seg, 0, u_segment_count - 1);

    bool visible = ((mask_i >> seg) & 1) == 1;

    // Outer stroke: near the outer edge
    bool in_outer_stroke = u_stroke_width_frac > 0.0 && dist > (1.0 - u_stroke_width_frac);

    // Inner hole
    bool in_hole = u_center_size_frac > 0.0 && dist < u_center_size_frac;
    bool in_inner_stroke = u_center_size_frac > 0.0 &&
                           dist >= u_center_size_frac &&
                           dist < (u_center_size_frac + u_stroke_width_frac);

    // Divider lines: angular distance to nearest sector boundary
    float sector_angle = 2.0 * PI / float(u_segment_count);
    float angle_in_sector = mod(angle, sector_angle);
    float dist_to_divider = min(angle_in_sector, sector_angle - angle_in_sector) * dist;
    bool in_divider = u_divider_width_frac > 0.0 && dist_to_divider < u_divider_width_frac;

    if (in_hole) discard;

    if (in_outer_stroke || in_inner_stroke || in_divider) {
        fragColor = u_stroke_color;
        return;
    }

    if (!visible) discard;

    fragColor = u_colors[seg];

#ifdef OVERDRAW_INSPECTOR
    fragColor = vec4(1.0);
#endif
}
