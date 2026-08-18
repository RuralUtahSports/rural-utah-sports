import fs from 'node:fs';

const core=fs.readFileSync('school-assets-core.js','utf8').trim();
const wrapper=fs.readFileSync('school-assets.js','utf8');
const marker='  const A=window.RUSSchoolAssets;';
const start=wrapper.indexOf(marker),end=wrapper.lastIndexOf('})();');
if(start<0||end<=start)throw new Error('Could not find school asset override block');
const overrides=wrapper.slice(start,end).trim();
const bundle=`${core}\n(()=>{\n  const here=document.currentScript?.src||location.href;\n${overrides}\n})();\n`;
fs.writeFileSync('school-assets-bundle.js',bundle);
console.log(`Built school-assets-bundle.js (${Buffer.byteLength(bundle).toLocaleString()} bytes)`);
