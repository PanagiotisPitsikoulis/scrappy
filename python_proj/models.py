from dataclasses import dataclass
from typing import List, Optional

@dataclass
class QuestionOption:
    text: str
    isCorrect: bool

@dataclass
class Question:
    id: str
    text: str
    image: Optional[str]
    options: List[QuestionOption]
    category: str
    vehicleType: str
    explanation: Optional[str] = None
    explanationImage: Optional[str] = None

@dataclass
class Category:
    name: str
    url: str
    count: int
