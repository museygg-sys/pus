#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🚂 Railway Deployment Readiness Check\n');
console.log('━'.repeat(50));

let allGood = true;

// Check 1: package.json exists and has start script
console.log('\n📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.scripts && pkg.scripts.start) {
    console.log('   ✅ package.json has "start" script');
  } else {
    console.log('   ❌ package.json missing "start" script!');
    allGood = false;
  }
} catch (error) {
  console.log('   ❌ package.json not found or invalid!');
  allGood = false;
}

// Check 2: .gitignore exists
console.log('\n🚫 Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  console.log('   ✅ .gitignore exists');
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('node_modules')) {
    console.log('   ✅ .gitignore includes node_modules');
  } else {
    console.log('   ⚠️  .gitignore should include node_modules');
  }
  if (gitignore.includes('.env')) {
    console.log('   ✅ .gitignore includes .env');
  } else {
    console.log('   ❌ .gitignore MUST include .env (security!)');
    allGood = false;
  }
} else {
  console.log('   ❌ .gitignore not found!');
  allGood = false;
}

// Check 3: .env.example exists
console.log('\n📄 Checking .env.example...');
if (fs.existsSync('.env.example')) {
  console.log('   ✅ .env.example exists (good for documentation)');
} else {
  console.log('   ⚠️  .env.example not found (recommended to add)');
}

// Check 4: Main files exist
console.log('\n📁 Checking main files...');
const requiredFiles = ['start.js', 'index.js', 'payment-bot.js', 'server.js', 'db.js'];
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} not found!`);
    allGood = false;
  }
});

// Check 5: Media directories
console.log('\n🎬 Checking media directories...');
const mediaDirs = ['media/free', 'media/pay'];
mediaDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
    console.log(`   ✅ ${dir} exists (${files.length} files)`);
  } else {
    console.log(`   ⚠️  ${dir} not found (create if needed)`);
  }
});

// Check 6: Railway config
console.log('\n⚙️  Checking Railway configuration...');
if (fs.existsSync('railway.json')) {
  console.log('   ✅ railway.json exists');
} else {
  console.log('   ⚠️  railway.json not found (optional but recommended)');
}

// Check 7: PORT configuration
console.log('\n🔌 Checking PORT configuration...');
const serverContent = fs.readFileSync('server.js', 'utf8');
if (serverContent.includes('process.env.PORT')) {
  console.log('   ✅ server.js uses process.env.PORT');
} else {
  console.log('   ⚠️  server.js should use process.env.PORT for Railway');
}

// Summary
console.log('\n' + '━'.repeat(50));
if (allGood) {
  console.log('\n✅ ALL CHECKS PASSED!');
  console.log('\n🚀 Your project is ready for Railway deployment!');
  console.log('\nNext steps:');
  console.log('  1. Push to GitHub: git push origin main');
  console.log('  2. Deploy on Railway.app');
  console.log('  3. Add environment variables');
  console.log('  4. Add MongoDB database');
  console.log('  5. Generate domain');
  console.log('\n📖 See RAILWAY_DEPLOY.md for detailed instructions\n');
} else {
  console.log('\n⚠️  SOME ISSUES FOUND!');
  console.log('\nPlease fix the errors above before deploying to Railway.\n');
  process.exit(1);
}
