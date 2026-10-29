const fs = require('fs');
const path = require('path');

const dcPath = path.resolve(__dirname, '../backend/src/main/java/com/aegisdispatch/controller/DispatchController.java');
let dc = fs.readFileSync(dcPath, 'utf8');

const target = 'Map.of("id", "SIG-103", "name", "Koramangala 80ft Intermediate Light", "state", "STANDBY", "countdownS", 90)';
const idx = dc.indexOf(target);
if (idx !== -1) {
  const cleanEnd = target + '\n                )\n        ));\n    }\n\n}\n';
  dc = dc.substring(0, idx) + cleanEnd;
  fs.writeFileSync(dcPath, dc, 'utf8');
  console.log('[OK] Cleaned up DispatchController.java to end after getV2xCorridor.');
}
