// VueUse's `createSharedComposable` does not share during SSR, so every
// caller re-runs the composable there: each `useFetch` inside registers its
// own server prefetch, marking extra async boundaries that shift Vue's
// `useId` counters and break hydration of id-based components like tabs.
// Sharing on the Nuxt app instance keeps one instance per request on the
// server and one per app on the client.
export function createAppComposable<T>(composable: () => T): () => T {
  const instances = new WeakMap<object, T>()

  return () => {
    const nuxtApp = useNuxtApp()

    if (!instances.has(nuxtApp)) {
      instances.set(nuxtApp, effectScope(true).run(composable)!)
    }

    return instances.get(nuxtApp)!
  }
}
