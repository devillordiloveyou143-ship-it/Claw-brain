const { execSync } = require('child_process');

console.log('====================================================');
console.log('PANDAV AI TEST RUNNER & AUTONOMY VERIFICATION SUITE');
console.log('====================================================');

try {
  console.log('\n[STAGE 1/2] Executing Unit Test Suite...');
  execSync('node tests/unit/index.test.js', { stdio: 'inherit' });

  console.log('\n[STAGE 2/2] Executing Autonomous End-to-End Suite...');
  execSync('node tests/e2e/index.test.js', { stdio: 'inherit' });

  console.log('\n====================================================');
  console.log('STATUS: ALL 10 PHASES & VERIFICATIONS PASSED (100%)');
  console.log('====================================================');
} catch (e) {
  console.error('Test Suite Failed:', e.message);
  process.exit(1);
}
