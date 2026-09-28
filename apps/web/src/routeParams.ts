import type { RouteLocationNormalizedLoaded } from 'vue-router'

// Settings for an embed may sit after the # as well as in the ?, as in /live?embed#exercise=<id>&theme=dark.
// A host page that changes only the part after the # updates the frame without reloading it.
// When both have it, the # wins.
export function routeParam(route: RouteLocationNormalizedLoaded, name: string): string | null {
  const fromHash = new URLSearchParams(route.hash.slice(1)).get(name)
  if (fromHash !== null) return fromHash
  const q = route.query[name]
  return typeof q === 'string' ? q : null
}
