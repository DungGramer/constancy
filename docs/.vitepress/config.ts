import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  ...defineConfig({
    base: '/constancy/',
    title: 'Constancy',
    description:
      'Immutability primitives for JavaScript — from freeze to isolated snapshots.',

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/constancy/favicon.svg' }],
      ['meta', { name: 'theme-color', content: '#3c82f6' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: 'Constancy — Immutability primitives for JavaScript' }],
      ['meta', { property: 'og:description', content: 'Five models of immutability: Freeze, View, Snapshot, Isolation, Verification. Zero deps, SLSA 3.' }],
      ['meta', { property: 'og:url', content: 'https://dunggramer.github.io/constancy/' }],
      ['meta', { property: 'og:image', content: 'https://dunggramer.github.io/constancy/og-image.png' }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: 'Constancy — Immutability primitives for JavaScript. Five mental models, zero dependencies, SLSA 3.' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:image', content: 'https://dunggramer.github.io/constancy/og-image.png' }],
      ['meta', { name: 'twitter:image:alt', content: 'Constancy — Immutability primitives for JavaScript.' }],
      ['meta', { name: 'twitter:title', content: 'Constancy' }],
      ['meta', { name: 'twitter:description', content: 'Immutability primitives for JavaScript.' }],
      ['meta', { name: 'keywords', content: 'immutability, freeze, proxy, snapshot, vault, tamper-evident, javascript, typescript, security' }],
      ['meta', { name: 'robots', content: 'index, follow, max-image-preview:large' }],
      ['script', { type: 'application/ld+json' }, JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'constancy',
        description: 'Zero-dependency immutability toolkit for JavaScript and TypeScript with 5 mental models: Freeze, View, Snapshot, Isolation, Verification.',
        url: 'https://dunggramer.github.io/constancy/',
        codeRepository: 'https://github.com/DungGramer/constancy',
        programmingLanguage: ['TypeScript', 'JavaScript'],
        runtimePlatform: 'Node.js >=20',
        license: 'https://opensource.org/licenses/MIT',
        author: {
          '@type': 'Person',
          name: 'DungGramer',
          url: 'https://github.com/DungGramer',
        },
        keywords: 'immutability, freeze, proxy, snapshot, vault, tamper-evident, typescript, security, SLSA 3',
      })],
    ],

    lastUpdated: true,
    cleanUrls: true,
    sitemap: { hostname: 'https://dunggramer.github.io/constancy/' },

    themeConfig: {
      search: { provider: 'local' },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/DungGramer/constancy' },
        { icon: 'npm', link: 'https://www.npmjs.com/package/constancy' },
      ],
      editLink: {
        pattern:
          'https://github.com/DungGramer/constancy/edit/master/docs/:path',
        text: 'Edit this page on GitHub',
      },
      footer: {
        message: 'Released under the MIT License.',
        copyright: '© 2026 DungGramer',
      },
    },

    locales: {
      root: {
        label: 'English',
        lang: 'en',
        themeConfig: {
          nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'API', link: '/reference/api-overview' },
            { text: 'Recipes', link: '/recipes/protect-config' },
            { text: 'Migration', link: '/migration/deprecated-aliases' },
            { text: 'Release Notes', link: '/release-notes/' },
            { text: 'Funding', link: '/guide/funding' },
          ],
          sidebar: {
            '/guide/': sidebarGuideEn(),
            '/freeze/': sidebarApiEn(),
            '/view/': sidebarApiEn(),
            '/snapshot/': sidebarApiEn(),
            '/isolation/': sidebarApiEn(),
            '/verification/': sidebarApiEn(),
            '/recipes/': sidebarRecipesEn(),
            '/reference/': sidebarReferenceEn(),
            '/migration/': sidebarMigrationEn(),
            '/release-notes/': sidebarReleaseEn(),
            '/contributing/': sidebarContributingEn(),
          },
        },
      },
      vi: {
        label: 'Tiếng Việt',
        lang: 'vi',
        link: '/vi/',
        head: [
          ['meta', { property: 'og:title', content: 'Constancy — Nguyên hàm bất biến cho JavaScript' }],
          ['meta', { property: 'og:description', content: 'Năm model bất biến: Freeze, View, Snapshot, Isolation, Verification. Zero deps, SLSA 3.' }],
          ['meta', { name: 'twitter:description', content: 'Nguyên hàm bất biến cho JavaScript.' }],
          ['meta', { property: 'og:image:alt', content: 'Constancy — Nguyên hàm bất biến cho JavaScript. Năm model, zero deps, SLSA 3.' }],
          ['meta', { name: 'twitter:image:alt', content: 'Constancy — Nguyên hàm bất biến cho JavaScript.' }],
        ],
        themeConfig: {
          nav: [
            { text: 'Hướng dẫn', link: '/vi/guide/getting-started' },
            { text: 'API', link: '/vi/reference/api-overview' },
            { text: 'Recipes', link: '/vi/recipes/protect-config' },
            { text: 'Di chuyển', link: '/vi/migration/deprecated-aliases' },
            { text: 'Ghi chú phát hành', link: '/vi/release-notes/' },
            { text: 'Tài trợ', link: '/vi/guide/funding' },
          ],
          sidebar: {
            '/vi/guide/': sidebarGuideVi(),
            '/vi/freeze/': sidebarApiVi(),
            '/vi/view/': sidebarApiVi(),
            '/vi/snapshot/': sidebarApiVi(),
            '/vi/isolation/': sidebarApiVi(),
            '/vi/verification/': sidebarApiVi(),
            '/vi/recipes/': sidebarRecipesVi(),
            '/vi/reference/': sidebarReferenceVi(),
            '/vi/migration/': sidebarMigrationVi(),
            '/vi/release-notes/': sidebarReleaseVi(),
          },
        },
      },
    },
  }),
  mermaid: {
    theme: 'default',
  },
  mermaidPlugin: {
    class: 'mermaid my-class',
  },
})

