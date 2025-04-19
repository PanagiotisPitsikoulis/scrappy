import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import type { Question, Category } from './types';
import { parseQuestionHtml, parseCategoriesHtml } from './parser';

// Base URLs
const BASE_URL = 'https://www.drivepoint.gr';
const CATEGORIES_URL = `${BASE_URL}/erotiseis/enotita/simansi?showAll=1`;

/**
 * Fetches all categories of questions from the website
 * @returns Array of category objects
 */
export async function fetchCategories(): Promise<Category[]> {
    try {
        console.log(`Fetching categories from ${CATEGORIES_URL}...`);
        const { data } = await axios.get(CATEGORIES_URL);

        // Save the raw HTML for debugging
        fs.writeFileSync(path.join('temp', 'categories.html'), data);

        const categories = parseCategoriesHtml(data);
        console.log(`Found ${categories.length} categories`);

        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

/**
 * Extract JSON data embedded in the HTML
 * This is where the actual questions are stored
 */
export function extractQuestionsJsonFromHtml(html: string): Question[] {
    try {
        const $ = cheerio.load(html);
        const jsonContainer = $('#json-container');

        if (!jsonContainer.length) {
            console.log('No JSON container found in HTML');
            return [];
        }

        // Extract the data-questions attribute which contains the JSON
        const dataQuestions = jsonContainer.attr('data-questions');

        if (!dataQuestions) {
            console.log('No data-questions attribute found');
            return [];
        }

        // Parse the JSON data
        const jsonData = JSON.parse(dataQuestions);

        // Check if we have questions
        if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
            console.log('No questions array found in JSON data');
            return [];
        }

        // Parse each question JSON string into an object
        const parsedQuestions: Question[] = [];

        for (const questionStr of jsonData.questions) {
            try {
                // Each question is a JSON string inside the questions array
                const questionData = JSON.parse(questionStr);

                // Map the question data to our Question interface
                const question: Question = {
                    id: String(questionData.id),
                    text: questionData.text,
                    image: questionData.image ? new URL(questionData.image, BASE_URL).toString() : undefined,
                    options: questionData.options.map((option: any) => ({
                        text: option.text,
                        isCorrect: option.is_correct
                    })),
                    category: questionData.section || 'Unknown',
                    vehicleType: questionData.category === 2 ? 'αυτοκινητο' :
                        questionData.category === 1 ? 'μοτοσικλετα' : 'Unknown'
                };

                // Add explanation if available
                if (questionData.explanation) {
                    question.explanation = questionData.explanation;
                }

                // Add explanation image if available
                if (questionData.explanation_img) {
                    question.explanationImage = new URL(questionData.explanation_img, BASE_URL).toString();
                }

                parsedQuestions.push(question);
            } catch (error) {
                console.error('Error parsing question JSON:', error);
            }
        }

        console.log(`Successfully extracted ${parsedQuestions.length} questions from JSON data`);
        return parsedQuestions;
    } catch (error) {
        console.error('Error extracting questions from HTML:', error);
        return [];
    }
}

/**
 * Check if there are more pages to fetch
 * @param html HTML content to check for pagination
 * @returns True if there's a next page
 */
function hasNextPage(html: string): boolean {
    const $ = cheerio.load(html);
    // Check if there's a next page link - the website has 'next' class with a rel="next" attribute
    return $('.pagination .next a[rel="next"]').length > 0;
}

/**
 * Extract the URL for the next page
 * @param html HTML content to extract next page URL from
 * @returns Next page URL or null if no next page
 */
function getNextPageUrl(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);
    const nextPageLink = $('.pagination .next a[rel="next"]');

    if (nextPageLink.length === 0) {
        return null;
    }

    const href = nextPageLink.attr('href');
    if (!href) {
        return null;
    }

    return new URL(href, baseUrl).toString();
}

/**
 * Tries to fetch all questions from a category, handling pagination
 * @param categoryUrl URL of the category to fetch
 * @param maxPages Maximum number of pages to fetch (default: 25)
 * @returns Array of questions
 */
