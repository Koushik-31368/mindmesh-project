# Changelog

All notable changes to MindMesh are documented here.

## [Unreleased]

### Added
- JSDoc annotations across all backend route handlers for better IDE support
- Input validation on `/api/privacy/analyze` to require `url` field
- Input validation on `/api/memory/chat` to require `question` field

### Changed
- Improved inline documentation consistency across routes

### Fixed
- Missing URL check in privacy analysis endpoint