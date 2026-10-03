export function getTimeBasedGreeting(name?: string | null): string {
  const hour = new Date().getHours()
  let greeting: string
  if (hour < 12) greeting = "Good morning"
  else if (hour < 17) greeting = "Good afternoon"
  else greeting = "Good evening"

  const displayName = name?.trim()?.split(" ")[0] || "there"
  return `${greeting}, ${displayName}`
}
