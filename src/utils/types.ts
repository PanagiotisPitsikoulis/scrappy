/**
 * Represents a driving test question with its options and metadata.
 */
export interface Question {
    text: string;
    image?: string;
    options: QuestionOption[];
    category: string;
    vehicleType: string;
    id?: string;
    explanation?: string;
    explanationImage?: string;
}

/**
 * Represents an option (answer) for a question.
 */
export interface QuestionOption {
    text: string;
    isCorrect: boolean;
}

/**
 * Represents a category of driving test questions.
 */
export interface Category {
    name: string;
    url: string;
    count: number;
} 