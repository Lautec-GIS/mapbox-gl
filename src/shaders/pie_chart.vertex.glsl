#define NUM_VISIBILITY_RINGS 2
 #define NUM_SAMPLES_PER_RING 16
 #define ELEVATION_BIAS 0.0001

 uniform lowp float u_device_pixel_ratio;

 in vec2 a_pos;

 uniform mat4 u_matrix;


 #pragma mapbox: define lowp float size
 #pragma mapbox: define highp float mask


 out float flags[24];

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
     bool flag10 = (mask_int & 0x200u) > 0u;
     bool flag11 = (mask_int & 0x400u) > 0u;
     bool flag12 = (mask_int & 0x800u) > 0u;
     bool flag13 = (mask_int & 0x1000u) > 0u;
     bool flag14 = (mask_int & 0x2000u) > 0u;
     bool flag15 = (mask_int & 0x4000u) > 0u;
     bool flag16 = (mask_int & 0x8000u) > 0u;
     bool flag17 = (mask_int & 0x10000u) > 0u;
     bool flag18 = (mask_int & 0x20000u) > 0u;
     bool flag19 = (mask_int & 0x40000u) > 0u;
     bool flag20 = (mask_int & 0x80000u) > 0u;
     bool flag21 = (mask_int & 0x100000u) > 0u;
     bool flag22 = (mask_int & 0x200000u) > 0u;
     bool flag23 = (mask_int & 0x400000u) > 0u;
     bool flag24 = (mask_int & 0x800000u) > 0u;

     flags[0] = float(flag1);
     flags[1] = float(flag2);
     flags[2] = float(flag3);
     flags[3] = float(flag4);
     flags[4] = float(flag5);
     flags[5] = float(flag6);
     flags[6] = float(flag7);
     flags[7] = float(flag8);
     flags[8] = float(flag9);
     flags[9] = float(flag10);
     flags[10] = float(flag11);
     flags[11] = float(flag12);
     flags[12] = float(flag13);
     flags[13] = float(flag14);
     flags[14] = float(flag15);
     flags[15] = float(flag16);
     flags[16] = float(flag17);
     flags[17] = float(flag18);
     flags[18] = float(flag19);
     flags[19] = float(flag20);
     flags[20] = float(flag21);
     flags[21] = float(flag22);
     flags[22] = float(flag23);
     flags[23] = float(flag24);

     gl_PointSize = size * u_device_pixel_ratio;
     vec4 projected_center = u_matrix * world_center;

     gl_Position = projected_center;
 }
