// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    experimental: {
      componentDetection: true
    }
  },

  experimental: {
    viewTransition: true
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // `--font-sans` leads with `-apple-system` so Apple platforms use SF Pro, and
  // @nuxt/fonts only resolves the first family in a stack, so Inter is declared
  // here to get its `@font-face` emitted for everyone else
  fonts: {
    families: [{ name: 'Inter', provider: 'google', global: true }]
  },

  // Icons outside the client bundle are fetched from the server on first
  // render, which the offline badge's `i-lucide-cloud-off` only does once the
  // network is gone. Scanning inlines every icon the app references, so it
  // ships with the bundle and the fetch never happens
  icon: {
    clientBundle: {
      scan: true
    }
  }
})
