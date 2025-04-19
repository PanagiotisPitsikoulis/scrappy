import * as fs from 'fs';
import * as path from 'path';

// Files to remove
const filesToRemove = [
    'index.ts',
    'example-scraper.ts',
    'direct-scraper.ts',
    'html-parser.ts',
    'driving_questions.json',
    'example_question.json',
    'direct_example.json',
    'parsed_question.json',
    'webpage.html',
];

// Directories to ensure exist
const directoriesToCreate = [
    'output',
    'temp',
];

// Clean up the old files
console.log('Cleaning up old files...');
for (const file of filesToRemove) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Removed: ${file}`);
    }
}

// Clean up any question_*.html files
const filesInCwd = fs.readdirSync(process.cwd());
for (const file of filesInCwd) {
    if (file.startsWith('question_') && file.endsWith('.html')) {
        fs.unlinkSync(path.join(process.cwd(), file));
        console.log(`Removed: ${file}`);
    }
}

// Ensure directories exist
console.log('\nEnsuring directories exist...');
for (const dir of directoriesToCreate) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created: ${dir}`);
    } else {
        console.log(`Directory already exists: ${dir}`);
    }
}

console.log('\nCleanup complete!');
console.log('To run the scraper, use: bun run src/index.ts'); 