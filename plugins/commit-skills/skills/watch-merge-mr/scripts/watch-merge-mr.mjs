import { execSync } from 'child_process';

const mrId = process.argv[2] || '';
const POLL_INTERVAL_MS = 10000;
const MAX_CONSECUTIVE_ERRORS = 5;

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function watchAndMerge() {
  console.log(`Starting MR watch${mrId ? ` for MR !${mrId}` : ''}...`);
  let consecutiveErrors = 0;

  while (true) {
    try {
      // Resolve the MR's project and iid via `glab mr view`. Note that the
      // MR view object has no reliable top-level `pipeline` field (missing on
      // some GitLab CE versions), so pipeline status is queried explicitly
      // through the pipelines API below instead.
      const view = JSON.parse(run(`glab mr view ${mrId} --output json`));
      const projectId = view.project_id;
      const resolvedIid = view.iid;

      // Query the MR ref pipelines (refs/merge-requests/<iid>/head).
      const pipelines = JSON.parse(
        run(`glab api projects/${projectId}/merge_requests/${resolvedIid}/pipelines`)
      );
      consecutiveErrors = 0;

      const timestamp = new Date().toLocaleTimeString();

      if (pipelines.length === 0) {
        // No pipeline configured for this MR, merge directly.
        console.log(`${timestamp} - No pipeline found, merging MR directly...`);
        mergeAndSync(resolvedIid);
        return;
      }

      // Take the latest pipeline (highest id).
      const status = pipelines.sort((a, b) => b.id - a.id)[0].status;
      console.log(`${timestamp} - Pipeline: ${status}`);

      if (status === 'success') {
        console.log('Pipeline success! Merging MR...');
        mergeAndSync(resolvedIid);
        return;
      }
      if (status === 'failed' || status === 'canceled') {
        console.log(`Pipeline ${status}, aborting merge.`);
        process.exit(1);
      }
      // running / pending / created / manual / ... keep polling.
    } catch (error) {
      consecutiveErrors += 1;
      console.error(
        `Error querying MR status (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
        error.message
      );
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('Too many consecutive query errors, aborting.');
        process.exit(1);
      }
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

function mergeAndSync(mrIid) {
  try {
    execSync(`glab mr merge ${mrIid} --yes --remove-source-branch`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error merging MR:', error.message);
    process.exit(1);
  }
  syncLocalRepo();
}

// Sync local repo after a successful merge.
// - In a worktree: pull the main repository.
// - Otherwise: delete the current branch, switch to the default branch, pull.
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

try {
  await watchAndMerge();
} catch (error) {
  console.error('Unexpected error:', error.message);
  process.exit(1);
}
