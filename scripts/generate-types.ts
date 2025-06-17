import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TypesConfig {
    packageName: string;
    outDir: string;
    typesDir: string;
    sourceDirs: string[];
}

const config: TypesConfig = {
    packageName: '@lautec-gis/mapbox-gl',
    outDir: 'dist',
    typesDir: 'dist/types',
    sourceDirs: ['src', '3d-style']
};

function generateAdvancedTypes(): void {
    console.log('🔧 Generating TypeScript declarations from src and 3d-style folders...');

    // Verify source folders exist
    for (const sourceDir of config.sourceDirs) {
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source directory '${sourceDir}' not found`);
        }
    }

    try {
        // Clean previous builds
        cleanPreviousBuild();

        // Analyze source folders structure
        analyzeSourceStructure();

        // Generate types from all source folders
        generateFromSources();

        // Verify generation
        const success = verifyGeneration();

        if (!success) {
            throw new Error('Failed to generate any declaration files from source folders');
        }

        // Fix import paths in generated declaration files
        fixImportPaths();

        // Create main declaration file that exports from types
        createMainDeclarationFile();

        console.log('✅ TypeScript declarations generated with duplicate resolution');

    } catch (error) {
        console.error('❌ Error generating types:', (error as Error).message);
        process.exit(1);
    }
}

function cleanPreviousBuild(): void {
    console.log('🧹 Cleaning previous build artifacts...');

    if (fs.existsSync(config.typesDir)) {
        fs.rmSync(config.typesDir, { recursive: true, force: true });
    }

    const existingDts = path.join(config.outDir, 'mapbox-gl.d.ts');
    if (fs.existsSync(existingDts)) {
        fs.unlinkSync(existingDts);
    }
}

function analyzeSourceStructure(): void {
    console.log('📁 Analyzing source folders structure...');

    let totalTsFiles = 0;
    let totalJsonFiles = 0;

    for (const sourceDir of config.sourceDirs) {
        const tsFiles = findTSFiles(sourceDir);
        const jsonFiles = findJsonFiles(sourceDir);

        console.log(`📁 ${sourceDir}/:`);
        console.log(`  📄 ${tsFiles.length} TypeScript files`);
        console.log(`  📄 ${jsonFiles.length} JSON files`);

        totalTsFiles += tsFiles.length;
        totalJsonFiles += jsonFiles.length;

        // Show sample files for each directory
        if (tsFiles.length > 0) {
            console.log(`  📄 Sample TS files:`, tsFiles.slice(0, 3).map(f => path.relative(sourceDir, f)));
        }
    }

    console.log(`📊 Total: ${totalTsFiles} TypeScript files, ${totalJsonFiles} JSON files`);

    if (totalTsFiles === 0) {
        throw new Error('No TypeScript files found in any source folders');
    }

    // Find entry points
    const entryPoints = findEntryPoints();
    console.log('📍 Entry points found:', entryPoints);
}

function generateFromSources(): void {
    console.log('🔨 Generating types from source folders...');

    // Create output directory
    if (!fs.existsSync(config.typesDir)) {
        fs.mkdirSync(config.typesDir, { recursive: true });
    }

    // Create temporary type declarations for JSON files in all source dirs
    const allJsonFiles = getAllJsonFiles();
    const tempDeclarations = createTempJsonDeclarations(allJsonFiles);

    try {
        // Use only the custom config strategy
        console.log('🔨 Using custom config compilation strategy...');
        compileWithCustomConfig();

        if (!hasGeneratedDeclarations()) {
            throw new Error('Custom config compilation failed to generate declarations from source folders');
        }

        console.log('✅ Custom config strategy succeeded');

    } finally {
        // Clean up temporary declarations
        cleanupTempDeclarations(tempDeclarations);
    }
}

function getAllTSFiles(): string[] {
    const allFiles: string[] = [];

    for (const sourceDir of config.sourceDirs) {
        const files = findTSFiles(sourceDir);
        allFiles.push(...files);
    }

    return allFiles;
}

function getAllJsonFiles(): string[] {
    const allFiles: string[] = [];

    for (const sourceDir of config.sourceDirs) {
        const files = findJsonFiles(sourceDir);
        allFiles.push(...files);
    }

    return allFiles;
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

        if (stat.isDirectory()) {
            files.push(...findTSFiles(fullPath));
        } else if (
            (item.endsWith('.ts') || item.endsWith('.tsx')) &&
            !item.endsWith('.d.ts') &&
            !item.includes('.test.') &&
            !item.includes('.spec.')
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

function findJsonFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...findJsonFiles(fullPath));
        } else if (item.endsWith('.json')) {
            files.push(fullPath);
        }
    }

    return files;
}

function findEntryPoints(): string[] {
    const entryPoints: string[] = [];

    for (const sourceDir of config.sourceDirs) {
        const priorities = [
            path.join(sourceDir, 'index.ts'),
            path.join(sourceDir, 'main.ts'),
            path.join(sourceDir, 'app.ts')
        ];

        for (const priority of priorities) {
            if (fs.existsSync(priority)) {
                entryPoints.push(priority);
                break;
            }
        }

        // If no standard entry point, find first TS file in this directory
        if (entryPoints.length === 0 || !entryPoints.some(ep => ep.startsWith(sourceDir))) {
            const tsFiles = findTSFiles(sourceDir);
            if (tsFiles.length > 0) {
                entryPoints.push(tsFiles[0]);
            }
        }
    }

    return entryPoints;
}

function createTempJsonDeclarations(jsonFiles: string[]): string[] {
    if (jsonFiles.length === 0) {
        return [];
    }

    console.log('📄 Creating temporary declarations for JSON files...');

    const tempFiles: string[] = [];

    for (const jsonFile of jsonFiles) {
        const dtsFile = jsonFile + '.d.ts';
        const content = `declare const value: any;\nexport default value;\n`;

        fs.writeFileSync(dtsFile, content);
        tempFiles.push(dtsFile);
    }

    console.log(`✅ Created ${tempFiles.length} temporary JSON declarations`);
    return tempFiles;
}

function cleanupTempDeclarations(tempFiles: string[]): void {
    if (tempFiles.length === 0) {
        return;
    }

    console.log('🧹 Cleaning up temporary JSON declarations...');

    for (const tempFile of tempFiles) {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

function compileWithCustomConfig(): void {
    console.log('🔨 Running compilation with custom config (error-tolerant)...');

    const customConfig = {
        compilerOptions: {
            declaration: true,
            emitDeclarationOnly: true,
            outDir: config.typesDir,
            target: "es2020",
            module: "esnext",
            moduleResolution: "node",
            lib: ["es2020", "dom"],
            skipLibCheck: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            resolveJsonModule: true,
            allowJs: true,
            checkJs: false,
            strict: false,
            noImplicitAny: false,
            noEmitOnError: false,
            suppressImplicitAnyIndexErrors: true,
            // Additional error suppression flags
            noImplicitReturns: false,
            noImplicitThis: false,
            noUnusedLocals: false,
            noUnusedParameters: false,
            exactOptionalPropertyTypes: false,
            noImplicitOverride: false,
            noPropertyAccessFromIndexSignature: false,
            noUncheckedIndexedAccess: false,
            // Allow unreachable code
            allowUnreachableCode: true,
            allowUnusedLabels: true,
            // Ignore missing imports
            ignoreDeprecations: true
        },
        include: config.sourceDirs.map(dir => `${dir}/**/*`),
        exclude: ["node_modules", "**/*.test.*", "**/*.spec.*"],
        // Continue on error
        compileOnSave: false
    };

    const tempConfigPath = 'tsconfig.sources.json';
    fs.writeFileSync(tempConfigPath, JSON.stringify(customConfig, null, 2));

    try {
        console.log('🔨 Running TypeScript compilation with error tolerance...');

        // Use spawn to capture output and continue even with errors
        try {
            execSync(`npx tsc -p ${tempConfigPath}`, {
                stdio: 'pipe',
                encoding: 'utf8'
            });
        } catch (error: any) {
            // Log the error but continue if some files were generated
            console.warn('⚠️  TypeScript compilation had errors, but continuing...');
            console.warn('Compilation output:', error.stdout || error.message);

            // Check if any declaration files were generated despite errors
            if (hasGeneratedDeclarations()) {
                console.log('✅ Some declaration files were generated despite errors');
            } else {
                throw error; // Re-throw if no files were generated
            }
        }

    } finally {
        if (fs.existsSync(tempConfigPath)) {
            fs.unlinkSync(tempConfigPath);
        }
    }
}

function hasGeneratedDeclarations(): boolean {
    if (!fs.existsSync(config.typesDir)) {
        return false;
    }

    const dtsFiles: string[] = [];
    findDTSFiles(config.typesDir, dtsFiles);

    console.log(`📄 Found ${dtsFiles.length} declaration files (recursive search)`);
    return dtsFiles.length > 0;
}

function verifyGeneration(): boolean {
    console.log('🔍 Verifying type generation...');

    if (!fs.existsSync(config.typesDir)) {
        console.error('❌ Types directory was not created');
        return false;
    }

    const items = fs.readdirSync(config.typesDir);
    console.log('📁 Types directory contents:', items);

    // Check for .d.ts files recursively, not just in root
    const dtsFiles: string[] = [];
    findDTSFiles(config.typesDir, dtsFiles);

    console.log('📄 Total declaration files found (recursive):', dtsFiles.length);

    if (dtsFiles.length === 0) {
        console.error('❌ No .d.ts files generated from source folders');
        return false;
    }

    // Show sample files for verification
    console.log('📄 Sample declaration files:');
    dtsFiles.slice(0, 5).forEach(file => {
        const relativePath = path.relative(config.typesDir, file);
        console.log(`  - ${relativePath}`);
    });

    console.log('✅ Successfully generated declaration files from sources');
    return true;
}

function fixImportPaths(): void {
    console.log('🔧 Cleaning up declaration files...');

    const dtsFiles: string[] = [];
    findDTSFiles(config.typesDir, dtsFiles);

    let processedFiles = 0;

    for (const file of dtsFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const cleanedContent = cleanDeclarationFile(content);

        if (content !== cleanedContent) {
            fs.writeFileSync(file, cleanedContent);
            processedFiles++;
        }
    }

    console.log(`✅ Cleaned ${processedFiles} declaration files`);
}

function cleanDeclarationFile(content: string): string {
    const lines = content.split('\n');
    const cleanedLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Remove all comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue;
        }

        // Process imports/exports
        if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
            // Keep third-party imports, remove internal re-exports
            if (trimmed.startsWith('export ') && trimmed.includes(' from ') &&
                (trimmed.includes('./') || trimmed.includes('../'))) {
                continue; // Skip internal re-exports
            }

            // Clean up import/export lines and remove .ts extensions
            let cleanedLine = removeInlineComments(line);
            cleanedLine = cleanedLine.replace(/(['"][^'"]*?)\.ts(['"])/g, '$1$2');
            cleanedLines.push(cleanedLine);
        } else {
            // Clean other lines
            let cleanedLine = removeInlineComments(line);

            // Remove declare and export keywords for non-import lines
            cleanedLine = cleanedLine
                .replace(/^(\s*)declare\s+/, '$1')
                .replace(/^(\s*)export\s+/, '$1');

            if (cleanedLine.trim()) {
                cleanedLines.push(cleanedLine);
            }
        }
    }

    return cleanedLines.join('\n');
}

function removeInlineComments(line: string): string {
    // Remove inline comments (// comments)
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
        // Make sure it's not inside a string
        const beforeComment = line.substring(0, commentIndex);
        const singleQuotes = (beforeComment.match(/'/g) || []).length;
        const doubleQuotes = (beforeComment.match(/"/g) || []).length;

        // If quotes are balanced, it's a real comment
        if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
            line = beforeComment.trimEnd();
        }
    }

    // Remove /* */ style comments (simple case)
    line = line.replace(/\/\*.*?\*\//g, '');

    return line;
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

function createMainDeclarationFile(): void {
    console.log('📝 Creating main declaration file with duplicate resolution...');

    const mainDtsPath = path.join(config.outDir, 'mapbox-gl.d.ts');

    // Find all declaration files to export
    const dtsFiles: string[] = [];
    findDTSFiles(config.typesDir, dtsFiles);

    // Analyze exports and detect conflicts
    const exportAnalysis = analyzeExports(dtsFiles);

    // Create selective exports to avoid conflicts
    const selectiveExports = createSelectiveExports(dtsFiles, exportAnalysis);

    // Find main entry points for default exports
    const mainEntries = findMainEntries(dtsFiles);

    const moduleDeclaration = `// Type definitions for ${config.packageName}
// Generated on: ${new Date().toISOString()}
// Duplicate identifier resolution applied

declare module '${config.packageName}' {
${selectiveExports.map(exp => '  ' + exp).join('\n')}

${mainEntries.length > 0 ? `  // Main exports\n${mainEntries.map(entry => '  ' + entry).join('\n')}` : ''}
}

// Also export as submodule for compatibility
declare module '${config.packageName}/mapbox-gl' {
${selectiveExports.map(exp => '  ' + exp).join('\n')}

${mainEntries.length > 0 ? `  // Main exports\n${mainEntries.map(entry => '  ' + entry).join('\n')}` : ''}
}

// Selective re-exports to avoid conflicts
${selectiveExports.join('\n')}
`;

    fs.writeFileSync(mainDtsPath, moduleDeclaration);

    const stats = fs.statSync(mainDtsPath);
    console.log(`✅ Created main declaration file with duplicate resolution`);
    console.log(`📊 Main declaration file:`);
    console.log(`  - Size: ${Math.round(stats.size / 1024)}KB`);
    console.log(`  - Selective exports: ${selectiveExports.length}`);
    console.log(`  - Main entries: ${mainEntries.length}`);
    console.log(`  - Conflicts resolved: ${exportAnalysis.conflicts.size}`);
    console.log(`  - Files excluded: ${exportAnalysis.excludedFiles.size}`);
    console.log(`📦 Package available as: ${config.packageName}`);
}

interface ExportAnalysis {
    exports: Map<string, string[]>; // export name -> files that export it
    allIdentifiers: Map<string, string[]>; // all identifiers -> files that declare them
    conflicts: Set<string>; // names that have conflicts
    priorityFiles: string[]; // files that should take priority
    excludedFiles: Set<string>; // files excluded due to duplicates
}

function analyzeExports(dtsFiles: string[]): ExportAnalysis {
    console.log('🔍 Analyzing exports and identifiers for conflicts...');

    const exports = new Map<string, string[]>();
    const allIdentifiers = new Map<string, string[]>(); // All identifiers (exported and non-exported)
    const conflicts = new Set<string>();
    const priorityFiles: string[] = [];
    const excludedFiles = new Set<string>();

    // Define priority order (main files should take precedence)
    const priorityPatterns = [
        /\/index\.d\.ts$/,
        /\/main\.d\.ts$/,
        /\/mapbox-gl\.d\.ts$/,
        /^src\//,  // src files over 3d-style
        /^[^\/]+\.d\.ts$/ // root level files
    ];

    for (const file of dtsFiles) {
        const relativePath = path.relative(config.typesDir, file);

        // Check if this is a priority file
        if (priorityPatterns.some(pattern => pattern.test(relativePath))) {
            priorityFiles.push(file);
        }

        // Extract exports from the file
        const fileExports = extractExportsFromFile(file);

        // Extract ALL identifiers from the file (for duplicate detection)
        const fileIdentifiers = extractAllIdentifiersFromFile(file);

        // Track exports
        for (const exportName of fileExports) {
            if (!exports.has(exportName)) {
                exports.set(exportName, []);
            }
            exports.get(exportName)!.push(file);

            // Mark as conflict if exported by multiple files
            if (exports.get(exportName)!.length > 1) {
                conflicts.add(exportName);
            }
        }

        // Track all identifiers (for duplicate detection)
        for (const identifier of fileIdentifiers) {
            if (!allIdentifiers.has(identifier)) {
                allIdentifiers.set(identifier, []);
            }
            allIdentifiers.get(identifier)!.push(file);

            // Mark as conflict if declared in multiple files
            if (allIdentifiers.get(identifier)!.length > 1) {
                conflicts.add(identifier);
            }
        }
    }

    // Identify files to exclude due to duplicate identifiers
    for (const [identifier, files] of allIdentifiers) {
        if (files.length > 1) {
            // Sort files by priority
            const sortedFiles = [...files].sort((a, b) => {
                const aIsMain = priorityFiles.includes(a);
                const bIsMain = priorityFiles.includes(b);

                if (aIsMain && !bIsMain) return -1;
                if (!aIsMain && bIsMain) return 1;

                const aRelative = path.relative(config.typesDir, a);
                const bRelative = path.relative(config.typesDir, b);

                const aDepth = aRelative.split(path.sep).length;
                const bDepth = bRelative.split(path.sep).length;

                if (aDepth !== bDepth) return aDepth - bDepth;

                const aIsSrc = aRelative.startsWith('src/');
                const bIsSrc = bRelative.startsWith('src/');

                if (aIsSrc && !bIsSrc) return -1;
                if (!aIsSrc && bIsSrc) return 1;

                return aRelative.localeCompare(bRelative);
            });

            // Keep only the first (highest priority) file, exclude others
            for (let i = 1; i < sortedFiles.length; i++) {
                excludedFiles.add(sortedFiles[i]);
                console.log(`⚠️  Excluding ${path.relative(config.typesDir, sortedFiles[i])} due to duplicate identifier: ${identifier}`);
            }
        }
    }

    console.log(`📊 Analysis: ${exports.size} exports, ${allIdentifiers.size} identifiers, ${conflicts.size} conflicts, ${excludedFiles.size} excluded`);

    return { exports, allIdentifiers, conflicts, priorityFiles, excludedFiles };
}

function extractExportsFromFile(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports: string[] = [];

    // Simple regex to find export statements
    const exportRegex = /^export\s+(?:declare\s+)?(?:interface|type|class|enum|function|const|let|var)\s+(\w+)/gm;
    const namedExportRegex = /^export\s*\{\s*([^}]+)\s*\}/gm;

    let match;

    // Find direct exports
    while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
    }

    // Find named exports
    while ((match = namedExportRegex.exec(content)) !== null) {
        const namedExports = match[1].split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim());
        exports.push(...namedExports);
    }

    return exports;
}

function extractAllIdentifiersFromFile(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const identifiers: string[] = [];

    // Find all top-level declarations (exported and non-exported)
    const declarationRegex = /^(?:export\s+)?(?:declare\s+)?(interface|type|class|enum|function|const|let|var)\s+(\w+)/gm;

    let match;
    while ((match = declarationRegex.exec(content)) !== null) {
        identifiers.push(match[2]);
    }

    return identifiers;
}

function createSelectiveExports(dtsFiles: string[], analysis: ExportAnalysis): string[] {
    const selectiveExports: string[] = [];
    const processedPaths = new Set<string>();

    // Filter out excluded files
    const validFiles = dtsFiles.filter(file => !analysis.excludedFiles.has(file));

    // Sort remaining files by priority
    const sortedFiles = validFiles.sort((a, b) => {
        const aRelative = path.relative(config.typesDir, a);
        const bRelative = path.relative(config.typesDir, b);

        // Prioritize main files
        const aIsMain = analysis.priorityFiles.includes(a);
        const bIsMain = analysis.priorityFiles.includes(b);

        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;

        // Prioritize less nested files
        const aDepth = aRelative.split(path.sep).length;
        const bDepth = bRelative.split(path.sep).length;

        if (aDepth !== bDepth) return aDepth - bDepth;

        // Prioritize src over 3d-style
        const aIsSrc = aRelative.startsWith('src/');
        const bIsSrc = bRelative.startsWith('src/');

        if (aIsSrc && !bIsSrc) return -1;
        if (!aIsSrc && bIsSrc) return 1;

        return aRelative.localeCompare(bRelative);
    });

    for (const file of sortedFiles) {
        const relativePath = path.relative(config.typesDir, file);
        const exportPath = './types/' + relativePath.replace(/\\/g, '/').replace(/\.d\.ts$/, '');

        // Skip if we've already processed this path
        if (processedPaths.has(exportPath)) {
            continue;
        }

        // Skip deeply nested files (likely internal)
        const pathParts = relativePath.split(path.sep);
        if (pathParts.length > 5) {
            continue;
        }

        // Check if this file has conflicting exports (but not duplicate identifiers since we excluded those)
        const fileExports = extractExportsFromFile(file);
        const hasExportConflicts = fileExports.some(exp => {
            const conflictingFiles = analysis.exports.get(exp) || [];
            return conflictingFiles.length > 1 && conflictingFiles[0] !== file;
        });

        if (hasExportConflicts) {
            // Use explicit named exports for files with export conflicts
            const safeExports = fileExports.filter(exp => {
                const conflictingFiles = analysis.exports.get(exp) || [];
                // Only include if this is the first (priority) file for this export
                return conflictingFiles[0] === file;
            });

            if (safeExports.length > 0) {
                selectiveExports.push(`export { ${safeExports.join(', ')} } from '${exportPath}';`);
            }
        } else {
            // Use wildcard export for files without conflicts
            selectiveExports.push(`export * from '${exportPath}';`);
        }

        processedPaths.add(exportPath);
    }

    console.log(`📊 Final exports: ${selectiveExports.length} files included, ${analysis.excludedFiles.size} files excluded`);

    return selectiveExports;
}

function findMainEntries(dtsFiles: string[]): string[] {
    const mainEntries: string[] = [];

    // Look for main index files
    const indexFiles = dtsFiles.filter(file => {
        const relativePath = path.relative(config.typesDir, file);
        const fileName = path.basename(relativePath, '.d.ts');
        return fileName === 'index' || fileName === 'main' || fileName === 'mapbox-gl';
    });

    // Sort by depth (prefer less nested files)
    indexFiles.sort((a, b) => {
        const depthA = path.relative(config.typesDir, a).split(path.sep).length;
        const depthB = path.relative(config.typesDir, b).split(path.sep).length;
        return depthA - depthB;
    });

    // Use the first (least nested) main file
    if (indexFiles.length > 0) {
        const mainFile = indexFiles[0];
        const relativePath = path.relative(config.typesDir, mainFile);
        const exportPath = './types/' + relativePath.replace(/\\/g, '/').replace(/\.d\.ts$/, '');

        mainEntries.push(`import mapboxgl from '${exportPath}';`);
        mainEntries.push(`export default mapboxgl;`);
    }

    return mainEntries;
}

// Run the generator
generateAdvancedTypes();