// ── EN sidebar factories ──────────────────────────────────────────────────────

function sidebarApiEn() {
  return [
    {
      text: 'Freeze',
      items: [
        { text: 'freezeShallow', link: '/freeze/freeze-shallow' },
        { text: 'deepFreeze', link: '/freeze/deep-freeze' },
      ],
    },
    {
      text: 'View',
      items: [
        { text: 'immutableView', link: '/view/immutable-view' },
        { text: 'immutableMapView', link: '/view/immutable-map-view' },
        { text: 'immutableSetView', link: '/view/immutable-set-view' },
      ],
    },
    {
      text: 'Snapshot',
      items: [
        { text: 'snapshot', link: '/snapshot/snapshot' },
        { text: 'lock', link: '/snapshot/lock' },
        { text: 'secureSnapshot', link: '/snapshot/secure-snapshot' },
        { text: 'tamperEvident', link: '/snapshot/tamper-evident' },
      ],
    },
    {
      text: 'Isolation',
      items: [{ text: 'vault', link: '/isolation/vault' }],
    },
    {
      text: 'Verification',
      items: [
        { text: 'isDeepFrozen', link: '/verification/is-deep-frozen' },
        { text: 'assertDeepFrozen', link: '/verification/assert-deep-frozen' },
        { text: 'isImmutableView', link: '/verification/is-immutable-view' },
        {
          text: 'assertImmutableView',
          link: '/verification/assert-immutable-view',
        },
        {
          text: 'checkRuntimeIntegrity',
          link: '/verification/check-runtime-integrity',
        },
      ],
    },
  ]
}

function sidebarGuideEn() {
  return [
    {
      text: 'Introduction',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        {
          text: 'Choose the Right Model',
          link: '/guide/choose-the-right-model',
        },
        { text: 'Mental Models', link: '/guide/mental-models' },
        { text: 'Limitations', link: '/guide/limitations' },
        { text: 'FAQ', link: '/guide/faq' },
      ],
    },
    {
      text: 'Security',
      items: [
        { text: 'Security Guide', link: '/guide/security' },
        { text: 'Threat Model', link: '/guide/threat-model' },
      ],
    },
    {
      text: 'Support',
      items: [
        { text: 'Funding', link: '/guide/funding' },
      ],
    },
  ]
}

function sidebarRecipesEn() {
  return [
    {
      text: 'Recipes',
      items: [
        { text: 'Protect Config', link: '/recipes/protect-config' },
        { text: 'Protect API Response', link: '/recipes/protect-api-response' },
        { text: 'Immutable Map & Set', link: '/recipes/immutable-map-set' },
        {
          text: 'Snapshot vs Vault',
          link: '/recipes/choose-between-snapshot-and-vault',
        },
      ],
    },
  ]
}

function sidebarReferenceEn() {
  return [
    {
      text: 'Reference',
      items: [
        { text: 'API Overview', link: '/reference/api-overview' },
        { text: 'Types', link: '/reference/types' },
        { text: 'Glossary', link: '/reference/glossary' },
        { text: 'Security Audit', link: '/reference/security-audit' },
        { text: 'Architecture', link: '/reference/architecture' },
      ],
    },
  ]
}

function sidebarMigrationEn() {
  return [
    {
      text: 'Migration',
      items: [
        { text: 'v2 → v3', link: '/migration/from-v2-to-v3' },
        { text: 'Deprecated Aliases', link: '/migration/deprecated-aliases' },
      ],
    },
  ]
}

