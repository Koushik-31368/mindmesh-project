# Contributing to MindMesh

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Koushik-31368/mindmesh-project.git
   cd mindmesh-project
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Fill in your GROQ_API_KEY and GEMINI_API_KEY
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Load the extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `extension/` directory

## Project Structure

```
mindmesh/
├── backend/           # Express.js API server
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic (AI, security, privacy, graph)
│   ├── eval/          # RAG evaluation framework
│   └── tests/         # Unit and integration tests
├── extension/         # Chrome extension (popup, content script, background)
├── docs/              # Documentation and screenshots
└── scripts/           # Utility scripts (icon generation, etc.)
```

## Coding Guidelines

- Use **4-space indentation** (enforced by `.editorconfig`)
- Write **JSDoc comments** for all exported functions
- Follow the existing **provider factory pattern** for AI service abstraction
- Keep route handlers thin — delegate logic to service modules

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `chore:` — maintenance tasks
- `refactor:` — code restructuring without behavior change

## Reporting Issues

Open a GitHub issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS version
