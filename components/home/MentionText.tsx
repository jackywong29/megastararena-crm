import type { ReactNode } from 'react'
import { escapeRegExp } from '@/lib/mentions'

// Renders post/comment text, highlighting "@Full Name" tokens that match a
// known staff member. Plain text otherwise. Wrap in a whitespace-pre-wrap parent.
export function MentionText({ text, names }: { text: string; names: string[] }) {
  const valid = names.filter(Boolean)
  if (valid.length === 0) return <>{text}</>

  const sorted = [...valid].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const re = new RegExp(`@(${sorted.join('|')})`, 'g')

  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(<span key={key++} className="text-[#E7191F] font-medium">@{m[1]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))

  return <>{nodes}</>
}
