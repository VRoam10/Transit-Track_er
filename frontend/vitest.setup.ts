import { afterEach } from 'vitest';

// Unmount React trees between tests (Testing Library only auto-cleans when
// test globals are enabled).
afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
