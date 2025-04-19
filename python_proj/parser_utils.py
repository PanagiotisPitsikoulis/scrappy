import hashlib
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from models import Question, QuestionOption, Category
from typing import List, Optional

BASE_URL = 'https://www.drivepoint.gr'

def parse_question_html(html: str) -> Optional[Question]:
    try:
        soup = BeautifulSoup(html, 'html.parser')

        # Extract question text
        text_elem = soup.select_one('.text-wrapper .text')
        if not text_elem:
            return None
        question_text = text_elem.get_text(strip=True)

        # Extract image URL
        image_elem = soup.select_one('.image img')
        image_url = urljoin(BASE_URL, image_elem['src']) if image_elem and image_elem.get('src') else None

        # Extract options
        options = []
        for option_elem in soup.select('.option'):
            option_text = option_elem.get_text(strip=True)
            is_correct = 'correct' in option_elem.get('class', [])
            options.append(QuestionOption(text=option_text, isCorrect=is_correct))
        if not options:
            return None

        # Extract category and vehicle type
        category = 'Unknown'
        vehicle_type = 'Unknown'
        for label in soup.select('.labels .label'):
            label_text = label.get_text(strip=True)
            classes = label.get('class', [])
            if 'label-info' in classes:
                category = label_text
            if 'q-label' in classes and any(cls.startswith('label-category-') for cls in classes):
                vehicle_type = label_text

        # Generate ID
        id_hash = hashlib.md5(question_text.encode('utf-8')).hexdigest()[:16]

        return Question(
            id=id_hash,
            text=question_text,
            image=image_url,
            options=options,
            category=category,
            vehicleType=vehicle_type
        )
    except Exception as e:
        print(f"Error parsing question HTML: {e}")
        return None

def parse_categories_html(html: str) -> List[Category]:
    try:
        soup = BeautifulSoup(html, 'html.parser')
        categories = []
        for link in soup.select('.sidebar-list .nav li a'):
            name = link.get_text(strip=True).lstrip('0123456789. ')
            href = link.get('href')
            count_elem = link.select_one('.badge')
            count = int(count_elem.get_text(strip=True)) if count_elem else 0
            if name and href:
                full_url = urljoin(BASE_URL, href)
                categories.append(Category(name=name, url=full_url, count=count))
        return categories
    except Exception as e:
        print(f"Error parsing categories HTML: {e}")
        return []