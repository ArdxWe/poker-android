export function formatPlayedAt(playedAt: string): string {
  const date = new Date(playedAt)
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const clock = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day}, ${clock}`
}
