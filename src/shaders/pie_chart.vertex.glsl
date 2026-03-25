#define NUM_VISIBILITY_RINGS 2
 #define NUM_SAMPLES_PER_RING 16
 #define ELEVATION_BIAS 0.0001

 uniform mat4 u_matrix;
 uniform mat2 u_extrude_scale;
 uniform lowp float u_device_pixel_ratio;
 uniform highp float u_camera_to_center_distance;

 in vec2 a_pos;

 #ifdef PROJECTION_GLOBE_VIEW
 in vec3 a_pos_3;         // Projected position on the globe
 in vec3 a_pos_normal_3;  // Surface normal at the position

 uniform mat4 u_inv_rot_matrix;
 uniform vec2 u_merc_center;
 uniform vec3 u_tile_id;
 uniform float u_zoom_transition;
 uniform vec3 u_up_dir;
 #endif

 out vec2 v_extrude;
 out float v_size;
 out float flags[24];

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
     #pragma mapbox: initialize lowp float mask

     // unencode the extrusion vector that we snuck into the a_pos vector
     vec2 extrude = vec2(mod(a_pos, 2.0) * 2.0 - 1.0);

     // multiply a_pos by 0.5, since we had it * 2 in order to sneak
     // in extrusion data
     vec2 circle_center = floor(a_pos * 0.5);

     float height = circle_elevation(circle_center);
     vec4 world_center = vec4(circle_center, height, 1);

     // Decode mask bits into flags
     uint mask_int = uint(mask * 16777215.0);

     flags[0] = float((mask_int & 0x1u) > 0u);
     flags[1] = float((mask_int & 0x2u) > 0u);
     flags[2] = float((mask_int & 0x4u) > 0u);
     flags[3] = float((mask_int & 0x8u) > 0u);
     flags[4] = float((mask_int & 0x10u) > 0u);
     flags[5] = float((mask_int & 0x20u) > 0u);
     flags[6] = float((mask_int & 0x40u) > 0u);
     flags[7] = float((mask_int & 0x80u) > 0u);
     flags[8] = float((mask_int & 0x100u) > 0u);
     flags[9] = float((mask_int & 0x200u) > 0u);
     flags[10] = float((mask_int & 0x400u) > 0u);
     flags[11] = float((mask_int & 0x800u) > 0u);
     flags[12] = float((mask_int & 0x1000u) > 0u);
     flags[13] = float((mask_int & 0x2000u) > 0u);
     flags[14] = float((mask_int & 0x4000u) > 0u);
     flags[15] = float((mask_int & 0x8000u) > 0u);
     flags[16] = float((mask_int & 0x10000u) > 0u);
     flags[17] = float((mask_int & 0x20000u) > 0u);
     flags[18] = float((mask_int & 0x40000u) > 0u);
     flags[19] = float((mask_int & 0x80000u) > 0u);
     flags[20] = float((mask_int & 0x100000u) > 0u);
     flags[21] = float((mask_int & 0x200000u) > 0u);
     flags[22] = float((mask_int & 0x400000u) > 0u);
     flags[23] = float((mask_int & 0x800000u) > 0u);

     vec4 projected_center = u_matrix * world_center;

     // Scale the extrusion by half the size (size = diameter) in screen pixels
     float view_scale = projected_center.w;
     vec2 scaled_extrude = extrude * (size * 0.5) * u_extrude_scale * view_scale;

     gl_Position = projected_center + vec4(scaled_extrude, 0, 0);

     // Pass extrude to fragment shader (ranges from -1 to 1 across quad)
     v_extrude = extrude;
     v_size = size;
 }
