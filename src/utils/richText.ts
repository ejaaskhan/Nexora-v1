import { NoteColorCategory } from '../types/productivity';

export interface NoteColorMeta {
  key: NoteColorCategory;
  label: string;
  swatchHex: string;
  topBarClass: string;
  textClass: string;
  tintClass: string;
}

export const NOTE_COLORS: NoteColorMeta[] = [
  {
    key: 'violet',
    label: 'Ideas',
    swatchHex: '#8B5CF6',
    topBarClass: 'bg-purple-500',
    textClass: 'text-purple-600 dark:text-purple-300',
    tintClass: 'bg-purple-500/[0.06] dark:bg-purple-500/[0.09]',
  },
  {
    key: 'cyan',
    label: 'Deep Work',
    swatchHex: '#06B6D4',
    topBarClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    tintClass: 'bg-cyan-500/[0.06] dark:bg-cyan-400/[0.08]',
  },
  {
    key: 'emerald',
    label: 'Learning',
    swatchHex: '#10B981',
    topBarClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    tintClass: 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]',
  },
  {
    key: 'amber',
    label: 'Meetings',
    swatchHex: '#F59E0B',
    topBarClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-300',
    tintClass: 'bg-amber-500/[0.06] dark:bg-amber-500/[0.08]',
  },
  {
    key: 'rose',
    label: 'Urgent',
    swatchHex: '#F43F5E',
    topBarClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-300',
    tintClass: 'bg-rose-500/[0.06] dark:bg-rose-500/[0.08]',
  },
  {
    key: 'slate',
    label: 'General',
    swatchHex: '#64748B',
    topBarClass: 'bg-slate-400 dark:bg-slate-500',
    textClass: 'text-slate-600 dark:text-slate-400',
    tintClass: 'bg-slate-500/[0.04] dark:bg-white/[0.03]',
  },
];

export const NOTE_COLOR_MAP: Record<NoteColorCategory, NoteColorMeta> = NOTE_COLORS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<NoteColorCategory, NoteColorMeta>
);

const ALLOWED_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'P',
  'DIV',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'CODE',
  'HR',
  'SPAN',
  'LABEL',
  'INPUT',
]);

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT') {
    return null;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    Array.from(el.childNodes).forEach((child) => {
      const clean = sanitizeNode(child, doc);
      if (clean) frag.appendChild(clean);
    });
    return frag;
  }

  const cleanEl = doc.createElement(tag.toLowerCase());

  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    if (type !== 'checkbox') return null;
    cleanEl.setAttribute('type', 'checkbox');
    if (el.hasAttribute('checked') || (el as HTMLInputElement).checked) {
      cleanEl.setAttribute('checked', 'checked');
    }
    cleanEl.setAttribute('contenteditable', 'false');
    return cleanEl;
  }

  if (tag === 'UL' && el.getAttribute('data-checklist') === 'true') {
    cleanEl.setAttribute('data-checklist', 'true');
  }
  if (tag === 'LI' && el.getAttribute('data-checked') === 'true') {
    cleanEl.setAttribute('data-checked', 'true');
  }

  Array.from(el.childNodes).forEach((child) => {
    const clean = sanitizeNode(child, doc);
    if (clean) cleanEl.appendChild(clean);
  });

  return cleanEl;
}

export function sanitizeNoteHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(rawHtml, 'text/html');
    const outDoc = document.implementation.createHTMLDocument('');
    const container = outDoc.createElement('div');

    Array.from(parsed.body.childNodes).forEach((child) => {
      const clean = sanitizeNode(child, outDoc);
      if (clean) container.appendChild(clean);
    });

    return container.innerHTML;
  } catch {
    return '';
  }
}

export function extractPlainText(html: string): string {
  if (!html) return '';
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const text = parsed.body.textContent ?? '';
      return text.replace(/\s+/g, ' ').trim();
    } catch {
      // Fallback below
    }
  }
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNoteTextStats(plainText: string): {
  words: number;
  chars: number;
  readMinutes: number;
} {
  const trimmed = plainText.trim();
  if (!trimmed) return { words: 0, chars: 0, readMinutes: 0 };
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;
  const readMinutes = Math.max(1, Math.ceil(words / 200));
  return { words, chars, readMinutes };
}

export function getChecklistProgress(html: string): { done: number; total: number } {
  if (!html || !html.includes('checkbox')) return { done: 0, total: 0 };
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return { done: 0, total: 0 };
  }
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const boxes = Array.from(parsed.querySelectorAll('input[type="checkbox"]'));
    const done = boxes.filter((b) => b.hasAttribute('checked')).length;
    return { done, total: boxes.length };
  } catch {
    return { done: 0, total: 0 };
  }
}
