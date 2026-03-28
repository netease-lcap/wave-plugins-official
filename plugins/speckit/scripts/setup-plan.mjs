import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFeaturePaths, checkFeatureBranch } from './common.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let jsonMode = false;

for (const arg of args) {
  if (arg === '--json') {
    jsonMode = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log("Usage: node setup-plan.mjs [--json]");
    process.exit(0);
  }
}

const paths = getFeaturePaths();
const { REPO_ROOT, CURRENT_BRANCH, HAS_GIT, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN } = paths;

if (!checkFeatureBranch(CURRENT_BRANCH, HAS_GIT)) {
  process.exit(1);
}

if (!fs.existsSync(FEATURE_DIR)) {
  fs.mkdirSync(FEATURE_DIR, { recursive: true });
}

let template = path.join(REPO_ROOT, '.specify', 'templates', 'plan-template.md');
if (!fs.existsSync(template)) {
  template = path.join(__dirname, '..', 'templates', 'plan-template.md');
}

if (fs.existsSync(template)) {
  fs.copyFileSync(template, IMPL_PLAN);
  if (!jsonMode) console.log(`Copied plan template to ${IMPL_PLAN}`);
} else {
  if (!jsonMode) console.warn(`Warning: Plan template not found at ${template}`);
  fs.writeFileSync(IMPL_PLAN, '');
}

if (jsonMode) {
  console.log(JSON.stringify({
    FEATURE_SPEC,
    IMPL_PLAN,
    SPECS_DIR: FEATURE_DIR,
    BRANCH: CURRENT_BRANCH,
    HAS_GIT
  }));
} else {
  console.log(`FEATURE_SPEC: ${FEATURE_SPEC}`);
  console.log(`IMPL_PLAN: ${IMPL_PLAN}`);
  console.log(`SPECS_DIR: ${FEATURE_DIR}`);
  console.log(`BRANCH: ${CURRENT_BRANCH}`);
  console.log(`HAS_GIT: ${HAS_GIT}`);
}
