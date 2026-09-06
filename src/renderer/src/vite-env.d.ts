/// <reference types="vite/client" />

import type { FallzApi } from '../../shared/dog'

declare global {
  interface Window { fallz: FallzApi }
}

export {}
