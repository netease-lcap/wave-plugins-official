import { execSync } from 'child_process';

async function watchAndMerge() {
  console.log('Starting MR watch...');
  while (true) {
    let status = null;
    try {
      const output = execSync('glab mr view --output json', { encoding: 'utf8' });
      const data = JSON.parse(output);
      status = data.pipeline?.status;
    } catch (error) {
      console.error('Error fetching MR status:', error.message);
    }

    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} - Pipeline: ${status}`);

    if (status === 'success') {
      try {
        console.log('Pipeline success! Merging MR...');
        execSync('glab mr merge --yes --remove-source-branch', { stdio: 'inherit' });
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

watchAndMerge();
