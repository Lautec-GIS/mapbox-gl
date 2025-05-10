 in float flags[24];
 uniform vec4 colors[24];
 uniform float segment_count;

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

     //float segment_count = 4.0;

     float segment_padding = 0.0;

     float borderRadius = (1.0 / size);
     borderRadius = mix(borderRadius, 0.008, step(0.008, borderRadius));

     vec2 center = vec2(0.5, 0.5);

     vec2 fragPos = gl_PointCoord.xy - center;
     vec2 normalFragPos = normalize(gl_PointCoord.xy - center);

     float theta = atan(fragPos.y, fragPos.x);
     if(theta < 0.0) {
         theta += 2.0 * PI;
     }

     float angleSegment = 2.0 * PI;
     angleSegment /= float(segment_count);

     float angle = atan(normalFragPos.y, normalFragPos.x) + PI;
     float anglePercentage = angle / angleSegment;



     float segmentAngle = 2.0 * PI / float(segment_count);
     int segmentIndex = int(theta / segmentAngle);

     vec4 segmentColor = colors[segmentIndex];

     float flag = flags[segmentIndex];
     float flaged = mix(0.0, 1.0, step(0.1, flag));

     segmentColor = vec4(segmentColor.x, segmentColor.y, segmentColor.z, segmentColor.w * flaged);

     float centerBorder = (center_size / size) * 0.5;

     float r = length(fragPos);
     float delta = fwidth(r);

     float borderThreshold = borderRadius * (divider_width * 0.5);

 // Compute directions for the two closest segment borders.
     float thetaStart = segmentAngle * float(segmentIndex);
     float thetaEnd = segmentAngle * float(segmentIndex + 1);

     vec2 borderStartDir = vec2(cos(thetaStart), sin(thetaStart));
     vec2 borderEndDir = vec2(cos(thetaEnd), sin(thetaEnd));

 // Calculate the positions of the segment borders at the same distance from the center as P.
     vec2 borderStartPosition = borderStartDir * r;
     vec2 borderEndPosition = borderEndDir * r;

     float distanceToStart = length(fragPos - borderStartPosition);
     float distanceToEnd = length(fragPos - borderEndPosition);

     bool isOnBorder = distanceToStart < borderThreshold || distanceToEnd < borderThreshold;

     float test = 0.5 - borderRadius * stroke_width;

     float outerCircle = 1.0, innerCicle = 1.0;
     outerCircle = outerCircle - smoothstep(0.5 - delta, 0.5 + delta, r);
     innerCicle = smoothstep(centerBorder - delta, centerBorder + delta, r);

 //outerCircle = 1.0 - step(0.49, r);

     float edgeAnti = outerCircle - smoothstep(anglePercentage - delta, anglePercentage + delta, r);

     segmentColor = mix(segmentColor, stroke_color, float(isOnBorder));
     segmentColor = mix(segmentColor, stroke_color, smoothstep(test - delta, test + delta, r));
     segmentColor = vec4(segmentColor.x, segmentColor.y, segmentColor.z, segmentColor.w * outerCircle);
     segmentColor = vec4(segmentColor.x, segmentColor.y, segmentColor.z, segmentColor.w * innerCicle);

     glFragColor =  segmentColor;

 }
