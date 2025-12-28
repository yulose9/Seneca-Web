# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Seneca, please follow these steps:

1. **Do NOT open a public GitHub issue**
2. Email the details to the maintainers directly
3. Include as much information as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge your email within 48 hours and work to address the issue promptly.

## Security Best Practices

When using Seneca:

- **Never commit your `.env` file** — It contains sensitive API keys
- **Use strong, unique API keys** — Rotate keys periodically
- **Keep dependencies updated** — Run `npm audit` regularly
- **Review third-party code** — Be cautious with community extensions

Thank you for helping keep Seneca secure! 🔒
