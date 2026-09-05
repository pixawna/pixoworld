import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, renameSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'small-talk.js'))) throw new Error('Build the complete site before packaging.');
const output = join(root, 'artifacts');
mkdirSync(output, {recursive: true});
const temporary = mkdtempSync(join(output, '.package-'));
const archive = join(output, 'pixo-pagelove-template.zip');
try {
  // Only package the public allowlisted build, never repository or environment files.
  execFileSync('zip', ['-q', '-r', join(temporary, 'template.zip'), '.'], {cwd: dist});
  execFileSync('unzip', ['-tq', join(temporary, 'template.zip')], {stdio: 'inherit'});
  renameSync(join(temporary, 'template.zip'), archive);
  console.log(`PageLove upload bundle: ${archive}`);
  console.log('Extract the ZIP and upload its contents to your host root. No AI API key needed.');
} finally { rmSync(temporary, {recursive: true, force: true}); }
