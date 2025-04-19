import os
import time
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from typing import List, Optional
from models import Question, QuestionOption, Category
from parser_utils import parse_question_html, parse_categories_html

BASE_URL = 'https://www.drivepoint.gr'
CATEGORIES_URL = f'{BASE_URL}/erotiseis/enotita/simansi?showAll=1'
TEMP_DIR = 'temp'
os.makedirs(TEMP_DIR, exist_ok=True)

def fetch_categories() -> List[Category]:
    try:
        print(f"Fetching categories from {CATEGORIES_URL}...")
        response = requests.get(CATEGORIES_URL)
        response.raise_for_status()
        html = response.text
        with open(os.path.join(TEMP_DIR, 'categories.html'), 'w', encoding='utf-8') as f:
            f.write(html)
        categories = parse_categories_html(html)
        print(f"Found {len(categories)} categories")
        return categories
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []

def extract_questions_json_from_html(html: str) -> List[Question]:
    try:
        soup = BeautifulSoup(html, 'html.parser')
        container = soup.select_one('#json-container')
        if not container:
            print("No JSON container found in HTML")
            return []
        data_questions = container.get('data-questions')
        if not data_questions:
            print("No data-questions attribute found")
            return []
        json_data = json.loads(data_questions)
        questions_raw = json_data.get('questions', [])
        questions = []
        for q_str in questions_raw:
            try:
                q_data = json.loads(q_str)
                options = [QuestionOption(text=opt['text'], isCorrect=opt['is_correct']) for opt in q_data['options']]
                question = Question(
                    id=str(q_data['id']),
                    text=q_data['text'],
                    image=urljoin(BASE_URL, q_data['image']) if q_data.get('image') else None,
                    options=options,
                    category=q_data.get('section', 'Unknown'),
                    vehicleType='αυτοκινητο' if q_data.get('category') == 2 else 'μοτοσικλετα' if q_data.get('category') == 1 else 'Unknown',
                    explanation=q_data.get('explanation'),
                    explanationImage=urljoin(BASE_URL, q_data['explanation_img']) if q_data.get('explanation_img') else None
                )
                questions.append(question)
            except Exception as e:
                print(f"Error parsing question JSON: {e}")
        print(f"Successfully extracted {len(questions)} questions from JSON data")
        return questions
    except Exception as e:
        print(f"Error extracting questions from HTML: {e}")
        return []

def has_next_page(html: str) -> bool:
    soup = BeautifulSoup(html, 'html.parser')
    return bool(soup.select('.pagination .next a[rel="next"]'))

def get_next_page_url(html: str, base_url: str) -> Optional[str]:
    soup = BeautifulSoup(html, 'html.parser')
    next_link = soup.select_one('.pagination .next a[rel="next"]')
    if next_link and next_link.get('href'):
        return urljoin(base_url, next_link['href'])
    return None

def fetch_questions_from_category(category_url: str, max_pages: int = 25) -> List[Question]:
    try:
        print(f"Fetching questions from {category_url}...")
        current_url = category_url
        current_page = 1
        all_questions: List[Question] = []

        while current_url and current_page <= max_pages:
            print(f"Fetching page {current_page} from {current_url}...")
            response = requests.get(current_url)
            response.raise_for_status()
            html = response.text

            if current_page == 1:
                cat_id = category_url.split('/')[-1] or 'category'
                with open(os.path.join(TEMP_DIR, f'{cat_id}.html'), 'w', encoding='utf-8') as f:
                    f.write(html)

            questions = extract_questions_json_from_html(html)

            if not questions:
                soup = BeautifulSoup(html, 'html.parser')
                for element in soup.select('.portlet-body'):
                    if 'sidebar-list-wrapper' in element.get('class', []):
                        continue
                    question_html = str(element)
                    question = parse_question_html(question_html)
                    if question:
                        questions.append(question)

            all_questions.extend(questions)
            print(f"Retrieved {len(questions)} questions from page {current_page}.")

            if has_next_page(html):
                next_url = get_next_page_url(html, current_url)
                if next_url:
                    current_url = next_url
                    current_page += 1
                    time.sleep(0.5)
                else:
                    break
            else:
                break

        print(f"Total of {len(all_questions)} questions found in category")
        return all_questions
    except Exception as e:
        print(f"Error fetching questions from {category_url}: {e}")
        return []

def parse_example_html() -> Optional[Question]:
    example_html = """
    <div class="portlet-body"><div class="outside-text-wrapper">
    <div class="text-wrapper"><div class="text">Τι πρέπει να κάνετε βλέποντας αυτό το σήμα σε άλλη θέση πλην κόμβου:</div></div></div>
    <div class="image"><img src="/assets/testdrive/c001-01fb1441aa2f87040201ae7fee1880716077bfad54f3121cfea0d09524bc481e.jpg" /></div>
    <div class="options-wrapper"><div><div class="option correct">Να σταματήσετε στο ύψος της πινακίδας και να ξεκινήσετε όταν μπορείτε να το πράξετε χωρίς κίνδυνο.</div>
    <div class="option">Να περάσετε με προσοχή χωρίς να σταματήσετε.</div></div></div>
    <div class="labels"><span class="label label-info">ΣΗΜΑΝΣΗ 1</span> <span class="label q-label label-category-b">αυτοκινητο</span></div></div>
    """
    return parse_question_html(example_html)