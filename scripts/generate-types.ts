import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TypesConfig {
    packageName: string;
    outDir: string;
    typesDir: string;
}

const config: TypesConfig = {
    packageName: '@lautec-gis/mapbox-gl',
    outDir: 'dist',
    typesDir: 'dist/types'
};

function generateAdvancedTypes(): void {
    console.log('🔧 Generating TypeScript declarations with advanced options...');

    try {
        // Check if project has tsconfig.json
        const hasTsConfig = fs.existsSync('tsconfig.json');

        if (hasTsConfig) {
            console.log('📍 Using existing tsconfig.json');
            generateWithTsConfig();
        } else {
            console.log('📍 No tsconfig.json found, using manual configuration');
            generateManually();
        }

        // Bundle all declarations into a single file if needed
        bundleDeclarations();

        // Create package-specific module declaration
        createPackageDeclaration();

        console.log('✅ Advanced TypeScript declarations generated');

    } catch (error) {
        console.error('❌ Error generating types:', (error as Error).message);
        process.exit(1);
    }
}

function generateWithTsConfig(): void {
    try {
        // Generate using existing tsconfig but override for declaration only
        execSync('npx tsc --declaration --emitDeclarationOnly --outDir dist/types', {
            stdio: 'inherit'
        });
    } catch (error) {
        console.warn('⚠️  Failed with tsconfig.json, trying manual approach...');
        generateManually();
    }
}

function generateManually(): void {
    // Find TypeScript files
    const srcDir = 'src';
    const tsFiles = findTSFiles(srcDir);

    if (tsFiles.length === 0) {
        throw new Error('No TypeScript files found in src directory');
    }

    console.log(`📍 Found ${tsFiles.length} TypeScript files`);

    // Find entry point
    const entryPoint = findEntryPoint(tsFiles);
    console.log(`📍 Using entry point: ${entryPoint}`);

    // Generate declarations
    const tscCommand = [
        'npx tsc',
        '--declaration',
        '--emitDeclarationOnly',
        `--outDir ${config.typesDir}`,
        '--rootDir src',
        '--moduleResolution node',
        '--target es2015',
        '--module commonjs',
        '--lib es2015,dom',
        '--skipLibCheck',
        '--allowSyntheticDefaultImports',
        '--esModuleInterop',
        entryPoint
    ].join(' ');

    execSync(tscCommand, { stdio: 'inherit' });
}

function findTSFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== 'node_modules' && !item.startsWith('.')) {
            files.push(...findTSFiles(fullPath));
        } else if (
            item.endsWith('.ts') &&
            !item.endsWith('.d.ts') &&
            !item.includes('.test.') &&
            !item.includes('.spec.')
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

function findEntryPoint(tsFiles: string[]): string {
    // Priority order for entry point
    const priorities = ['src/index.ts', 'src/main.ts', 'src/app.ts'];

    for (const priority of priorities) {
        if (tsFiles.includes(priority)) {
            return priority;
        }
    }

    // Return first .ts file if no standard entry point found
    if (tsFiles.length === 0) {
        throw new Error('No TypeScript entry point found');
    }

    return tsFiles[0];
}

function bundleDeclarations(): void {
    if (!fs.existsSync(config.typesDir)) {
        console.warn('⚠️  Types directory not found, skipping bundling');
        return;
    }

    // Find all .d.ts files
    const dtsFiles: string[] = [];
    findDTSFiles(config.typesDir, dtsFiles);

    if (dtsFiles.length === 0) {
        console.warn('⚠️  No declaration files found');
        return;
    }

    console.log(`📦 Bundling ${dtsFiles.length} declaration files...`);

    // Create bundled declaration file
    let bundledContent = generateFileHeader();

    // Sort files to ensure consistent order
    dtsFiles.sort();

    for (const file of dtsFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(config.typesDir, file);

        bundledContent += `\n// From ${relativePath}\n`;
        bundledContent += cleanDeclarationContent(content) + '\n';
    }

    const mainDtsPath = path.join(config.outDir, 'mapbox-gl.d.ts');
    fs.writeFileSync(mainDtsPath, bundledContent);
    console.log('✅ Bundled all declarations into mapbox-gl.d.ts');
}

function findDTSFiles(dir: string, files: string[]): void {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findDTSFiles(fullPath, files);
        } else if (item.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
}

function cleanDeclarationContent(content: string): string {
    // Remove import/export statements that might conflict
    return content
        .split('\n')
        .filter(line => {
            const trimmed = line.trim();
            // Keep most content, but filter out problematic imports
            return !trimmed.startsWith('import ') || trimmed.includes('import type');
        })
        .join('\n');
}

function generateFileHeader(): string {
    return `// Type definitions for WindGIS Mapbox GL JS
// Project: ${config.packageName}
// Generated on: ${new Date().toISOString()}

`;
}

function createPackageDeclaration(): void {
    const mainDtsPath = path.join(config.outDir, 'mapbox-gl.d.ts');

    if (!fs.existsSync(mainDtsPath)) {
        console.warn('⚠️  Main declaration file not found, creating basic one...');
        createBasicDeclaration();
        return;
    }

    let content = fs.readFileSync(mainDtsPath, 'utf8');

    // Add module declaration for the package
    const moduleDeclaration = `
// Package module declaration
declare module '${config.packageName}' {
  export * from '${config.packageName}/mapbox-gl';
  import mapboxgl from '${config.packageName}/mapbox-gl';
  export default mapboxgl;
}

// Namespace export
declare module '${config.packageName}/mapbox-gl' {
${content.replace(/^/gm, '  ')}
}
`;

    content = generateFileHeader() + content + moduleDeclaration;
    fs.writeFileSync(mainDtsPath, content);
    console.log(`✅ Added module declaration for ${config.packageName}`);
}

function createBasicDeclaration(): void {
    const basicDeclaration = `${generateFileHeader()}
declare module '${config.packageName}' {
  export = mapboxgl;
}

declare namespace mapboxgl {
  let accessToken: string;

  class Map {
    constructor(options: {
      container: string | HTMLElement;
      style?: string | any;
      center?: [number, number] | { lng: number; lat: number };
      zoom?: number;
      bearing?: number;
      pitch?: number;
      [key: string]: any;
    });

    on(type: string, listener: (e?: any) => void): this;
    off(type: string, listener: (e?: any) => void): this;
    once(type: string, listener: (e?: any) => void): this;

    addSource(id: string, source: any): this;
    removeSource(id: string): this;
    getSource(id: string): any;

    addLayer(layer: any, before?: string): this;
    removeLayer(id: string): this;
    getLayer(id: string): any;

    setStyle(style: string | any): this;
    getStyle(): any;

    // Add more methods as discovered from your TypeScript source
    [key: string]: any;
  }

  export { Map };
}
`;

    const mainDtsPath = path.join(config.outDir, 'mapbox-gl.d.ts');
    fs.writeFileSync(mainDtsPath, basicDeclaration);
    console.log('✅ Created basic declaration file');
}

// Run the generator
generateAdvancedTypes();
