# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in MindMesh, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email details to the maintainer via GitHub profile contact
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

## Security Architecture

MindMesh processes web page content through multiple safety layers:

- **Heuristic Scanner** — Pattern-based detection of phishing, scam, and malicious indicators
- **AI Security Verifier** — LLM-powered second opinion for flagged pages
- **Privacy Analyzer** — Tracker detection and data collection assessment
- **Provider Failover** — Automatic fallback between Groq and Gemini to maintain availability

## Data Handling

- All page content is processed server-side and not stored permanently (except user-saved pages)
- API keys are stored in `.env` files excluded from version control
- CORS is configured for the extension's origin in production deployments

## Dependencies

We regularly review our dependency tree. To check for known vulnerabilities:

```bash
cd backend
npm audit
```
