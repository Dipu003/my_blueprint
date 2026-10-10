#!/usr/bin/env node
// Installs a 3D model of the hero into the site, in place of the hero made from his picture (the full guide is
// docs/character-model.md).
//
//   npm run hero -- "C:\path\to\hero.glb"                      a GLB / glTF (Meshy, Tripo...): compressed for the web
//   npm run hero -- "C:\path\to\hero.fbx" talk="...\Talking.fbx" wave="...\Waving.fbx"
//                                                             an FBX (Mixamo) plus extra animations, by role
//   options: --glaive=hand|beside|none   --height=1.95   --turn=0   (degrees, if he does not face the camera)
//   npm run hero -- --remove                                   back to the hero made from his picture
//
// A GLB is compressed on the way in (meshopt geometry, WebP textures of at most 1024 px, with gltf-transform,
// fetched by npx the first time), so the site stays quick to load. Then public/models/hero.json is written, and
// the script prints what it found: the animations and the role each one will play, and the bones used for the
// look and the glaive.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'models');
const MANIFEST = path.join(OUT, 'hero.json');
// the description of the hero made from his picture: kept beside hero.json, so --remove can bring him back
const PICTURE = path.join(OUT, 'hero.relief.json');
const ROLES = ['idle', 'talk', 'wave', 'chest', 'explain', 'point', 'welcome'];
// keep these two tables in step with src/components/character/model.ts
const ROLE_NAMES = {
  idle: /idle|breath|stand/i,
  talk: /talk|speak|convers|explain/i,
  wave: /wav(e|ing)|hello|\bhi\b/i,
  chest: /chest|heart|bow|acknowledg|humble|thank/i,
  explain: /explain|talk|gesture|argu|telling/i,
  point: /point|thumbs|indicat/i,
  welcome: /welcome|greet|open|cheer|yes|agree/i,
};
const FALLBACK = {
  idle: [],
  talk: ['explain', 'idle'],
  wave: ['welcome', 'talk', 'idle'],
  chest: ['talk', 'idle'],
  explain: ['talk', 'idle'],
  point: ['explain', 'talk', 'idle'],
  welcome: ['wave', 'talk', 'idle'],
};

const say = (s = '') => console.log(s);
const fail = (s) => {
  console.error('\n  ✖ ' + s + '\n');
  process.exit(1);
};
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

/* ------------------------------------------------------------------ arguments */

const args = process.argv.slice(2);
const isAnim = (a) => /^[a-z]+=/i.test(a) && ROLES.includes(a.split('=')[0].toLowerCase());
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const anims = Object.fromEntries(args.filter((a) => !a.startsWith('--') && isAnim(a)).map((a) => [a.slice(0, a.indexOf('=')).toLowerCase(), a.slice(a.indexOf('=') + 1)]));
const input = args.find((a) => !a.startsWith('--') && !isAnim(a));
const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

const clearOld = () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^(hero\.(glb|gltf|fbx)|anim-[a-z]+\.(glb|gltf|fbx))$/i.test(f)) fs.rmSync(path.join(OUT, f));
};

if ('remove' in flags) {
  clearOld();
  if (fs.existsSync(PICTURE)) {
    fs.copyFileSync(PICTURE, MANIFEST);
    say('\n  ✔ Removed the model: the site shows the hero made from your picture again.\n');
  } else {
    fs.writeFileSync(MANIFEST, JSON.stringify({ model: null, animations: {}, height: 1.95, rotationY: 0, glaive: 'beside' }, null, 2) + '\n');
    say('\n  ✔ Removed the model: the site shows the code-built hero again.\n');
  }
  process.exit(0);
}
if (!input) {
  say('\n  Usage: npm run hero -- "C:\\path\\to\\hero.glb"   (see docs/character-model.md)\n');
  process.exit(1);
}
const src = path.resolve(input.replace(/^"|"$/g, ''));
if (!fs.existsSync(src)) fail('File not found: ' + src);
const ext = path.extname(src).toLowerCase();
if (!['.glb', '.gltf', '.fbx'].includes(ext)) fail('The model must be a .glb, .gltf or .fbx file (got ' + ext + ').');
for (const [role, f] of Object.entries(anims)) if (!fs.existsSync(path.resolve(f))) fail(`Animation file for "${role}" not found: ${f}`);

/* ------------------------------------------------------------------ install */

