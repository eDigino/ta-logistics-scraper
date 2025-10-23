import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Validating .env Configuration\n');
console.log('━'.repeat(50));

// Check for .env file
const envPath = join(__dirname, '.env');
if (!existsSync(envPath)) {
  console.log('❌ .env file not found!\n');
  console.log('Please create one by copying env.example:');
  console.log('  cp env.example .env\n');
  process.exit(1);
}

console.log('✅ .env file exists');

// Load environment variables
dotenv.config();

// Validate MONGODB_URI
console.log('\n📝 Checking MONGODB_URI...');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.log('❌ MONGODB_URI is not set');
  process.exit(1);
} else {
  // Check for common placeholder values
  const placeholders = ['your_username', 'your_password', '<password>', '<db_password>', 'username:password', 'cluster0.xxxxx'];
  const foundPlaceholders = placeholders.filter(p => uri.includes(p));
  
  if (foundPlaceholders.length > 0) {
    console.log('❌ Contains placeholder values:', foundPlaceholders.join(', '));
    console.log('   You need to replace these with your actual MongoDB credentials');
    process.exit(1);
  } else {
    console.log('✅ No placeholder values found');
  }
  
  // Check format
  if (uri.startsWith('mongodb+srv://')) {
    console.log('✅ Using mongodb+srv:// protocol (correct for Atlas)');
    
    // Check basic structure
    const uriPattern = /^mongodb\+srv:\/\/[^:]+:[^@]+@[^/]+/;
    if (uriPattern.test(uri)) {
      console.log('✅ URI format looks correct');
      
      // Extract and validate parts (without showing password)
      const match = uri.match(/^mongodb\+srv:\/\/([^:]+):[^@]+@([^/?]+)/);
      if (match) {
        console.log('   Username:', match[1]);
        console.log('   Cluster:', match[2]);
      }
    } else {
      console.log('❌ URI format appears invalid');
      console.log('   Expected: mongodb+srv://username:password@cluster.mongodb.net/');
      process.exit(1);
    }
  } else {
    console.log('❌ Invalid protocol');
    console.log('   Must start with mongodb+srv://');
    process.exit(1);
  }
}

// Summary
console.log('\n' + '━'.repeat(50));
console.log('✅ Configuration looks good!\n');
console.log('Next step: Test the database connection');
console.log('  npm run test-db\n');

