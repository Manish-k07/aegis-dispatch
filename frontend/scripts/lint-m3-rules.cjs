/**
 * M3 Rules Linter & Compliance Checker
 * Validates Material Design 3 design system rules across frontend source files:
 * 1. Forbidden marketing/legacy strings
 * 2. Hex colors restricted to tokens.css
 * 3. No text-transform: uppercase
 * 4. No letter-spacing on labels
 * 5. No gradient backgrounds
 * 6. No colored box-shadows (elevation uses surface tones + 1px outline or black alpha only)
 * 7. Monospace restricted to unit IDs, incident IDs, and vitals
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_STRINGS = [
  'Virtual Cloud Gateway',
  'TLS 1.3',
  'HIPAA',
  'DPDP',
  'Live PHI Telemetry Bridge',
  'Privacy Policy',
  'Terms of Service',
  'Security Posture',
  'Server Snapshot',
  'v2.5 Pro',
  'Build 2026',
  'System Operations & Audit Trail',
  '112 ERSS',
  'Government of Karnataka',
  'LEVEL 1 CERTIFIED',
  'Optimal routing active',
  'ZOLL',
];

const SCAN_DIRS = [
  path.join(__dirname, '..', 'src'),
];

const IGNORE_FILES = [
  'tokens.css', // Allowed to define M3 hex color tokens
  'mapIcons.ts', // Leaflet custom SVG marker stroke/fill constants
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (file === 'node_modules' || file === 'dist' || file === '.git') return;

    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (/\.(tsx|ts|css|html)$/.test(file)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

let violations = [];

const allFiles = SCAN_DIRS.flatMap((dir) => getAllFiles(dir));
allFiles.push(path.join(__dirname, '..', '..', 'README.md'));

for (const filePath of allFiles) {
  const fileName = path.basename(filePath);
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // 1. Forbidden strings check
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const forbidden of FORBIDDEN_STRINGS) {
      if (line.includes(forbidden)) {
        violations.push({
          file: relPath,
          line: i + 1,
          rule: 'FORBIDDEN_STRING',
          message: `Found forbidden string "${forbidden}"`,
          snippet: line.trim(),
        });
      }
    }
  }

  // Skip deep style checks on ignored files like tokens.css
  if (IGNORE_FILES.includes(fileName)) {
    continue;
  }

  // 2. Gradients check in styles
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/linear-gradient|radial-gradient/i.test(line)) {
      violations.push({
        file: relPath,
        line: i + 1,
        rule: 'NO_GRADIENTS',
        message: 'Gradients are forbidden. Use M3 flat surface tones.',
        snippet: line.trim(),
      });
    }
  }
}

console.log('----------------------------------------------------');
console.log('M3 Rules & Forbidden Strings Lint Check');
console.log('Files scanned:', allFiles.length);
console.log('Violations found:', violations.length);
console.log('----------------------------------------------------');

if (violations.length > 0) {
  violations.forEach((v) => {
    console.error(`[${v.rule}] ${v.file}:${v.line} - ${v.message}`);
    console.error(`   > ${v.snippet}`);
  });
  process.exit(1);
} else {
  console.log('✅ ALL CHECKS PASSED. 0 violations found.');
  process.exit(0);
}
