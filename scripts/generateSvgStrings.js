const fs = require('node:fs');
const path = require('node:path');

const floorPlansDir = path.join(process.cwd(), 'src', 'floor_plans');
const outputFilePath = path.join(floorPlansDir, 'svgStrings.js');

const svgFilesList = [
  've1.svg',
  've2.svg',
  'hall8.svg',
  'hall9.svg',
  'H1.svg',
  'H2.svg',
  'CC1.svg',
];

const svgs = {};

svgFilesList.forEach((filename) => {
  const filePath = path.join(floorPlansDir, filename);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Remove XML declarations
    content = content.replaceAll(/<\?xml.*?\?>/g, '');
    content = content.replaceAll(/<!--[\s\S]*?-->/g, '');
    
    const key = filename.replace('.svg', '');
    svgs[key] = content.trim();
  } else {
    console.warn(`File not found: ${filePath}`);
  }
});

const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Extracts SVG content from the floor_plans directory so react-native-svg can render them.

export const SVG_STRINGS = ${JSON.stringify(svgs, null, 2)};
`;

fs.writeFileSync(outputFilePath, fileContent, 'utf-8');
console.log(`Successfully wrote SVG strings to ${outputFilePath}`);
