import { createElement as h } from 'react';
import '../public/studio/styles.css';

export const metadata = {
  title: 'Hanzi Studio — Chinese Video to Word',
  description: 'Extract Chinese text visible in videos and export an editable Word document. Free local OCR, with no API key.',
};

export default function RootLayout({ children }) {
  return h('html', { lang: 'en' }, h('body', null, children));
}
