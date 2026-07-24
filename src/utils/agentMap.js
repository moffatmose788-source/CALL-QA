const AGENT_EXTENSION_MAP_KEY = 'calliq_agent_extension_map';

const defaultMap = {
  '343': 'Moffat Mayaka',
  '101': 'Test Agent',
};

export function loadAgentMap() {
  if (typeof window === 'undefined') return defaultMap;
  try {
    const raw = window.localStorage.getItem(AGENT_EXTENSION_MAP_KEY);
    return raw ? JSON.parse(raw) : defaultMap;
  } catch {
    return defaultMap;
  }
}

export function saveAgentMap(map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AGENT_EXTENSION_MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Unable to save agent map', err);
  }
}

export function resolveAgentName(extension) {
  const map = loadAgentMap();
  return map[extension] || `Unassigned — ext ${extension}`;
}
