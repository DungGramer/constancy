# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x     | Yes       |
| < 3.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email: [dung.dev.gramer@gmail.com](mailto:dung.dev.gramer@gmail.com)
3. Include: description, reproduction steps, impact assessment.
4. You will receive a response within 48 hours.

## Security Scanning

This project uses automated security scanning on every commit:

- **CodeQL** — GitHub native SAST
- **Semgrep** — Static analysis with TypeScript + security-audit rules
- **Trivy** — Filesystem vulnerability + secret scanning
- **OSV Scanner** — Dependency vulnerability scanning
- **SonarCloud** — Code quality + coverage analysis
- **OpenSSF Scorecard** — Supply chain security posture
- **Dependabot** — Automated dependency updates
