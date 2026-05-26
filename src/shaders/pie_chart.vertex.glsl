#include "_prelude_fog.vertex.glsl"
#include "_prelude_terrain.vertex.glsl"

uniform mat4 u_matrix;
uniform mat2 u_extrude_scale;
uniform highp float u_camera_to_center_distance;

in ivec2 a_pos;

#ifdef PROJECTION_GLOBE_VIEW
in ivec4 a_pos_3;
in ivec4 a_pos_normal_3;

uniform mat4 u_inv_rot_matrix;
uniform vec2 u_merc_center;
uniform vec3 u_tile_id;
uniform float u_zoom_transition;
uniform vec3 u_up_dir;
#endif

out vec2 v_extrude;
out float v_mask;

#pragma mapbox: define mediump float size
#pragma mapbox: define highp float mask

void main() {
    #pragma mapbox: initialize mediump float size
    #pragma mapbox: initialize highp float mask

    v_mask = mask;

    vec2 pos2 = vec2(a_pos);
    vec2 extrude = vec2(mod(pos2, 2.0) * 2.0 - 1.0);
    vec2 circle_center = floor(pos2 * 0.5);

    vec4 world_center;
#if defined(PROJECTION_GLOBE_VIEW)
    mat3 surface_vectors = globe_mercator_surface_vectors(vec3(a_pos_normal_3) / 16384.0, u_up_dir, u_zoom_transition);
    vec3 surface_extrusion = extrude.x * surface_vectors[0] + extrude.y * surface_vectors[1];
    vec3 globe_pos = vec3(a_pos_3) + surface_extrusion;
    vec3 merc_pos = mercator_tile_position(u_inv_rot_matrix, circle_center, u_tile_id, u_merc_center) + surface_extrusion;
    world_center = vec4(mix_globe_mercator(globe_pos, merc_pos, u_zoom_transition), 1.0);
#else
    world_center = vec4(circle_center, 0.0, 1.0);
#endif

    vec4 projected_center = u_matrix * world_center;
    float view_scale = projected_center.w;
    vec2 offset = extrude * (size * 0.5) * u_extrude_scale * view_scale;

    gl_Position = projected_center + vec4(offset, 0.0, 0.0);

    v_extrude = extrude;

#ifdef FOG
    v_fog_pos = fog_position(world_center.xyz);
#endif
}
