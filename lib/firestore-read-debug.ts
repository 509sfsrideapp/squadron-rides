const FIRESTORE_DEBUG_PREFIX = "[firestore-debug]";

function normalizeDetails(details?: Record<string, unknown>) {
  if (!details) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined)
  );
}

export function logFirestoreScreenMount(screen: string, details?: Record<string, unknown>) {
  console.debug(FIRESTORE_DEBUG_PREFIX, "screen-mount", screen, normalizeDetails(details) || {});
}

export function logFirestoreQueryRun(source: string, details?: Record<string, unknown>) {
  console.debug(FIRESTORE_DEBUG_PREFIX, "query-run", source, normalizeDetails(details) || {});
}

export function logFirestoreQueryResult(source: string, details?: Record<string, unknown>) {
  console.debug(FIRESTORE_DEBUG_PREFIX, "query-result", source, normalizeDetails(details) || {});
}

export function logFirestoreListenerAttach(source: string, details?: Record<string, unknown>) {
  console.debug(FIRESTORE_DEBUG_PREFIX, "listener-attach", source, normalizeDetails(details) || {});
}

export function logFirestoreListenerDetach(source: string, details?: Record<string, unknown>) {
  console.debug(FIRESTORE_DEBUG_PREFIX, "listener-detach", source, normalizeDetails(details) || {});
}
