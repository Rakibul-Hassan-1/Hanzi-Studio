'use client';

import { createElement as h, useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    if (document.querySelector('script[data-hanzi-studio]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/studio/entry.mjs';
    script.dataset.hanziStudio = 'true';
    script.onerror = () => {
      const host = document.querySelector('hanzi-studio');
      if (host) host.textContent = 'The app could not load. Refresh the page and check that static assets are available.';
    };
    document.head.append(script);
  }, []);
  return h('main', null, h('hanzi-studio', { suppressHydrationWarning: true }));
}
