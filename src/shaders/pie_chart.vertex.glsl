#define ELEVATION_BIAS 0.0001

uniform mat4 u_matrix;
uniform mat2 u_extrude_scale;
uniform lowp float u_device_pixel_ratio;
uniform highp float u_camera_to_center_distance;

in vec2 a_pos;

#ifdef PROJECTION_GLOBE_VIEW
in vec3 a_pos_3;
in vec3 a_pos_normal_3;

uniform mat4 u_inv_rot_matrix;
uniform vec2 u_merc_center;
uniform vec3 u_tile_id;
uniform float u_zoom_transition;
uniform vec3 u_up_dir;
#endif

out vec2 v_extrude;
out float v_size;
out vec4 v_flags_0;
out vec4 v_flags_1;
out vec4 v_flags_2;
out vec4 v_flags_3;
out vec4 v_flags_4;
out vec4 v_flags_5;

#pragma mapbox: define lowp float size
#pragma mapbox: define highp float mask

float circle_elevation(vec2 pos) {
#if defined(TERRAIN)
    return elevation(pos) + ELEVATION_BIAS;
#else
    return 0.0;
#endif
}

void main(void) {

    #pragma mapbox: initialize lowp float size
    #pragma mapbox: initialize highp float mask

    vec2 extrude = vec2(mod(a_pos, 2.0) * 2.0 - 1.0);
    vec2 circle_center = floor(a_pos * 0.5);

    float height = circle_elevation(circle_center);
    vec4 world_center = vec4(circle_center, height, 1);

    uint mask_int = uint(mask * 16777215.0);

    v_flags_0 = vec4(
        float((mask_int & 0x1u) > 0u),
        float((mask_int & 0x2u) > 0u),
        float((mask_int & 0x4u) > 0u),
        float((mask_int & 0x8u) > 0u)
    );
    v_flags_1 = vec4(
        float((mask_int & 0x10u) > 0u),
        float((mask_int & 0x20u) > 0u),
        float((mask_int & 0x40u) > 0u),
        float((mask_int & 0x80u) > 0u)
    );
    v_flags_2 = vec4(
        float((mask_int & 0x100u) > 0u),
        float((mask_int & 0x200u) > 0u),
        float((mask_int & 0x400u) > 0u),
        float((mask_int & 0x800u) > 0u)
    );
    v_flags_3 = vec4(
        float((mask_int & 0x1000u) > 0u),
        float((mask_int & 0x2000u) > 0u),
        float((mask_int & 0x4000u) > 0u),
        float((mask_int & 0x8000u) > 0u)
    );
    v_flags_4 = vec4(
        float((mask_int & 0x10000u) > 0u),
        float((mask_int & 0x20000u) > 0u),
        float((mask_int & 0x40000u) > 0u),
        float((mask_int & 0x80000u) > 0u)
    );
    v_flags_5 = vec4(
        float((mask_int & 0x100000u) > 0u),
        float((mask_int & 0x200000u) > 0u),
        float((mask_int & 0x400000u) > 0u),
        float((mask_int & 0x800000u) > 0u)
    );

    vec4 projected_center = u_matrix * world_center;

    float view_scale = projected_center.w;
    vec2 scaled_extrude = extrude * (size * 0.5) * u_extrude_scale * view_scale;

    gl_Position = projected_center + vec4(scaled_extrude, 0, 0);

    v_extrude = extrude;
    v_size = size;
}
