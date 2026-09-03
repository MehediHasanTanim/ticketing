/**
 * AC-1: dependencies point inward only (ARCHITECTURE-SPINE.md#Design Paradigm).
 * The domain knows ports, never adapters; adapters know ports and the outside
 * world, never each other; a client never reaches an adapter or the datastore.
 * Story 1.0 stands this up so every later story inherits it. Keep it green.
 */
module.exports = {
  forbidden: [
    { name: 'core-imports-nothing-outward',
      severity: 'error',
      comment: 'core/ is pure domain: no adapters, no app, no edge, no framework.',
      from: { path: '^core/' },
      to:   { path: '^(adapters|app|edge|clients)/' } },

    { name: 'core-has-no-npm-dependencies',
      severity: 'error',
      comment: 'core/ is pure: no I/O, no framework, no clock of its own - it takes ' +
               'everything through ports. That is why ULID is implemented in core/src/ids.ts ' +
               'rather than taken as a package.',
      from: { path: '^core/' },
      to:   { dependencyTypes: ['npm'] } },

    { name: 'adapters-never-each-other',
      severity: 'error',
      comment: 'One adapter per external reality; they never know each other.',
      from: { path: '^adapters/src/([^/]+)/' },
      to:   { path: '^adapters/src/([^/]+)/', pathNot: '^adapters/src/$1/' } },

    { name: 'adapters-not-app-or-edge',
      severity: 'error',
      from: { path: '^adapters/' },
      to:   { path: '^(app|edge)/' } },

    { name: 'app-not-edge',
      severity: 'error',
      from: { path: '^app/' },
      to:   { path: '^edge/' } },

    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-orphans', severity: 'warn',
      from: { orphan: true, pathNot: '(\\.d\\.ts$|^ops/)' }, to: {} }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['require','node'] }
  }
};
