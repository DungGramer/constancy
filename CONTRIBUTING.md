# Contributing to Constancy

Thank you for your interest in contributing to **constancy**!

## How to Contribute

1. **Fork** the repository and create a branch from `master`.
2. Make your changes with clear, focused commits.
3. Submit a **Pull Request** with a clear description of your changes.
4. All PRs are reviewed before merging.

## Contribution Requirements

To ensure code quality and consistency, all contributions must:

- Follow **TypeScript strict mode** (enabled in `tsconfig.json`).
- Use **[Conventional Commits](https://www.conventionalcommits.org/)** format for commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
- Pass all existing tests: `npm test`
- Pass type checking: `npm run typecheck`
- Build successfully: `npm run build`
- **New functionality MUST include tests** in the `tests/` directory.
- Maintain or improve test coverage (currently 96.46% statements).

## Development Setup

```bash
# Clone the repo
git clone https://github.com/DungGramer/constancy.git
cd constancy

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Type check
npm run typecheck
```

## Code Style

- All code is written in **TypeScript**.
- Strict mode is enabled (`strict: true` in `tsconfig.json`).
- Zero runtime dependencies - do not add any.
- Keep the library lightweight (ESM bundle < 10KB).

## Bug Reports

Please use [GitHub Issues](https://github.com/DungGramer/constancy/issues) to report bugs. Include:

- A clear description of the problem.
- Steps to reproduce.
- Expected vs actual behavior.
- Your environment (Node.js version, OS).

## Security Vulnerabilities

See [SECURITY.md](./SECURITY.md) for the responsible disclosure process. Do **not** open public issues for security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
