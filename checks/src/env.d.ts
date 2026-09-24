import type { RouteRecordInfo } from 'vue-router'

// Hand-written typed route map, as file-based routing would generate it (typescript.md).
interface RouteNamedMap {
  '/invoices/[id]': RouteRecordInfo<'/invoices/[id]', '/invoices/:id', { id: string | number }, { id: string }, never>
}

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap
  }
}

export {}
