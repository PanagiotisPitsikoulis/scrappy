import os
import json
from scraper_utils import fetch_categories, fetch_questions_from_category, parse_example_html
from models import Question
from typing import List

# Ensure output directory exists
OUTPUT_DIR = os.path.join(os.getcwd(), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_questions(questions: List[Question], filename: str):
    def question_to_dict(q: Question):
        return {
            'id': q.id,
            'text': q.text,
            'image': q.image,
            'options': [{'text': o.text, 'isCorrect': o.isCorrect} for o in q.options],
            'category': q.category,
            'vehicleType': q.vehicleType,
            'explanation': q.explanation,
            'explanationImage': q.explanationImage
        }

    output_path = os.path.join(OUTPUT_DIR, filename)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump([question_to_dict(q) for q in questions], f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(questions)} questions to {output_path}")

def main():
    print("🚗 Starting the Drivepoint.gr scraper...\n")

    try:
        categories = fetch_categories()

        if not categories:
            print("⚠️  No categories found. Using example HTML as fallback...\n")
            example_question = parse_example_html()
            if example_question:
                save_questions([example_question], 'example_question.json')
            else:
                print("❌ Could not parse example HTML.")
            return

        all_questions = []

        for category in categories:
            print(f"📂 Processing category: {category.name} (Expected questions: {category.count})")

            questions = fetch_questions_from_category(category.url)

            if questions:
                filename = category.name.lower().replace(' ', '_') + '.json'
                save_questions(questions, filename)
                all_questions.extend(questions)
            else:
                print(f"⚠️  No questions found for category: {category.name}")

        if all_questions:
            save_questions(all_questions, 'all_questions.json')
            print(f"\n✅ Successfully scraped a total of {len(all_questions)} questions.")
        else:
            print("\n⚠️  Could not scrape any questions from the categories. Falling back...")
            example_question = parse_example_html()
            if example_question:
                save_questions([example_question], 'example_question.json')

        # ... inside main(), at the very end:
        if os.path.exists('temp'):
            shutil.rmtree('temp')
            print("🧹 Cleaned up temporary files.")
    except Exception as e:
        print(f"❌ Error scraping questions: {e}")

if __name__ == "__main__":
    main()