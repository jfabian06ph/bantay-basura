// One confirmation per report per device, with a 24h cooldown — otherwise a
// single person could manufacture consensus in either direction. The reporter
// is seeded here at creation time so they can't also "verify" their own report
// (they already count as resident #1). Real abuse-resistance needs a server
// check; this is the honest client guard.
const VOTE_KEY = 'bb-voted'
const VOTE_COOLDOWN_MS = 86_400_000

const loadVoteLog = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const recentlyVoted = (id: string): boolean =>
  Date.now() - (loadVoteLog()[id] ?? 0) < VOTE_COOLDOWN_MS

export const recordVote = (id: string): void => {
  try {
    const log = loadVoteLog()
    log[id] = Date.now()
    localStorage.setItem(VOTE_KEY, JSON.stringify(log))
  } catch {
    /* ignore */
  }
}

// Reports this device authored. The reporter already counts as resident #1, so
// they can never "verify" their own report — a permanent block, unlike the 24h
// cooldown that applies to confirming other people's reports.
const AUTHORED_KEY = 'bb-authored'

const loadAuthored = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(AUTHORED_KEY) || '[]')
  } catch {
    return []
  }
}

export const isAuthored = (id: string): boolean => loadAuthored().includes(id)

export const markAuthored = (id: string): void => {
  try {
    const list = loadAuthored()
    if (!list.includes(id)) {
      localStorage.setItem(AUTHORED_KEY, JSON.stringify([...list, id]))
    }
  } catch {
    /* ignore */
  }
}
