const fs = require('fs');
const data = JSON.parse(fs.readFileSync('app.json', 'utf8'));
if (!data.expo.plugins.includes('expo-fmt-consteval-fix')) {
  data.expo.plugins.push('expo-fmt-consteval-fix');
}
fs.writeFileSync('app.json', JSON.stringify(data, null, 2) + '\n');
console.log('app.json updated');
