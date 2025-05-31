/**
 * Hudson Street Library - Google Sheets Integration Setup
 * 
 * This script helps set up the environment for the Google Sheets import system.
 * It verifies dependencies, tests connectivity, and validates configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Check if required files exist
function checkRequiredFiles() {
  console.log('Checking required files...');
  
  // Check .env file
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('❌ .env file not found. Creating from example...');
    try {
      fs.copyFileSync(
        path.join(__dirname, '.env.example'),
        path.join(__dirname, '.env')
      );
      console.log('✅ Created .env file from example. Please edit it with your credentials.');
    } catch (error) {
      console.error('❌ Failed to create .env file:', error.message);
    }
  } else {
    console.log('✅ .env file exists');
  }
  
  // Check credentials.json file
  if (!fs.existsSync(path.join(__dirname, 'credentials.json'))) {
    console.error('❌ credentials.json file not found. Please download it from your Google Cloud Console.');
    console.log('   Follow the instructions in README.md to create and set up a service account.');
  } else {
    console.log('✅ credentials.json file exists');
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  console.log('\nChecking dependencies...');
  
  const requiredPackages = ['googleapis', '@directus/sdk', 'dotenv'];
  let allInstalled = true;
  
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`✅ ${pkg} is installed`);
    } catch (error) {
      console.error(`❌ ${pkg} is not installed`);
      allInstalled = false;
    }
  }
  
  if (!allInstalled) {
    console.log('\nSome dependencies are missing. Install them with:');
    console.log(`npm install ${requiredPackages.join(' ')}`);
  }
  
  return allInstalled;
}

// Test connection to Google Sheets
async function testGoogleSheetsConnection() {
  console.log('\nTesting Google Sheets connection...');
  
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SHEETS_KEY_FILE) {
    console.error('❌ Google Sheets configuration is missing in .env file');
    return false;
  }
  
  try {
    const { google } = require('googleapis');
    const keyFile = process.env.GOOGLE_SHEETS_KEY_FILE;
    
    if (!fs.existsSync(keyFile)) {
      console.error(`❌ Key file ${keyFile} does not exist`);
      return false;
    }
    
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    // Try to get metadata for the spreadsheet (lighter than getting values)
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID
    });
    
    console.log('✅ Successfully connected to Google Sheets');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Google Sheets:', error.message);
    if (error.message.includes('invalid_grant') || error.message.includes('invalid_client')) {
      console.log('   This could be an issue with your credentials.json file or permissions.');
    }
    return false;
  }
}

// Test connection to Directus
async function testDirectusConnection() {
  console.log('\nTesting Directus connection...');
  
  if (!process.env.DIRECTUS_URL || !process.env.DIRECTUS_ADMIN_TOKEN) {
    console.error('❌ Directus configuration is missing in .env file');
    return false;
  }
  
  try {
    const { createDirectus, rest, readItems } = require('@directus/sdk');
    
    const directus = createDirectus(process.env.DIRECTUS_URL)
      .with(rest({ credentials: 'include' }));
    
    const headers = {
      'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`
    };
    
    // Try to read a single book to test connection and permissions
    await directus.request(
      readItems('books', { limit: 1 }),
      { headers }
    );
    
    console.log('✅ Successfully connected to Directus');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Directus:', error.message);
    if (error.message.includes('401')) {
      console.log('   This is likely an authentication issue. Check your DIRECTUS_ADMIN_TOKEN.');
    }
    return false;
  }
}

// Run all checks and tests
async function runSetup() {
  console.log('=== Hudson Street Library Google Sheets Import Setup ===\n');
  
  checkRequiredFiles();
  const depsInstalled = checkDependencies();
  
  if (!depsInstalled) {
    console.log('\n⚠️ Fix the missing dependencies before continuing.');
    return;
  }
  
  const sheetsConnected = await testGoogleSheetsConnection();
  const directusConnected = await testDirectusConnection();
  
  console.log('\n=== Setup Summary ===');
  console.log(`Google Sheets Connection: ${sheetsConnected ? '✅ Working' : '❌ Failed'}`);
  console.log(`Directus Connection: ${directusConnected ? '✅ Working' : '❌ Failed'}`);
  
  if (sheetsConnected && directusConnected) {
    console.log('\n✨ Setup complete! You can now run the import script:');
    console.log('node import-books-from-sheets.js');
  } else {
    console.log('\n⚠️ There were some issues with the setup. Fix them before running the import script.');
  }
}

// Run setup if the script is called directly
if (require.main === module) {
  runSetup();
}

module.exports = {
  checkRequiredFiles,
  checkDependencies,
  testGoogleSheetsConnection,
  testDirectusConnection,
  runSetup
};