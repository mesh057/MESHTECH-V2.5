const fs = require('fs');
const path = require('path');

// Mock dependencies
global.gmd = () => {};
global.config = { AUTH_DIR: './session' };

const pluginsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} command files.`);

let success = 0;
let fail = 0;

files.forEach(file => {
    try {
        require(path.join(pluginsPath, file));
        success++;
    } catch (e) {
        console.error(`❌ Failed to load ${file}: ${e.message}`);
        fail++;
    }
});

console.log(`\nSummary:`);
console.log(`Total: ${files.length}`);
console.log(`Success: ${success}`);
console.log(`Fail: ${fail}`);

if (fail > 0) process.exit(1);
process.exit(0);
