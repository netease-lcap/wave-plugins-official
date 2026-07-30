import { execSync } from 'child_process';

const mrId = process.argv[2] || '';

async function watchAndMerge() {
  console.log(`Starting MR watch${mrId ? ` for MR !${mrId}` : ''}...`);
  while (true) {
    let status = null;
    try {
      const output = execSync(`glab mr view ${mrId} --output json`, { encoding: 'utf8' });
      const data = JSON.parse(output);
      status = data.pipeline?.status;
    } catch (error) {
      console.error('Error fetching MR status:', error.message);
    }

    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} - Pipeline: ${status}`);

    if (status === 'success' || status === undefined || status === null) {
      try {
        if (status === undefined || status === null) {
          console.log('No pipeline found, merging MR directly...');
        } else {
          console.log('Pipeline success! Merging MR...');
        }
        execSync(`glab mr merge ${mrId} --yes --remove-source-branch`, { stdio: 'inherit' });
        syncLocalRepo();
        break;
      } catch (error) {
        console.error('Error merging MR:', error.message);
        break;
      }
    } else if (status === 'failed' || status === 'canceled') {
      console.log('Pipeline failed or canceled, aborting merge.');
      break;
    }

    // Wait for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// Sync local repo after a successful merge.
// - In a worktree: pull the main repository.
// - Otherwise: delete the current branch, switch to the default branch, and pull.
function syncLocalRepo() {
  console.log('Syncing local repository...');
  try {
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const commonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (gitDir !== commonDir) {
      console.log('Inside a worktree, pulling main repository...');
      execSync('git -C "$(git rev-parse --git-common-dir)/.." pull', { stdio: 'inherit' });
    } else {
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      let defaultBranch = 'main';
      try {
        defaultBranch = execSync('git symbolic-ref --short refs/remotes/origin/HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().replace(/^origin\//, '');
      } catch {}
      console.log(`Not in a worktree, switching to ${defaultBranch}, deleting ${currentBranch}, and pulling...`);
      execSync(`git switch ${defaultBranch} && git branch -D ${currentBranch} && git pull`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Error syncing local repository:', error.message);
  }
}

watchAndMerge();
