import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
mkdirSync(new URL('vendor/',root),{recursive:true});
for(const file of ['three.module.js','three.core.js']) cpSync(new URL(`node_modules/three/build/${file}`,root),new URL(`vendor/${file}`,root));
cpSync(new URL('node_modules/three/LICENSE',root),new URL('vendor/THREE-LICENSE.txt',root));
console.log('Local 3D renderer prepared.');
