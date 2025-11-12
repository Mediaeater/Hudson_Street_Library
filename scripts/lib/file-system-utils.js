/**
 * File System Utilities
 *
 * Provides safe, validated file system operations for the Prince collection generator.
 * All operations include comprehensive error handling and path validation.
 *
 * @module lib/file-system-utils
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { constants } from 'fs';

/**
 * Reads a CSV file and returns its contents as a string
 *
 * @param {string} filePath - Absolute path to CSV file
 * @returns {Promise<string>} File contents
 * @throws {Error} If file doesn't exist or can't be read
 */
export async function readCSVFile(filePath) {
  try {
    const absolutePath = resolve(filePath);
    await access(absolutePath, constants.R_OK);
    const content = await readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read CSV file at ${filePath}: ${error.message}`);
  }
}

/**
 * Writes HTML content to a file, creating directories if needed
 *
 * @param {string} filePath - Absolute path to output file
 * @param {string} content - HTML content to write
 * @returns {Promise<void>}
 * @throws {Error} If write operation fails
 */
export async function writeHTMLFile(filePath, content) {
  try {
    const absolutePath = resolve(filePath);
    const dir = dirname(absolutePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(absolutePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write HTML file to ${filePath}: ${error.message}`);
  }
}

/**
 * Verifies that a file exists and is readable
 *
 * @param {string} filePath - Path to verify
 * @returns {Promise<boolean>} True if file exists and is readable
 */
export async function fileExists(filePath) {
  try {
    const absolutePath = resolve(filePath);
    await access(absolutePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies that a directory exists
 *
 * @param {string} dirPath - Path to verify
 * @returns {Promise<boolean>} True if directory exists
 */
export async function directoryExists(dirPath) {
  try {
    const absolutePath = resolve(dirPath);
    await access(absolutePath, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that all prerequisite paths exist
 *
 * @param {Object} paths - Object containing paths to validate
 * @param {string} paths.csvFile - Path to books CSV
 * @param {string} paths.outputDir - Path to collections directory
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export async function validatePrerequisites(paths) {
  const errors = [];

  // Check CSV file
  if (!await fileExists(paths.csvFile)) {
    errors.push(`Books CSV file not found: ${paths.csvFile}`);
  }

  // Check output directory
  if (!await directoryExists(paths.outputDir)) {
    errors.push(`Collections directory not found: ${paths.outputDir}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
