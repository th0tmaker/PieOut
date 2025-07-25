export function copyToClipboard(value: string) {
  navigator.clipboard.writeText(value).catch(() => {
    // Optionally handle error (e.g. fallback UI), but silently ignore for now
  })
}
