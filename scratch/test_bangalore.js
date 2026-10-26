const fs = require('fs');
function lat2tile(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)); }
function lon2tile(lon, zoom) { return Math.floor((lon+180)/360*Math.pow(2,zoom)); }
const z = 15;
const x = lon2tile(77.5946, z);
const y = lat2tile(12.9716, z);
console.log('Bangalore tile coordinates at z=15:', z, x, y);

const url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/' + z + '/' + y + '/' + x;
fetch(url).then(async r => {
  console.log('Status:', r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync('scratch/bangalore_dark.jpg', buf);
  console.log('Saved bangalore_dark.jpg, size:', buf.length);
});
