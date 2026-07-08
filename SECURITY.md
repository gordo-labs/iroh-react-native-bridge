# Security Policy

## Supported Versions

This project is alpha. Security fixes are applied to the latest published
`0.1.x` package and the active development branch.

Older alpha versions may not receive backports.

## Reporting A Vulnerability

Do not open a public GitHub issue for security problems.

Email the maintainers at:

```txt
security@gordo.design
```

Include:

- Affected package version or commit SHA.
- Platform: iOS, Android, or both.
- A clear reproduction path.
- Whether the issue requires a malicious peer, local app access, or network
  attacker.
- Logs, packet captures, or proof-of-concept code if safe to share.

## Scope

In scope:

- Native memory safety issues in this bridge.
- Incorrect native-linking behavior that exposes secrets.
- Framing bugs that allow cross-connection message confusion.
- Unsafe default behavior in the bridge package.

Out of scope:

- Host app authentication bugs.
- Host app pairing bugs.
- Iroh upstream vulnerabilities.
- Denial of service from unsupported or intentionally malformed host app usage,
  unless it exposes a broader security boundary.

## Host App Responsibility

This bridge does not authenticate peers or messages. Host apps must verify peer
identity and authorize every app-level protocol session above the raw Iroh
connection.
