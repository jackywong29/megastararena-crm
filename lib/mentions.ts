// Shared helpers for @mentions in the team feed.

export interface MentionPerson {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  department?: string | null
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Which people are @mentioned in the given text (matched by "@Full Name").
export function extractMentionIds(text: string, people: MentionPerson[]): string[] {
  const ids: string[] = []
  for (const p of people) {
    if (p.full_name && text.includes('@' + p.full_name)) ids.push(p.id)
  }
  return ids
}
