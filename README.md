# Constancy

**Immutability primitives for JavaScript — from freeze to isolated snapshots.**

[![npm version](https://img.shields.io/npm/v/constancy.svg)](https://www.npmjs.com/package/constancy)
[![npm downloads](https://img.shields.io/npm/dm/constancy.svg)](https://www.npmjs.com/package/constancy)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/constancy)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/ci.yml?label=CI)](https://github.com/DungGramer/constancy/actions/workflows/ci.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/codeql.yml?label=CodeQL)](https://github.com/DungGramer/constancy/actions/workflows/codeql.yml)
[![OSV Scanner](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/osv-scanner.yml?label=OSV)](https://github.com/DungGramer/constancy/actions/workflows/osv-scanner.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/12562/badge)](https://www.bestpractices.dev/projects/12562)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DungGramer_constancy&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DungGramer_constancy)
[![Fuzz Testing](https://img.shields.io/github/actions/workflow/status/DungGramer/constancy/fuzz.yml?label=fuzz&logo=github)](https://github.com/DungGramer/constancy/actions/workflows/fuzz.yml)
[![SLSA 3](https://slsa.dev/images/gh-badge-level3.svg)](https://slsa.dev)
[![Socket Badge](https://badge.socket.dev/npm/package/constancy/latest)](https://socket.dev/npm/package/constancy)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/DungGramer/constancy/badge)](https://scorecard.dev/viewer/?uri=github.com/DungGramer/constancy)
[![codecov](https://codecov.io/github/DungGramer/constancy/graph/badge.svg?token=8IRXIRBIR0)](https://codecov.io/github/DungGramer/constancy)
[![license](https://img.shields.io/npm/l/constancy.svg)](https://github.com/DungGramer/constancy/blob/master/LICENSE)

## Install

```bash
npm install constancy
```

Node.js >= 20 · zero dependencies · ESM + CJS

## Hello World

```ts
import { deepFreeze, immutableView, snapshot } from 'constancy'

// Freeze in place
const config = deepFreeze({ host: 'localhost', nested: { port: 3000 } })
config.nested.port = 9000         // TypeError

// Proxy view — original still mutable
const view = immutableView(data)
view.x = 1                         // TypeError (through view)

// Independent frozen clone
const snap = snapshot(data)        // snap and data are separate
```

## Documentation

**Full docs** — [English](https://dunggramer.github.io/constancy/) · [Tieng Viet](https://dunggramer.github.io/constancy/vi/)

Start here: [Choose the Right Model](https://dunggramer.github.io/constancy/guide/choose-the-right-model) — 5 APIs, 1 minute to pick the right one.

## 5 mental models

| Model | Use when |
|---|---|
| [Freeze](https://dunggramer.github.io/constancy/freeze/deep-freeze) | You own the data, modify in place |
| [View](https://dunggramer.github.io/constancy/view/immutable-view) | Shared reference, prevent mutation through it |
| [Snapshot](https://dunggramer.github.io/constancy/snapshot/snapshot) | Independent frozen copy |
| [Isolation](https://dunggramer.github.io/constancy/isolation/vault) | No mutable reference may ever escape |
| [Verification](https://dunggramer.github.io/constancy/verification/check-runtime-integrity) | Detect tampering at runtime |

## Supply chain

SLSA 3 provenance · pinned action SHAs · fuzz tested · 228+ tests · OpenSSF Scorecard.

See [Security Policy](./SECURITY.md).
## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

## Funding

- [GitHub Sponsors](https://github.com/sponsors/DungGramer)
- [Patreon](https://patreon.com/dunggramer)
- [PayPal](https://paypal.me/dunggramer)
- [thanks.dev](https://thanks.dev/u/gh/DungGramer)
