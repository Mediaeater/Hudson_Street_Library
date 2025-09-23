#!/usr/bin/env node

/**
 * Environment Setup Script for Hudson Street Library
 *
 * This script helps set up the .env file by:
 * 1. Checking if .env exists
 * 2. Copying .env.example to .env if needed
 * 3. Prompting user to add their API keys
 * 4. Validating that required keys are present
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Required API keys and their descriptions
const REQUIRED_KEYS = {
    'GOOGLE_BOOKS_API_KEY': {
        description: 'Google Books API Key (FREE)',
        url: 'https://console.cloud.google.com',
        instructions: 'Enable the "Books API" and create an API key'
    },
    'LIBRARY_THING_API_KEY': {
        description: 'LibraryThing API Key (FREE for non-commercial use)',
        url: 'https://www.librarything.com/services/keys.php',
        instructions: 'Apply for a developer key'
    },
    'DPLA_API_KEY': {
        description: 'DPLA API Key (FREE)',
        url: 'https://dp.la/developers',
        instructions: 'Register for a developer account'
    },
    'EUROPEANA_API_KEY': {
        description: 'Europeana API Key (FREE)',
        url: 'https://pro.europeana.eu/page/apis',
        instructions: 'Register for API access'
    }
};

// Colors for terminal output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * Ask user a question and return their answer
 */
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * Print colored output
 */
function printColor(text, color = 'white') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print header with styling
 */
function printHeader() {
    console.log('');
    printColor('═'.repeat(60), 'cyan');
    printColor('    Hudson Street Library - Environment Setup', 'bright');
    printColor('═'.repeat(60), 'cyan');
    console.log('');
}

/**
 * Check if .env file exists
 */
function checkEnvExists() {
    return fs.existsSync(envPath);
}

/**
 * Check if .env.example exists
 */
function checkEnvExampleExists() {
    return fs.existsSync(envExamplePath);
}

/**
 * Copy .env.example to .env
 */
