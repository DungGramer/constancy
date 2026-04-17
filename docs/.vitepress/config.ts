import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/constancy/',
  title: 'Constancy',
  description:
    'Immutability primitives for JavaScript — from freeze to isolated snapshots.',
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
      themeConfig: {
        nav: [
          { text: 'Hướng dẫn', link: '/vi/guide/getting-started' },
          { text: 'API', link: '/vi/reference/api-overview' },
          { text: 'Recipes', link: '/vi/recipes/protect-config' },
          { text: 'Di chuyển', link: '/vi/migration/deprecated-aliases' },
          { text: 'Ghi chú phát hành', link: '/vi/release-notes/' },
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
