import fs from 'fs';
import path from 'path';
import { getFeaturePaths, checkFeatureBranch } from './common.mjs';

const args = process.argv.slice(2);
let jsonMode = false;
let requireTasks = false;
let includeTasks = false;
let pathsOnly = false;

for (const arg of args) {
  if (arg === '--json') {
    jsonMode = true;
  } else if (arg === '--require-tasks') {
    requireTasks = true;
  } else if (arg === '--include-tasks') {
    includeTasks = true;
  } else if (arg === '--paths-only') {
    pathsOnly = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log("Usage: node check-prerequisites.mjs [OPTIONS]");
    console.log("  --json              Output in JSON format");
    console.log("  --require-tasks     Require tasks.md to exist");
    console.log("  --include-tasks     Include tasks.md in AVAILABLE_DOCS list");
    console.log("  --paths-only        Only output path variables");
    process.exit(0);
  }
}

const paths = getFeaturePaths();
const { REPO_ROOT, CURRENT_BRANCH, HAS_GIT, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS, RESEARCH, DATA_MODEL, QUICKSTART, CONTRACTS_DIR } = paths;

if (!checkFeatureBranch(CURRENT_BRANCH, HAS_GIT)) {
  process.exit(1);
}

if (pathsOnly) {
  if (jsonMode) {
    console.log(JSON.stringify({ REPO_ROOT, BRANCH: CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS }));
  } else {
    console.log(`REPO_ROOT: ${REPO_ROOT}`);
    console.log(`BRANCH: ${CURRENT_BRANCH}`);
    console.log(`FEATURE_DIR: ${FEATURE_DIR}`);
    console.log(`FEATURE_SPEC: ${FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${IMPL_PLAN}`);
    console.log(`TASKS: ${TASKS}`);
  }
  process.exit(0);
}

if (!fs.existsSync(FEATURE_DIR)) {
  console.error(`ERROR: Feature directory not found: ${FEATURE_DIR}`);
  console.error("Run /specify first to create the feature structure.");
  process.exit(1);
}

const docs = [];
if (fs.existsSync(FEATURE_SPEC)) docs.push("spec.md");
if (fs.existsSync(IMPL_PLAN)) docs.push("plan.md");
if (fs.existsSync(RESEARCH)) docs.push("research.md");
if (fs.existsSync(DATA_MODEL)) docs.push("data-model.md");
if (fs.existsSync(CONTRACTS_DIR) && fs.readdirSync(CONTRACTS_DIR).length > 0) docs.push("contracts/");
if (fs.existsSync(QUICKSTART)) docs.push("quickstart.md");
if (includeTasks && fs.existsSync(TASKS)) docs.push("tasks.md");

if (requireTasks && !fs.existsSync(TASKS)) {
  console.error(`ERROR: tasks.md not found in ${FEATURE_DIR}`);
  console.error("Run /tasks first to create the task list.");
  process.exit(1);
}

if (jsonMode) {
  console.log(JSON.stringify({ FEATURE_DIR, AVAILABLE_DOCS: docs }));
} else {
  console.log(`FEATURE_DIR: ${FEATURE_DIR}`);
  console.log("AVAILABLE_DOCS:");
  const checkFile = (file, label) => console.log(`  ${fs.existsSync(file) ? '✓' : '✗'} ${label}`);
  checkFile(FEATURE_SPEC, "spec.md");
  checkFile(IMPL_PLAN, "plan.md");
  checkFile(RESEARCH, "research.md");
  checkFile(DATA_MODEL, "data-model.md");
  console.log(`  ${(fs.existsSync(CONTRACTS_DIR) && fs.readdirSync(CONTRACTS_DIR).length > 0) ? '✓' : '✗'} contracts/`);
  checkFile(QUICKSTART, "quickstart.md");
  if (includeTasks) checkFile(TASKS, "tasks.md");
}
