const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = pkg.version;

const distPath = path.join(__dirname, 'dist');
const archivePath = path.join(distPath, 'old-versions');

if (!fs.existsSync(distPath)) {
  console.log('[Archive] No dist folder found. Skipping archive step.');
  process.exit(0);
}

if (!fs.existsSync(archivePath)) {
  fs.mkdirSync(archivePath, { recursive: true });
}

const files = fs.readdirSync(distPath);

let archivedCount = 0;

files.forEach(file => {
  const filePath = path.join(distPath, file);
  
  // Skip directories
  if (fs.statSync(filePath).isDirectory()) {
    return;
  }
  
  // Check if file name contains a version tag (e.g. 1.0.0) that is different from currentVersion
  // We match standard semver patterns like 1.0.0
  const versionRegex = /\b\d+\.\d+\.\d+\b/;
  const match = file.match(versionRegex);
  
  if (match) {
    const fileVersion = match[0];
    if (fileVersion !== currentVersion) {
      const destPath = path.join(archivePath, file);
      try {
        fs.renameSync(filePath, destPath);
        console.log(`[Archive] Moved old version file to archive: ${file} -> old-versions/${file}`);
        archivedCount++;
      } catch (err) {
        console.error(`[Archive] Failed to move file ${file}:`, err);
      }
    }
  }
});

console.log(`[Archive] Completed. Archived ${archivedCount} old version files.`);
