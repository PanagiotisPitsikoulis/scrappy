import * as fs from 'fs';
import * as path from 'path';
import { fetchCategories, fetchQuestionsFromCategory, parseExampleHtml } from './utils/scraper';
import type { Question } from './utils/types';

// Ensure the output directory exists
const OUTPUT_DIR = path.join(process.cwd(), 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Save questions to a JSON file
 */
function saveQuestions(questions: Question[], filename: string): void {
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`Saved ${questions.length} questions to ${outputPath}`);
}

/**
 * Main function to scrape all questions
 */
async function main() {
    console.log('Starting the Drivepoint.gr scraper...');

    try {
        // First try to get all categories
        const categories = await fetchCategories();

        if (categories.length === 0) {
            console.log('No categories found. Using example HTML as fallback...');
            const exampleQuestion = parseExampleHtml();

            if (exampleQuestion) {
                saveQuestions([exampleQuestion], 'example_question.json');
            } else {
                console.error('Could not parse example HTML.');
            }

            return;
        }

        // Collect all questions from all categories
        const allQuestions: Question[] = [];

        for (const category of categories) {
            console.log(`Processing category: ${category.name} (Expected questions: ${category.count})`);

            // Fetch questions for this category
            const questions = await fetchQuestionsFromCategory(category.url);

            if (questions.length > 0) {
                // Save questions for this category
                saveQuestions(questions, `${category.name.toLowerCase().replace(/\s+/g, '_')}.json`);

                // Add to all questions
                allQuestions.push(...questions);
            } else {
                console.log(`No questions found for category: ${category.name}`);
            }
        }

        // Save all questions
        if (allQuestions.length > 0) {
            saveQuestions(allQuestions, 'all_questions.json');
            console.log(`Successfully scraped a total of ${allQuestions.length} questions.`);
        } else {
            console.log('Could not scrape any questions from the categories.');

            // Fall back to example question
            console.log('Using example HTML as fallback...');
            const exampleQuestion = parseExampleHtml();

            if (exampleQuestion) {
                saveQuestions([exampleQuestion], 'example_question.json');
            }
        }
    } catch (error) {
        console.error('Error scraping questions:', error);
    }
}

// Run the scraper
main().catch(console.error); 