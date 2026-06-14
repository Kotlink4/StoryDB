export const getInitials = (name: string, maxLength = 1) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, maxLength)
    .toUpperCase() || '?'
