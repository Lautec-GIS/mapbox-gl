#!/bin/bash

# WindGIS deployment script
set -e

WINDGIS_VERSION=${1:-$(date +%Y%m%d%H%M%S)}
ORG_NAME="Lautec-GIS"  # Replace with your actual org name

echo "🚀 Starting WindGIS deployment v$WINDGIS_VERSION"

# Run WindGIS build
echo "📦 Building WindGIS package..."
npm run windgis-build

# Create WindGIS package.json
echo "📝 Creating WindGIS package configuration..."
cat > windgis-package.json << EOF
{
  "name": "@$ORG_NAME/mapbox-gl",
  "version": "$WINDGIS_VERSION",
  "description": "WindGIS version of Mapbox GL JS",
  "main": "dist/mapbox-gl.js",
  "types": "dist/mapbox-gl.d.ts",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "@$ORG_NAME:registry": "https://npm.pkg.github.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/$ORG_NAME/$(basename $(git rev-parse --show-toplevel)).git"
  },
  "keywords": ["windgis", "mapbox", "gl", "maps"],
  "license": "BSD-3-Clause",
  "files": [
    "dist/",
    "build/",
    "README.md"
  ]
}
EOF

echo "📤 Publishing WindGIS package to GitHub Packages..."
npm publish windgis-package.json --registry=https://npm.pkg.github.com

echo "✅ WindGIS deployment completed successfully!"
echo "📦 Package: @$ORG_NAME/windgis-mapbox-gl@$WINDGIS_VERSION"

# Clean up
rm windgis-package.json
