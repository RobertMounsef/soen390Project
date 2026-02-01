// Early setup file - runs before test framework is installed
// Patch the problematic React Native file before RNTL reads it
const fs = require('fs')
const path = require('path')

const viewConfigIgnorePath = path.join(
  __dirname,
  'node_modules',
  'react-native',
  'Libraries',
  'NativeComponent',
  'ViewConfigIgnore.js'
)

// Patch the file to remove Flow syntax that RNTL can't parse
if (fs.existsSync(viewConfigIgnorePath)) {
  try {
    let content = fs.readFileSync(viewConfigIgnorePath, 'utf8')
    
    // Replace the problematic Flow syntax with compatible syntax
    // Change: const T: {+[name: string]: true}
    // To: T: {+[name: string]: true} (remove 'const' keyword)
    const patchedContent = content.replace(
      /export function ConditionallyIgnoredEventHandlers<\s*const T: \{\+\[name: string\]: true\},\s*>/g,
      'export function ConditionallyIgnoredEventHandlers<\n  T: {+[name: string]: true},\n>'
    )
    
    if (patchedContent !== content) {
      fs.writeFileSync(viewConfigIgnorePath, patchedContent, 'utf8')
    }
  } catch (error) {
    // Silently fail if we can't patch - tests might still work
    console.warn('Could not patch ViewConfigIgnore.js:', error.message)
  }
}
