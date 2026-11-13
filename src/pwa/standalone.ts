/** Running as the installed Home Screen app rather than a Safari tab (TDD 10.3). */
export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
