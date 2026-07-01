const STORAGE_KEY = 'bereadysos:post-auth-redirect'

function isSafeRedirect(path: string) {
  return path.startsWith('/') && !path.startsWith('//')
}

export function setPostAuthRedirect(path: string) {
  if (!import.meta.client || !isSafeRedirect(path)) {
    return
  }
  sessionStorage.setItem(STORAGE_KEY, path)
}

export function peekPostAuthRedirect(): string | null {
  if (!import.meta.client) {
    return null
  }
  const value = sessionStorage.getItem(STORAGE_KEY)
  return value && isSafeRedirect(value) ? value : null
}

export function consumePostAuthRedirect(): string | null {
  const value = peekPostAuthRedirect()
  if (value && import.meta.client) {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  return value
}

export function isPendingInviteRedirect(path: string | null | undefined) {
  return typeof path === 'string' && path.startsWith('/invite/accept')
}
