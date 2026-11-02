'use strict';
// Lightweight sanity check for infra/template.json (no AWS access needed).
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'infra', 'template.json');
const t = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const resources = t.Resources || {};
const names = new Set(Object.keys(resources));
const params = new Set(Object.keys(t.Parameters || {}));
const pseudo = new Set(['AWS::StackName', 'AWS::AccountId', 'AWS::Partition', 'AWS::Region']);
for (const r of ['SiteBucket', 'OriginAccessControl', 'Distribution', 'SiteBucketPolicy']) {
  if (!names.has(r)) errors.push(`missing resource ${r}`);
}
(function walk(node, where) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${where}[${i}]`));
  if (!node || typeof node !== 'object') return;
  if ('Ref' in node && !names.has(node.Ref) && !params.has(node.Ref) && !pseudo.has(node.Ref)) {
    errors.push(`${where}: unknown Ref ${node.Ref}`);
  }
  if ('Fn::GetAtt' in node && !names.has(node['Fn::GetAtt'][0])) {
    errors.push(`${where}: unknown GetAtt ${node['Fn::GetAtt'][0]}`);
  }
  if ('Fn::Sub' in node && typeof node['Fn::Sub'] === 'string') {
    for (const m of node['Fn::Sub'].matchAll(/\$\{([^}.]+)(\.[^}]+)?\}/g)) {
      if (!names.has(m[1]) && !params.has(m[1]) && !pseudo.has(m[1])) errors.push(`${where}: unknown Sub var ${m[1]}`);
    }
  }
  for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
})(t, 'template');
const pab = resources.SiteBucket?.Properties?.PublicAccessBlockConfiguration || {};
if (!Object.values(pab).every(Boolean) || Object.keys(pab).length !== 4) errors.push('bucket must block all public access');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('template.json OK');
