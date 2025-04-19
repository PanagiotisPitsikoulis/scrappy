import * as cheerio from 'cheerio';
import type { Question, QuestionOption } from './types';

/**
 * Parses an HTML snippet containing a driving test question.
 * 
 * @param html HTML snippet containing the question structure
 * @returns A Question object with extracted data
 */
export function parseQuestionHtml(html: string): Question | null {
    try {
        const $ = cheerio.load(html);

        // Extract the question text
        const questionText = $('.text-wrapper .text').text().trim();
        if (!questionText) {
            return null;
        }

        // Extract the image URL if present
        const imageElement = $('.image img');
        const imageUrl = imageElement.length > 0 ?
            new URL(imageElement.attr('src') || '', 'https://www.drivepoint.gr').toString() :
            undefined;

        // Extract the options (answers)
        const options: QuestionOption[] = $('.option').map((_, option) => ({
            text: $(option).text().trim(),
            isCorrect: $(option).hasClass('correct')
        })).get();

        if (options.length === 0) {
            return null;
        }

        // Extract category information
        let category = '';
        let vehicleType = '';

        $('.labels .label').each((_, label) => {
            const labelText = $(label).text().trim();

            if ($(label).hasClass('label-info')) {
                category = labelText;
            }

            if ($(label).hasClass('q-label') &&
                ($(label).hasClass('label-category-b') ||
                    $(label).hasClass('label-category-a') ||
                    $(label).hasClass('label-category-c'))) {
                vehicleType = labelText;
            }
        });

        // Generate an ID from the question text (simple hash)
        const id = Buffer.from(questionText).toString('base64').substring(0, 16);

        return {
            id,
            text: questionText,
            image: imageUrl,
            options,
            category: category || 'Unknown',
            vehicleType: vehicleType || 'Unknown'
        };
    } catch (error) {
        console.error('Error parsing question HTML:', error);
        return null;
    }
}

/**
 * Extracts category links from the drivepoint homepage.
 * 
 * @param html HTML content of the categories page
 * @returns Array of category objects with name and URL
 */
export function parseCategoriesHtml(html: string): { name: string, url: string, count: number }[] {
    try {
        const $ = cheerio.load(html);
        const categories: { name: string, url: string, count: number }[] = [];

        // Find all category links in the sidebar
        $('.sidebar-list .nav li a').each((_, element) => {
            const name = $(element).text().trim().replace(/^\d+\s+/, '');
            const url = $(element).attr('href');
            const countText = $(element).find('.badge').text().trim();
            const count = parseInt(countText, 10) || 0;

            if (name && url) {
                categories.push({
                    name,
                    url: new URL(url, 'https://www.drivepoint.gr').toString(),
                    count
                });
            }
        });

        return categories;
    } catch (error) {
        console.error('Error parsing categories HTML:', error);
        return [];
    }
} 