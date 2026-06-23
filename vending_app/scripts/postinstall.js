const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create the output directory if it doesn't exist
const outputDir = path.join(__dirname, '..', 'node_modules', '.cache', 'nativewind');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Run tailwindcss
try {
    const inputFile = path.join(__dirname, '..', 'global.css');
    const outputFile = path.join(outputDir, 'global.css');

    if (!fs.existsSync(inputFile)) {
        console.warn(`Warning: ${inputFile} not found. Skipping tailwindcss processing.`);
        process.exit(0);
    }

    execSync(`npx tailwindcss -i ${inputFile} -o ${outputFile}`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    console.log('✓ Tailwind CSS processed successfully');
} catch (error) {
    console.error('Error processing Tailwind CSS:', error.message);
    process.exit(1);
}

// Run patch-package
try {
    execSync('npx patch-package', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
    console.log('✓ Patch-package completed successfully');
} catch (error) {
    // Check if there are any patch files
    const patchesDir = path.join(__dirname, '..', 'patches');
    if (fs.existsSync(patchesDir)) {
        const patchFiles = fs.readdirSync(patchesDir).filter(f => f.endsWith('.patch'));
        if (patchFiles.length > 0) {
            console.error('\n⚠️  Patch-package failed to apply some patches.');
            console.error('This might be because:');
            console.error('  1. The package version has changed since the patch was created');
            console.error('  2. The patch is no longer needed');
            console.error('\nTo fix this:');
            console.error('  - If the patch is no longer needed, delete it from the patches/ directory');
            console.error('  - If the patch is still needed, regenerate it with: patch-package <package-name>');
            console.error('\n⚠️  Continuing build, but some patches may not be applied.\n');
            // Don't fail the build - let the developer decide if patches are critical
        }
    }
}
