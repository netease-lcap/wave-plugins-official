import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRepoRoot, hasGit } from './common.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let jsonMode = false;
let shortName = '';
const featureDescriptionArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') {
    jsonMode = true;
  } else if (args[i] === '--short-name') {
    shortName = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log("Usage: node create-new-feature.mjs [--json] [--short-name <name>] <feature_description>");
    process.exit(0);
  } else {
    featureDescriptionArgs.push(args[i]);
  }
}

const featureDescription = featureDescriptionArgs.join(' ');
if (!featureDescription) {
  console.error("Usage: node create-new-feature.mjs [--json] [--short-name <name>] <feature_description>");
  process.exit(1);
}

const repoRoot = getRepoRoot();
const hasGitRepo = hasGit();

process.chdir(repoRoot);

const specsDir = path.join(repoRoot, 'specs');
if (!fs.existsSync(specsDir)) {
  fs.mkdirSync(specsDir, { recursive: true });
}

let highest = 0;
const dirs = fs.readdirSync(specsDir);
for (const dir of dirs) {
  const fullPath = path.join(specsDir, dir);
  if (fs.statSync(fullPath).isDirectory()) {
    const match = dir.match(/^([0-9]+)/);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > highest) highest = number;
    }
  }
}

const next = highest + 1;
const featureNum = next.toString().padStart(3, '0');

function generateBranchName(description) {
  const stopWords = /^(i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set)$/i;
  
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = cleanName.split(/\s+/).filter(Boolean);
  
  const meaningfulWords = words.filter(word => {
    if (stopWords.test(word)) return false;
    if (word.length >= 3) return true;
    // Keep short words if they appear as uppercase in original (likely acronyms)
    const regex = new RegExp(`\\b${word.toUpperCase()}\\b`);
    return regex.test(description);
  });

  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join('-');
  } else {
    return words.slice(0, 3).join('-');
  }
}

let branchSuffix = shortName ? 
  shortName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
  generateBranchName(featureDescription);

let branchName = `${featureNum}-${branchSuffix}`;

if (branchName.length > 244) {
  const maxSuffixLength = 244 - 4;
  branchSuffix = branchSuffix.substring(0, maxSuffixLength).replace(/-$/, '');
  branchName = `${featureNum}-${branchSuffix}`;
}

if (hasGitRepo) {
  try {
    execSync(`git checkout -b "${branchName}"`, { stdio: jsonMode ? 'ignore' : 'inherit' });
  } catch (e) {
    console.error(`[specify] Error: Failed to create branch ${branchName}`);
  }
} else {
  console.warn(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
}

const featureDir = path.join(specsDir, branchName);
fs.mkdirSync(featureDir, { recursive: true });

let template = path.join(repoRoot, '.specify', 'templates', 'spec-template.md');
if (!fs.existsSync(template)) {
  template = path.join(__dirname, '..', 'templates', 'spec-template.md');
}

const specFile = path.join(featureDir, 'spec.md');
if (fs.existsSync(template)) {
  fs.copyFileSync(template, specFile);
} else {
  fs.writeFileSync(specFile, '');
}

if (jsonMode) {
  console.log(JSON.stringify({ BRANCH_NAME: branchName, SPEC_FILE: specFile, FEATURE_NUM: featureNum }));
} else {
  console.log(`BRANCH_NAME: ${branchName}`);
  console.log(`SPEC_FILE: ${specFile}`);
  console.log(`FEATURE_NUM: ${featureNum}`);
}
