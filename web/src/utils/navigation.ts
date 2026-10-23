export type Locale = 'he' | 'en';

export function localePath(path: string, locale: Locale) {
  return locale === 'en' ? `/en${path === '/' ? '' : path}` : path;
}

/** Only application destinations may be carried through authentication. */
export function safeReturnTo(value: unknown, fallback = '/') {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    /[\\\s]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, 'https://shutaf.invalid');
    if (url.origin !== 'https://shutaf.invalid') return fallback;
    const path = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    if (
      !/^\/(?:discover|map|profile(?:\/edit)?|settings|my-listings|compose|chats(?:\/[a-f0-9-]{36})?|listings(?:\/[a-f0-9-]{36})?)?$/i.test(
        path
      )
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authPath(
  kind: 'login' | 'onboarding',
  returnTo: string,
  locale: Locale = 'he'
) {
  return `${localePath(`/${kind}`, locale)}?returnTo=${encodeURIComponent(safeReturnTo(returnTo, localePath('/', locale)))}`;
}
