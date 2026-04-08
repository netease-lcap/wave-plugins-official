import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch (e) {
    return process.cwd();
  }
}

export function hasGit() {
  try {
    execSync('git rev-parse --show-toplevel', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

export function getCurrentBranch() {
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }

  try {
    return execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) {
    const repoRoot = getRepoRoot();
    const specsDir = path.join(repoRoot, 'specs');

    if (fs.existsSync(specsDir)) {
      let latestFeature = '';
      let highest = 0;

      const dirs = fs.readdirSync(specsDir);
      for (const dir of dirs) {
        const fullPath = path.join(specsDir, dir);
        if (fs.statSync(fullPath).isDirectory()) {
          const match = dir.match(/^([0-9]{3})-/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dir;
            }
          }
        }
      }

      if (latestFeature) {
        return latestFeature;
      }
    }
    return 'main';
  }
}

export function checkFeatureBranch(branch, hasGitRepo) {
  if (!hasGitRepo) {
    console.warn("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }

  if (!/^[0-9]{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }

  return true;
}

export function findFeatureDirByPrefix(repoRoot, branchName) {
  const specsDir = path.join(repoRoot, 'specs');
  const match = branchName.match(/^([0-9]{3})-/);

  if (!match) {
    return path.join(specsDir, branchName);
  }

  const prefix = match[1];
  if (fs.existsSync(specsDir)) {
    const dirs = fs.readdirSync(specsDir);
    const matches = dirs.filter(dir => dir.startsWith(`${prefix}-`) && fs.statSync(path.join(specsDir, dir)).isDirectory());

    if (matches.length === 1) {
      return path.join(specsDir, matches[0]);
    } else if (matches.length > 1) {
      console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(', ')}`);
      console.error("Please ensure only one spec directory exists per numeric prefix.");
    }
  }

  return path.join(specsDir, branchName);
}

export function getFeaturePaths() {
  const repoRoot = getRepoRoot();
  const currentBranch = getCurrentBranch();
  const hasGitRepo = hasGit();
  const featureDir = findFeatureDirByPrefix(repoRoot, currentBranch);

  return {
    REPO_ROOT: repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo,
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, 'spec.md'),
    IMPL_PLAN: path.join(featureDir, 'plan.md'),
    TASKS: path.join(featureDir, 'tasks.md'),
    RESEARCH: path.join(featureDir, 'research.md'),
    DATA_MODEL: path.join(featureDir, 'data-model.md'),
    QUICKSTART: path.join(featureDir, 'quickstart.md'),
    CONTRACTS_DIR: path.join(featureDir, 'contracts')
  };
}