export async function fetchQuestionsFromCategory(categoryUrl: string, maxPages = 25): Promise<Question[]> {
    try {
        console.log(`Fetching questions from ${categoryUrl}...`);
        let currentUrl = categoryUrl;
        let currentPage = 1;
        let allQuestions: Question[] = [];

        while (currentUrl && currentPage <= maxPages) {
            console.log(`Fetching page ${currentPage} from ${currentUrl}...`);
            const { data } = await axios.get(currentUrl);

            // Save the raw HTML for debugging (only first page)
            if (currentPage === 1) {
                const categoryId = categoryUrl.split('/').pop() || 'unknown';
                fs.writeFileSync(path.join('temp', `${categoryId}.html`), data);
            }

            // Try to extract questions from the embedded JSON
            const jsonQuestions = extractQuestionsJsonFromHtml(data);

            if (jsonQuestions.length > 0) {
                allQuestions = [...allQuestions, ...jsonQuestions];
                console.log(`Retrieved ${jsonQuestions.length} questions from page ${currentPage}. Total so far: ${allQuestions.length}`);
            } else {
                // Fallback to HTML parsing if JSON extraction failed
                const $ = cheerio.load(data);

                $('.portlet-body').each((i: number, element: any) => {
                    // Skip sidebar portlet-body elements
                    if ($(element).hasClass('sidebar-list-wrapper')) {
                        return;
                    }

                    const questionHtml = $.html(element);
                    const question = parseQuestionHtml(questionHtml);

                    if (question) {
                        allQuestions.push(question);
                    }
                });
            }

            // Check if there's a next page
            if (hasNextPage(data)) {
                const nextUrl = getNextPageUrl(data, currentUrl);
                if (nextUrl) {
                    currentUrl = nextUrl;
                    currentPage++;

                    // Add a small delay to avoid overloading the server
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        console.log(`Total of ${allQuestions.length} questions found in category`);
        return allQuestions;
    } catch (error) {
        console.error(`Error fetching questions from ${categoryUrl}:`, error);
        return [];
    }
}

/**
 * Uses the example HTML to create at least one question
 * This is a fallback when we can't scrape the actual site
 */
export function parseExampleHtml(): Question | null {
    const exampleHtml = `<div class="portlet-body"><div class="outside-text-wrapper"><div class="text-wrapper"><div class="text">Τι πρέπει να κάνετε βλέποντας αυτό το σήμα σε άλλη θέση πλην κόμβου:</div></div></div> <div class="image"><img src="/assets/testdrive/c001-01fb1441aa2f87040201ae7fee1880716077bfad54f3121cfea0d09524bc481e.jpg" alt="" class=""></div> <div class="options-wrapper"><div><div class="option correct">Να σταματήσετε στο ύψος της πινακίδας και να ξεκινήσετε όταν μπορείτε να το πράξετε χωρίς κίνδυνο.</div><div class="option">Να περάσετε με προσοχή χωρίς να σταματήσετε.</div></div></div> <hr style="margin: 10px;"> <div class="q-toolbar-small clearfix" style="margin-bottom: 0px;"><div class="labels"><span class="label label-info"><i aria-hidden="true" class="fa fa-book"></i> ΣΗΜΑΝΣΗ 1
</span> <span class="label q-label label-category-b"><i aria-hidden="true" class="fa fa-car"></i> αυτοκινητο
</span></div> <div class="translations"><button class="btn btn-link btn-lang gr"></button> <button class="btn btn-link btn-lang en"></button> <button class="btn btn-link btn-lang al"></button> <button class="btn btn-link btn-lang ru"></button></div> <div class="q-buttons-small pull-right"><span><button disabled="disabled" class="btn-icon btn btn-circle blue btn-sm"><i aria-hidden="true" class="fa fa-info-circle"></i> ΕΠΕΞΗΓΗΣΗ</button> <!----></span> <button disabled="disabled" class="btn-icon btn btn-circle blue btn-sm"><i aria-hidden="true" class="fa fa-heart-o" style="margin-right: 5px;"></i>
            ΑΓΑΠΗΜΕΝΑ
          </button></div></div></div>`;

    return parseQuestionHtml(exampleHtml);
} 