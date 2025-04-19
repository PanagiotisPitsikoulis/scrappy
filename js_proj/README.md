# Drivepoint.gr Web Scraper

A comprehensive web scraper for extracting driving test questions from drivepoint.gr and saving them as JSON.

## Features

- Extracts questions from multiple categories
- Preserves question text, images, options, and metadata
- Saves results in structured JSON format
- Handles dynamic website content with fallbacks
- Debug information saved to temp directory

## Structure

```
├── src/                # Source code
│   ├── index.ts        # Main entry point
│   └── utils/          # Utility modules
│       ├── types.ts    # Type definitions
│       ├── parser.ts   # HTML parsing functions
│       └── scraper.ts  # Web scraping functions
├── output/             # Output JSON files
└── temp/               # Temporary HTML files for debugging
```

## Requirements

- [Bun](https://bun.sh/) runtime
- Node.js packages:
  - axios
  - cheerio

## Installation

```bash
# Install dependencies
bun install
```

## Usage

```bash
# Run the scraper
bun run src/index.ts
```

The scraper will:

1. Fetch all question categories from drivepoint.gr
2. Process each category and extract questions
3. Save questions to JSON files:
   - Individual files for each category
   - Combined file with all questions
4. Save debugging information to the temp directory

## Output Format

Each question in the JSON output includes:

- `id`: Unique identifier for the question
- `text`: The question text
- `image`: URL to the question image (if available)
- `options`: Array of possible answers with:
  - `text`: The answer text
  - `isCorrect`: Whether this is the correct answer
- `category`: Question category (e.g., "ΣΗΜΑΝΣΗ")
- `vehicleType`: Vehicle type (e.g., "αυτοκινητο")

## Note

The questions on drivepoint.gr are loaded dynamically with JavaScript, which can make scraping challenging with simple HTTP requests. This scraper includes fallback mechanisms to ensure at least some questions are extracted.

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
