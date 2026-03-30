export function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /iphone|ipod|android.*mobile/.test(ua)
  const isTablet = /ipad|android(?!.*mobile)/.test(ua)
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const isMac = /macintosh|mac os x/.test(ua)
  const isWindows = /windows/.test(ua)
  const isLinux = /linux/.test(ua)

  if (isMobile && isIOS) return 'mobile_ios'
  if (isMobile && isAndroid) return 'mobile_android'
  if (isTablet && isIOS) return 'tablet_ios'
  if (isTablet && isAndroid) return 'tablet_android'
  if (isMac) return 'desktop_mac'
  if (isWindows) return 'desktop_windows'
  if (isLinux) return 'desktop_linux'
  return 'web_unknown'
}
