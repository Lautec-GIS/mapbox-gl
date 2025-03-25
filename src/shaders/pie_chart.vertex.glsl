#define NUM_VISIBILITY_RINGS 2
 #define NUM_SAMPLES_PER_RING 16
 #define ELEVATION_BIAS 0.0001

 attribute vec2 a_pos;

 uniform mat4 u_matrix;


 #pragma mapbox: define lowp float size
 #pragma mapbox: define highp float mask


 varying float flags[24];

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

     vec2 circle_center = floor(a_pos * 0.5);
     float height = circle_elevation(circle_center);
     vec4 world_center = vec4(circle_center, height, 1);

     uint mask_int = uint(mask * 16777215.0);

     bool flag1 = (mask_int & 0x1u) > 0u;
     bool flag2 = (mask_int & 0x2u) > 0u;
     bool flag3 = (mask_int & 0x4u) > 0u;
     bool flag4 = (mask_int & 0x8u) > 0u;
     bool flag5 = (mask_int & 0x10u) > 0u;
     bool flag6 = (mask_int & 0x20u) > 0u;
     bool flag7 = (mask_int & 0x40u) > 0u;
     bool flag8 = (mask_int & 0x80u) > 0u;
     bool flag9 = (mask_int & 0x100u) > 0u;

     flags[0] = float(flag1);
     flags[1] = float(flag2);
     flags[2] = float(flag3);
     flags[3] = float(flag4);
     flags[4] = float(flag5);
     flags[5] = float(flag6);
     flags[6] = float(flag7);
     flags[7] = float(flag8);
     flags[8] = float(flag9);

     gl_PointSize = size;
     vec4 projected_center = u_matrix * world_center;

     gl_Position = projected_center;
 }
