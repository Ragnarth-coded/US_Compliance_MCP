# Contributing to US Regulations MCP

Thank you for your interest in contributing to the US Regulations MCP server! This document provides guidelines for contributing.

## Ways to Contribute

- **Bug fixes** - Found a bug? Submit a fix!
- **New regulations** - Add support for additional US regulations
- **Control framework mappings** - Improve NIST/ISO mappings
- **Documentation** - Improve docs, fix typos, add examples
- **Test coverage** - Add tests for edge cases

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Ansvar-Systems/US_compliance_MCP.git
cd US_compliance_MCP

# Install dependencies
npm install

# Build the database
npm run build:db
npm run load-seed

# Build TypeScript
npm run build

# Run tests
npm test
```

## Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/my-feature`)
3. **Make your changes** following the code style guidelines below
4. **Run tests** to ensure nothing is broken (`npm test`)
5. **Commit** with a clear message following conventional commits
6. **Push** to your fork
7. **Open a Pull Request** against `main`

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(regulations): add FISMA regulation support
fix(search): handle empty query gracefully
docs(readme): update installation instructions
```

## Code Style

- **TypeScript** - All code must be TypeScript with strict mode
- **ESLint** - Run `npm run lint` before committing
- **No `any` types** - Use proper typing
- **Prepared statements** - Always use prepared statements for SQL

## Adding New Regulations

1. Create a seed file in `data/seed/` following existing format
2. Add an adapter in `src/ingest/adapters/` if needed
3. Update `scripts/load-seed-data.ts` to include your regulation
4. Add tests for the new regulation
5. Update `README.md` and `docs/coverage.md`

## Testing

```bash
# Run all tests
npm test

# Run specific test
npx tsx scripts/test-mcp-tools.ts
```

## Questions?

- Open a [GitHub Discussion](https://github.com/Ansvar-Systems/US_compliance_MCP/discussions)
- Email: hello@ansvar.eu

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

Thank you for contributing!
