const hasFirebase = Boolean(process.env.FIREBASE_DB_URL);

const memoryStore = globalThis.__thailandiaMemoryStore || (globalThis.__thailandiaMemoryStore = new Map());

function stateUrl(key) {
  const base = process.env.FIREBASE_DB_URL.replace(/\/$/, '');
  return `${base}/state/${encodeURIComponent(key)}.json`;
}

export async function getState(key) {
  if (hasFirebase) {
    const res = await fetch(stateUrl(key), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

export async function setState(key, value) {
  if (hasFirebase) {
    await fetch(stateUrl(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    return;
  }
  memoryStore.set(key, value);
}
