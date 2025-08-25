 in float flags[24];
 uniform vec4 u_colors[24];
 uniform float u_segment_count;

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

     vec2 circle_center = vec2(0.5, 0.5);
     vec2 frag_posistion = gl_PointCoord.xy - circle_center;

     //Calculate our current angle in respect to the center in radians
     float current_angle = atan(frag_posistion.y, frag_posistion.x);
     //flip negative radians
     if(current_angle < 0.0) {
         current_angle += 2.0 * PI;
     }

     //calculate the radians of one segment
     float angle_of_segment = 2.0 * PI / float(u_segment_count);
     //Find what segement we are currently in
     int segment_index = int(current_angle / angle_of_segment);

     vec4 out_color = u_colors[segment_index] * flags[segment_index];

     float frag_posistion_length = length(frag_posistion);

     //calculate the relative size of one pixel
     float one_pixel_size = (1.0 / size);

     float delta = fwidth(frag_posistion_length);

     //we divide by 0.5 because we draw a border on each side of the segment wall
     float borderThreshold = one_pixel_size * (divider_width * 0.5);

     // Compute directions for the two closest segment borders.
     float thetaStart = angle_of_segment * float(segment_index);
     float thetaEnd = angle_of_segment * float(segment_index + 1);

     vec2 borderStartDir = vec2(cos(thetaStart), sin(thetaStart));
     vec2 borderEndDir = vec2(cos(thetaEnd), sin(thetaEnd));

     // Calculate the positions of the segment borders at the same distance from the center as P.
     vec2 borderStartPosition = borderStartDir * frag_posistion_length;
     vec2 borderEndPosition = borderEndDir * frag_posistion_length;

     float distanceToStart = length(frag_posistion - borderStartPosition);
     float distanceToEnd = length(frag_posistion - borderEndPosition);

     bool is_on_segment_border = distanceToStart < borderThreshold || distanceToEnd < borderThreshold;
     float on_border = float(is_on_segment_border);

     out_color = mix(out_color, stroke_color, on_border);

     //OUTER BORDER
     float outerBorderStart = 0.5 - one_pixel_size * stroke_width;
     float isOnOuterBorder = smoothstep(outerBorderStart - delta, outerBorderStart + delta, frag_posistion_length);

     out_color = mix(out_color, stroke_color, isOnOuterBorder);

     //OUTER CIRCLE
     float isOnOuterCircle = 1.0 - smoothstep(circle_center.x - delta, circle_center.y + delta, frag_posistion_length);

     out_color = out_color * isOnOuterCircle;

     //INNER BORDER
     float innerBorderStart = (center_size / size) * 0.5;
     float isOnInnerBorder = 1.0 - smoothstep(innerBorderStart - delta, innerBorderStart + delta, frag_posistion_length);

     out_color = mix(out_color, stroke_color, isOnInnerBorder);

     //INNER CIRCLE
     float centerEdge = ((center_size - stroke_width * 2.0) / size) * 0.5;
     float isOnInnerCicle = smoothstep(centerEdge - delta, centerEdge + delta, frag_posistion_length);

     out_color = out_color * isOnInnerCicle;

     glFragColor = out_color;

 }