function sidebarReleaseEn() {
  return [
    {
      text: 'Release Notes',
      items: [
        { text: 'Changelog', link: '/release-notes/' },
        { text: 'Full Changelog', link: '/release-notes/changelog' },
      ],
    },
  ]
}

function sidebarContributingEn() {
  return [
    {
      text: 'Contributing',
      items: [
        { text: 'Code Standards', link: '/contributing/code-standards' },
        { text: 'Codebase Summary', link: '/contributing/codebase-summary' },
        { text: 'Project Overview', link: '/contributing/project-overview' },
        { text: 'Roadmap', link: '/contributing/roadmap' },
      ],
    },
  ]
}

// ── VI sidebar factories ──────────────────────────────────────────────────────

function sidebarApiVi() {
  return [
    {
      text: 'Freeze',
      items: [
        { text: 'freezeShallow', link: '/vi/freeze/freeze-shallow' },
        { text: 'deepFreeze', link: '/vi/freeze/deep-freeze' },
      ],
    },
    {
      text: 'View',
      items: [
        { text: 'immutableView', link: '/vi/view/immutable-view' },
        { text: 'immutableMapView', link: '/vi/view/immutable-map-view' },
        { text: 'immutableSetView', link: '/vi/view/immutable-set-view' },
      ],
    },
    {
      text: 'Snapshot',
      items: [
        { text: 'snapshot', link: '/vi/snapshot/snapshot' },
        { text: 'lock', link: '/vi/snapshot/lock' },
        { text: 'secureSnapshot', link: '/vi/snapshot/secure-snapshot' },
        { text: 'tamperEvident', link: '/vi/snapshot/tamper-evident' },
      ],
    },
    {
      text: 'Isolation',
      items: [{ text: 'vault', link: '/vi/isolation/vault' }],
    },
    {
      text: 'Verification',
      items: [
        { text: 'isDeepFrozen', link: '/vi/verification/is-deep-frozen' },
        {
          text: 'assertDeepFrozen',
          link: '/vi/verification/assert-deep-frozen',
        },
        { text: 'isImmutableView', link: '/vi/verification/is-immutable-view' },
        {
          text: 'assertImmutableView',
          link: '/vi/verification/assert-immutable-view',
        },
        {
          text: 'checkRuntimeIntegrity',
          link: '/vi/verification/check-runtime-integrity',
        },
      ],
    },
  ]
}

function sidebarGuideVi() {
  return [
    {
      text: 'Giới thiệu',
      items: [
        { text: 'Bắt đầu', link: '/vi/guide/getting-started' },
        { text: 'Chọn model phù hợp', link: '/vi/guide/choose-the-right-model' },
        { text: 'Mental Models', link: '/vi/guide/mental-models' },
        { text: 'Giới hạn', link: '/vi/guide/limitations' },
        { text: 'FAQ', link: '/vi/guide/faq' },
      ],
    },
    {
      text: 'Bảo mật',
      items: [
        { text: 'Hướng dẫn bảo mật', link: '/vi/guide/security' },
        { text: 'Mô hình mối đe dọa', link: '/vi/guide/threat-model' },
      ],
    },
    {
      text: 'Hỗ trợ',
      items: [
        { text: 'Tài trợ', link: '/vi/guide/funding' },
      ],
    },
  ]
}

function sidebarRecipesVi() {
  return [
    {
      text: 'Công thức',
      items: [
        { text: 'Bảo vệ Config', link: '/vi/recipes/protect-config' },
        {
          text: 'Bảo vệ API Response',
          link: '/vi/recipes/protect-api-response',
        },
        { text: 'Immutable Map & Set', link: '/vi/recipes/immutable-map-set' },
        {
          text: 'Snapshot vs Vault',
          link: '/vi/recipes/choose-between-snapshot-and-vault',
        },
      ],
    },
  ]
}

function sidebarReferenceVi() {
  return [
    {
      text: 'Tham khảo',
      items: [
        { text: 'Tổng quan API', link: '/vi/reference/api-overview' },
        { text: 'Types', link: '/vi/reference/types' },
        { text: 'Thuật ngữ', link: '/vi/reference/glossary' },
      ],
    },
  ]
}

function sidebarMigrationVi() {
  return [
    {
      text: 'Di chuyển',
      items: [
        { text: 'v2 → v3', link: '/vi/migration/from-v2-to-v3' },
        { text: 'Alias cũ', link: '/vi/migration/deprecated-aliases' },
      ],
    },
  ]
}

function sidebarReleaseVi() {
  return [
    {
      text: 'Ghi chú phát hành',
      items: [{ text: 'Changelog', link: '/vi/release-notes/' }],
    },
  ]
}