say('\n  Installing the hero model…');
clearOld();
if (previous.kind === 'relief' && !fs.existsSync(PICTURE)) fs.copyFileSync(MANIFEST, PICTURE);
let modelFile;
if (ext === '.fbx') {
  modelFile = 'hero.fbx';
  fs.copyFileSync(src, path.join(OUT, modelFile));
  say(`  • ${path.basename(src)} copied (${mb(fs.statSync(src).size)}; FBX is used as it is)`);
} else {
  modelFile = 'hero.glb';
  const dst = path.join(OUT, modelFile);
  say('  • compressing for the web (the first run downloads gltf-transform, about a minute)…');
  // one command line (npx is a .cmd on Windows, so it runs through the shell); both paths are quoted
  const cmd = `npx --yes @gltf-transform/cli@4.5.1 optimize "${src}" "${dst}" --compress meshopt --texture-compress webp --texture-size 1024 --simplify false`;
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (r.status === 0 && fs.existsSync(dst)) {
    say(`  • ${path.basename(src)}: ${mb(fs.statSync(src).size)} → ${mb(fs.statSync(dst).size)}`);
  } else {
    fs.copyFileSync(src, dst);
    say(`  ! could not compress it (${(r.stderr || r.stdout || 'unknown error').trim().split('\n').pop()}); copied as it is (${mb(fs.statSync(src).size)})`);
  }
}
const animFiles = {};
for (const [role, f] of Object.entries(anims)) {
  const name = `anim-${role}${path.extname(f).toLowerCase()}`;
  fs.copyFileSync(path.resolve(f), path.join(OUT, name));
  animFiles[role] = name;
  say(`  • ${role}: ${path.basename(f)}`);
}

const manifest = {
  model: modelFile,
  animations: animFiles,
  height: flags.height ? Number(flags.height) : previous.model ? (previous.height ?? 1.95) : 1.95,
  rotationY: flags.turn ? Number(flags.turn) : (previous.rotationY ?? 0),
  // in his left hand by default; a setting chosen for an earlier model is kept
  glaive: flags.glaive ?? (previous.model ? previous.glaive : undefined) ?? 'hand',
};
if (previous.clips) manifest.clips = previous.clips;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

/* ------------------------------------------------------------------ report (GLB only: FBX is binary) */

if (modelFile.endsWith('.glb')) {
  const b = fs.readFileSync(path.join(OUT, modelFile));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  const names = (json.animations ?? []).map((a) => a.name || '(unnamed)');
  const nodes = (json.nodes ?? []).map((n) => n.name ?? '');
  const tris = (json.meshes ?? []).flatMap((m) => m.primitives).reduce((n, p) => n + Math.round((json.accessors[p.indices ?? p.attributes.POSITION]?.count ?? 0) / 3), 0);
  say(`\n  Model: about ${tris.toLocaleString()} triangles, ${json.skins?.length ? 'rigged' : 'NOT rigged'}, ${names.length} animation(s)${names.length ? ': ' + names.join(', ') : ''}`);

  const found = {};
  for (const role of ROLES) {
    const wanted = manifest.clips?.[role];
    found[role] = animFiles[role] ? `file ${animFiles[role]}` : wanted ? wanted : names.find((n) => ROLE_NAMES[role].test(n));
  }
  if (!found.idle && names.length) found.idle = names[0];
  const used = (role) => found[role] ?? FALLBACK[role].map((r) => found[r]).find(Boolean);
  say('  What he will do:');
  for (const role of ROLES) {
    const u = used(role);
    say(`    ${role.padEnd(8)} ${u ? '→ ' + u + (found[role] ? '' : '   (borrowed)') : '→ (stands still)'}`);
  }
  const bone = (re, not) => nodes.find((n) => re.test(n) && !(not && not.test(n)));
  const head = bone(/head$/i, /headtop|head_?end|headfront|forehead/i);
  const hand = bone(/left_?hand$/i);
  say(`  Head bone (turns to the cursor): ${head ?? 'none found: he will turn his whole body a little instead'}`);
  say(`  Left hand (holds the glaive):    ${hand ?? 'none found: the glaive will stand beside him'}`);
  if (!names.length) say('\n  ! No animations: he will only breathe. Rig and animate him for idle / talk / wave (docs/character-model.md).');
  if (tris > 150000) say(`\n  ! ${tris.toLocaleString()} triangles is heavy for a web page: try a lower polycount (e.g. 30-50k) when you generate.`);
  if (b.length > 8 * 1048576) say(`\n  ! ${mb(b.length)} is a big download for visitors: lower the texture size or polycount when you generate.`);
}
say(`\n  ✔ Done. public/models/hero.json now points at ${modelFile} (glaive: ${manifest.glaive}).`);
say('    Reload the site (npm run dev), or rebuild it (npm run build, then npm start).\n');