function copyEnvExample() {
    try {
        const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, exampleContent);
        printColor('✓ Created .env file from .env.example', 'green');
        return true;
    } catch (error) {
        printColor(`✗ Failed to copy .env.example: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Parse .env file and return key-value pairs
 */
function parseEnvFile() {
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};

        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key) {
                    envVars[key.trim()] = valueParts.join('=').trim();
                }
            }
        });

        return envVars;
    } catch (error) {
        printColor(`✗ Failed to parse .env file: ${error.message}`, 'red');
        return {};
    }
}

/**
 * Update .env file with new values
 */
function updateEnvFile(updates) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        let updatedContent = envContent;

        for (const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            const replacement = `${key}=${value}`;

            if (regex.test(updatedContent)) {
                updatedContent = updatedContent.replace(regex, replacement);
            } else {
                updatedContent += `\n${replacement}`;
            }
        }

        fs.writeFileSync(envPath, updatedContent);
        return true;
    } catch (error) {
        printColor(`✗ Failed to update .env file: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Check which API keys are missing or empty
 */
function checkMissingKeys(envVars) {
    const missing = [];
    const placeholder = [];

    for (const key of Object.keys(REQUIRED_KEYS)) {
        if (!envVars[key] || envVars[key] === '') {
            missing.push(key);
        } else if (envVars[key].startsWith('your-') || envVars[key] === 'your-api-key-here') {
            placeholder.push(key);
        }
    }

    return { missing, placeholder };
}

/**
 * Display API key setup instructions
 */
function displayApiInstructions() {
    console.log('');
    printColor('📚 API Key Setup Instructions:', 'bright');
    console.log('');

    for (const [key, info] of Object.entries(REQUIRED_KEYS)) {
        printColor(`${info.description}:`, 'cyan');
        console.log(`   URL: ${info.url}`);
        console.log(`   Instructions: ${info.instructions}`);
        console.log('');
    }
}

/**
 * Prompt user to enter API keys
 */
async function promptForApiKeys(rl, keys) {
    const updates = {};

    console.log('');
    printColor('Please enter your API keys (press Enter to skip):', 'bright');
    console.log('');

    for (const key of keys) {
        const info = REQUIRED_KEYS[key];
        printColor(`${info.description}:`, 'yellow');
        console.log(`   Get it at: ${info.url}`);

        const value = await askQuestion(rl, `   Enter ${key}: `);
        if (value && value !== '') {
            updates[key] = value;
            printColor(`   ✓ ${key} saved`, 'green');
        } else {
            printColor(`   ⚠ ${key} skipped`, 'yellow');
        }
        console.log('');
    }

    return updates;
}

/**
 * Validate API keys format (basic validation)
 */
function validateApiKeys(envVars) {
    const warnings = [];

    for (const [key, value] of Object.entries(envVars)) {
        if (REQUIRED_KEYS[key] && value) {
            // Basic validation - check if it looks like a placeholder
            if (value.includes('your-') || value.includes('api-key') || value.length < 10) {
                warnings.push(`${key} might still be a placeholder value`);
            }
        }
    }

    return warnings;
}

/**
 * Main setup function
 */
async function main() {
    printHeader();

    // Check if .env.example exists
    if (!checkEnvExampleExists()) {
        printColor('✗ .env.example file not found!', 'red');
        printColor('Please ensure you are running this script from the project root.', 'yellow');
        process.exit(1);
    }

    // Check if .env already exists
    const envExists = checkEnvExists();

    if (envExists) {
        printColor('✓ .env file already exists', 'green');
    } else {
        printColor('ℹ .env file not found, creating from .env.example...', 'blue');
        if (!copyEnvExample()) {
            process.exit(1);
        }
    }

    // Parse current .env file
    const envVars = parseEnvFile();
    const { missing, placeholder } = checkMissingKeys(envVars);
    const needsSetup = [...missing, ...placeholder];

    if (needsSetup.length === 0) {
        printColor('✅ All API keys are configured!', 'green');

        // Still validate them
        const warnings = validateApiKeys(envVars);
        if (warnings.length > 0) {
            console.log('');
            printColor('⚠ Validation warnings:', 'yellow');
            warnings.forEach(warning => console.log(`   • ${warning}`));
        }

        console.log('');
        printColor('Your environment is ready to use!', 'bright');
        return;
    }

    // Show what needs to be set up
    if (missing.length > 0) {
        printColor(`❌ Missing API keys: ${missing.join(', ')}`, 'red');
    }
    if (placeholder.length > 0) {
        printColor(`⚠ Placeholder API keys: ${placeholder.join(', ')}`, 'yellow');
    }

    displayApiInstructions();

    const rl = createReadlineInterface();

    try {
        const answer = await askQuestion(rl, 'Would you like to enter your API keys now? (y/N): ');

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            const updates = await promptForApiKeys(rl, needsSetup);

            if (Object.keys(updates).length > 0) {
                if (updateEnvFile(updates)) {
                    printColor('✅ .env file updated successfully!', 'green');
                } else {
                    printColor('❌ Failed to update .env file', 'red');
                }
            } else {
                printColor('ℹ No API keys were entered', 'blue');
            }
        } else {
            console.log('');
            printColor('ℹ Setup skipped. You can run this script again or manually edit .env', 'blue');
        }

    } finally {
        rl.close();
    }

    console.log('');
    printColor('📝 Next steps:', 'bright');
    console.log('   1. Get your API keys from the URLs shown above');
    console.log('   2. Edit .env file directly or run this script again');
    console.log('   3. Test the integration with your book API client');
    console.log('');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nSetup cancelled by user.');
    process.exit(0);
});

// Run main function
if (require.main === module) {
    main().catch(error => {
        console.error('\nSetup failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    checkEnvExists,
    checkEnvExampleExists,
    copyEnvExample,
    parseEnvFile,
    updateEnvFile,
    checkMissingKeys,
    validateApiKeys,
    REQUIRED_KEYS
};