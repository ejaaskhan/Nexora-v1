import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  CheckSquare,
  Code2,
  Copy,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Pin,
  PinOff,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import { NoteColorCategory, SmartNote } from '../../types/productivity';
import {
  extractPlainText,
  getChecklistProgress,
  getNoteTextStats,
  NOTE_COLOR_MAP,
  NOTE_COLORS,
} from '../../utils/richText';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface RichTextEditorProps {
  note: SmartNote;
  storageEngine: 'IndexedDB' | 'LocalStorage';
  onUpdate: (
    id: string,
    patch: Partial<Pick<SmartNote, 'title' | 'contentHtml' | 'color' | 'pinned'>>
  ) => void;
  onTogglePin: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRequestDelete: (note: SmartNote) => void;
  onBackMobile?: () => void;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  blockTag: string;
}

const DEFAULT_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  blockTag: 'p',
};

function formatCreatedStamp(isoTimestamp: string): string {
  const dt = new Date(isoTimestamp);
  if (Number.isNaN(dt.getTime())) return 'Created recently';
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  note,
  storageEngine,
  onUpdate,
  onTogglePin,
  onDuplicate,
  onRequestDelete,
  onBackMobile,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const activeNoteIdRef = useRef<string>(note.id);
  const pendingPatchRef = useRef<{ title?: string; contentHtml?: string } | null>(null);

  const [titleDraft, setTitleDraft] = useState(note.title);
  const [liveHtml, setLiveHtml] = useState(note.contentHtml);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);

  const colorMeta = NOTE_COLOR_MAP[note.color];

  const flushPending = useCallback(
    (targetId: string) => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const pending = pendingPatchRef.current;
      if (pending && (pending.title !== undefined || pending.contentHtml !== undefined)) {
        pendingPatchRef.current = null;
        onUpdate(targetId, pending);
        setSaveState('saved');
      }
    },
    [onUpdate]
  );

  // Sync editor DOM strictly when switching to a different note ID
  useEffect(() => {
    const prevId = activeNoteIdRef.current;
    if (prevId !== note.id) {
      flushPending(prevId);
      activeNoteIdRef.current = note.id;
    }

    setTitleDraft(note.title);
    setLiveHtml(note.contentHtml);
    setSaveState('saved');

    if (editorRef.current) {
      editorRef.current.innerHTML = note.contentHtml;
    }
  }, [note.id, flushPending]);

  // Flush unsaved edits on unmount
  useEffect(() => {
    return () => {
      flushPending(activeNoteIdRef.current);
    };
  }, [flushPending]);

  const scheduleUpdate = useCallback(
    (patch: { title?: string; contentHtml?: string }, immediate = false) => {
      pendingPatchRef.current = {
        ...(pendingPatchRef.current ?? {}),
        ...patch,
      };
      setSaveState('saving');

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (immediate) {
        flushPending(activeNoteIdRef.current);
        return;
      }

      debounceRef.current = window.setTimeout(() => {
        flushPending(activeNoteIdRef.current);
      }, 240);
    },
    [flushPending]
  );

  const refreshActiveFormats = useCallback(() => {
    const el = editorRef.current;
    if (!el || typeof document === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      return;
    }

    let blockTag = 'p';
    let cursor: Node | null = sel.anchorNode;
    while (cursor && cursor !== el) {
      if (cursor.nodeType === Node.ELEMENT_NODE) {
        const tag = (cursor as HTMLElement).tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'blockquote', 'pre', 'p'].includes(tag)) {
          blockTag = tag;
          break;
        }
      }
      cursor = cursor.parentNode;
    }

    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        blockTag,
      });
    } catch {
      setActiveFormats((prev) => ({ ...prev, blockTag }));
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => refreshActiveFormats();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [refreshActiveFormats]);

  const syncEditorDom = useCallback(
    (immediate = false) => {
      const el = editorRef.current;
      if (!el) return;

      // Ensure every <li> inside a checklist UL has an interactive checkbox input
      const checklistLists = el.querySelectorAll('ul[data-checklist="true"]');
      checklistLists.forEach((ul) => {
        Array.from(ul.children).forEach((child) => {
          if (child.tagName.toUpperCase() !== 'LI') return;
          const li = child as HTMLLIElement;
          let box = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          if (!box) {
            box = document.createElement('input');
            box.type = 'checkbox';
            box.setAttribute('contenteditable', 'false');
            li.insertBefore(box, li.firstChild);
            li.insertBefore(document.createTextNode(' '), box.nextSibling);
          } else {
            box.setAttribute('contenteditable', 'false');
            if (box.checked) {
              box.setAttribute('checked', 'checked');
              li.setAttribute('data-checked', 'true');
            } else {
              box.removeAttribute('checked');
              li.removeAttribute('data-checked');
            }
          }
        });
      });

      const html = el.innerHTML;
      setLiveHtml(html);
      scheduleUpdate({ contentHtml: html }, immediate);
      refreshActiveFormats();
    },
    [scheduleUpdate, refreshActiveFormats]
  );

  const ensureEditorFocus = useCallback(() => {
    const el = editorRef.current;
    if (!el) return null;
    if (document.activeElement !== el) {
      el.focus();
    }
    return el;
  }, []);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      const el = ensureEditorFocus();
      if (!el) return;
      try {
        document.execCommand(command, false, value);
      } catch {
        // Ignore unsupported commands in exotic engines
      }
      syncEditorDom(false);
    },
    [ensureEditorFocus, syncEditorDom]
  );

  const applyBlockFormat = useCallback(
    (tag: 'h1' | 'h2' | 'p' | 'blockquote') => {
      const el = ensureEditorFocus();
      if (!el) return;
      const target = activeFormats.blockTag === tag && tag !== 'p' ? 'p' : tag;
      try {
        document.execCommand('formatBlock', false, `<${target}>`);
      } catch {
        try {
          document.execCommand('formatBlock', false, target);
        } catch {
          // fallback no-op
        }
      }
      syncEditorDom(false);
    },
    [activeFormats.blockTag, ensureEditorFocus, syncEditorDom]
  );

  const insertChecklist = useCallback(() => {
    const el = ensureEditorFocus();
    if (!el) return;
    const sel = window.getSelection();
    const selectedText = sel && sel.rangeCount > 0 ? sel.toString().trim() : '';
    const itemText = selectedText ? escapeHtml(selectedText) : 'Action item';
    const snippet = `<ul data-checklist="true"><li><input type="checkbox" contenteditable="false" /> ${itemText}</li></ul><p><br /></p>`;
    try {
      document.execCommand('insertHTML', false, snippet);
    } catch {
      el.innerHTML += snippet;
    }
    syncEditorDom(false);
  }, [ensureEditorFocus, syncEditorDom]);

  const insertCodeBlock = useCallback(() => {
    const el = ensureEditorFocus();
    if (!el) return;
    const sel = window.getSelection();
    const selectedText = sel && sel.rangeCount > 0 ? sel.toString() : '';
    const codeText = selectedText ? escapeHtml(selectedText) : '// Paste or write snippet here';
    const snippet = `<pre><code>${codeText}</code></pre><p><br /></p>`;
    try {
      document.execCommand('insertHTML', false, snippet);
    } catch {
      el.innerHTML += snippet;
    }
    syncEditorDom(false);
  }, [ensureEditorFocus, syncEditorDom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const box = target as HTMLInputElement;
      const li = box.closest('li');
      if (box.checked) {
        box.setAttribute('checked', 'checked');
        li?.setAttribute('data-checked', 'true');
      } else {
        box.removeAttribute('checked');
        li?.removeAttribute('data-checked');
      }
      syncEditorDom(true);
    }
    refreshActiveFormats();
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Support Tab inside code blocks for clean indentation
    if (e.key === 'Tab') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'PRE') {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
            syncEditorDom(false);
            return;
          }
          node = node.parentNode;
        }
      }
    }

    // Pressing Enter inside a checklist item creates a fresh unchecked checklist item
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        let currentLi: HTMLLIElement | null = null;
        let checklistUl: HTMLUListElement | null = null;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'LI' && !currentLi) {
              currentLi = el as HTMLLIElement;
            }
            if (el.tagName === 'UL' && el.getAttribute('data-checklist') === 'true') {
              checklistUl = el as HTMLUListElement;
              break;
            }
          }
          node = node.parentNode;
        }

        if (checklistUl && currentLi) {
          e.preventDefault();
          const newLi = document.createElement('li');
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.setAttribute('contenteditable', 'false');
          const space = document.createTextNode(' ');
          newLi.appendChild(box);
          newLi.appendChild(space);
          currentLi.insertAdjacentElement('afterend', newLi);

          const range = document.createRange();
          range.setStart(space, 1);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          syncEditorDom(false);
        }
      }
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleDraft(val);
    scheduleUpdate({ title: val }, false);
  };

  const handleColorSelect = (color: NoteColorCategory) => {
    if (color === note.color) return;
    onUpdate(note.id, { color });
  };

  const stats = useMemo(() => {
    const plain = extractPlainText(liveHtml);
    return {
      ...getNoteTextStats(plain),
      checklist: getChecklistProgress(liveHtml),
    };
  }, [liveHtml]);

  const toolbarBtnClass = (active = false) =>
    `min-h-[36px] min-w-[36px] px-2 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
      active
        ? 'bg-purple-500/15 dark:bg-cyan-400/18 text-purple-700 dark:text-cyan-300 border border-purple-500/35 dark:border-cyan-400/35'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white border border-transparent'
    }`;

  return (
    <GlassCard className="relative overflow-hidden flex flex-col min-h-[540px] lg:min-h-[640px]">
      {/* 2px top color category hairline */}
      <div className={`h-[2px] w-full ${colorMeta.topBarClass}`} aria-hidden="true" />

      {/* Top Action & Category Bar */}
      <div className="px-4 sm:px-6 py-3 border-b nx-divider flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackMobile && (
            <button
              type="button"
              onClick={() => {
                flushPending(note.id);
                onBackMobile();
              }}
              className="lg:hidden min-h-[40px] px-2.5 -ml-1.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Notes</span>
            </button>
          )}

          {/* Color Category Swatches */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Note color category">
            {NOTE_COLORS.map((c) => {
              const selected = note.color === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleColorSelect(c.key)}
                  aria-label={`Category ${c.label}`}
                  aria-pressed={selected}
                  title={c.label}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    selected ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0D152D] ring-cyan-400' : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full block"
                    style={{ backgroundColor: c.swatchHex }}
                  />
                </button>
              );
            })}
            <span className={`ml-1.5 text-xs font-medium ${colorMeta.textClass}`}>
              {colorMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
            className={`min-h-[38px] px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
              note.pinned
                ? 'text-purple-700 dark:text-cyan-300 bg-purple-500/12 dark:bg-cyan-400/12'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10'
            }`}
          >
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{note.pinned ? 'Pinned' : 'Pin'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              flushPending(note.id);
              onDuplicate(note.id);
            }}
            aria-label="Duplicate note"
            title="Duplicate note"
            className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRequestDelete(note)}
            aria-label="Delete note"
            title="Delete note"
            className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rich Text Formatting Toolbar */}
      <div
        role="toolbar"
        aria-label="Rich text formatting"
        className="px-3 sm:px-5 py-2 border-b nx-divider bg-slate-900/[0.02] dark:bg-white/[0.02] flex items-center gap-1 overflow-x-auto"
      >
        {/* Headings & Text */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyBlockFormat('h1')}
          className={toolbarBtnClass(activeFormats.blockTag === 'h1')}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyBlockFormat('h2')}
          className={toolbarBtnClass(activeFormats.blockTag === 'h2')}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyBlockFormat('p')}
          className={toolbarBtnClass(activeFormats.blockTag === 'p')}
          title="Body paragraph"
          aria-label="Body paragraph"
        >
          <Pilcrow className="w-3.5 h-3.5" />
        </button>

        <span className="h-5 w-px bg-slate-300/60 dark:bg-slate-700/70 mx-1 shrink-0" aria-hidden="true" />

        {/* Text Styles */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('bold')}
          className={toolbarBtnClass(activeFormats.bold)}
          title="Bold"
          aria-label="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('italic')}
          className={toolbarBtnClass(activeFormats.italic)}
          title="Italic"
          aria-label="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('underline')}
          className={toolbarBtnClass(activeFormats.underline)}
          title="Underline"
          aria-label="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('strikeThrough')}
          className={toolbarBtnClass(activeFormats.strikeThrough)}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <span className="h-5 w-px bg-slate-300/60 dark:bg-slate-700/70 mx-1 shrink-0" aria-hidden="true" />

        {/* Lists & Checklists */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('insertUnorderedList')}
          className={toolbarBtnClass(activeFormats.unorderedList)}
          title="Bulleted list"
          aria-label="Bulleted list"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('insertOrderedList')}
          className={toolbarBtnClass(activeFormats.orderedList)}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertChecklist}
          className={toolbarBtnClass(false)}
          title="Insert interactive checklist"
          aria-label="Insert checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <span className="h-5 w-px bg-slate-300/60 dark:bg-slate-700/70 mx-1 shrink-0" aria-hidden="true" />

        {/* Blocks */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyBlockFormat('blockquote')}
          className={toolbarBtnClass(activeFormats.blockTag === 'blockquote')}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertCodeBlock}
          className={toolbarBtnClass(activeFormats.blockTag === 'pre')}
          title="Code block"
          aria-label="Code block"
        >
          <Code2 className="w-4 h-4" />
        </button>

        <span className="h-5 w-px bg-slate-300/60 dark:bg-slate-700/70 mx-1 shrink-0" aria-hidden="true" />

        {/* History & Reset */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('undo')}
          className={toolbarBtnClass(false)}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('redo')}
          className={toolbarBtnClass(false)}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => execCommand('removeFormat')}
          className={toolbarBtnClass(false)}
          title="Clear formatting"
          aria-label="Clear formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Metadata Canvas Header */}
      <div className="px-5 sm:px-7 pt-5 pb-3 space-y-2">
        <input
          type="text"
          value={titleDraft}
          onChange={handleTitleChange}
          onBlur={() => flushPending(note.id)}
          placeholder="Untitled note..."
          aria-label="Note title"
          className="w-full bg-transparent border-0 outline-none font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <span>Created {formatCreatedStamp(note.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {formatRelativeTime(note.updatedAt)}</span>
          {stats.checklist.total > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {stats.checklist.done}/{stats.checklist.total} checked
              </span>
            </>
          )}
        </div>
      </div>

      {/* Rich Text Editable Area */}
      <div className="flex-1 px-5 sm:px-7 pb-6 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Note content editor"
          data-placeholder="Start writing, capture ideas, or format with headings, checklists, quotes, and code blocks..."
          onInput={() => syncEditorDom(false)}
          onBlur={() => flushPending(note.id)}
          onClick={handleCanvasClick}
          onKeyUp={refreshActiveFormats}
          onKeyDown={handleCanvasKeyDown}
          className="nx-prose min-h-[320px] sm:min-h-[380px] text-sm sm:text-[15px] text-slate-800 dark:text-slate-100 outline-none leading-relaxed"
        />
      </div>

      {/* Bottom Live Stats & Persistence Footer */}
      <div className="px-5 sm:px-7 py-2.5 border-t nx-divider flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>{stats.words} words</span>
          <span aria-hidden="true">·</span>
          <span>{stats.chars} chars</span>
          {stats.readMinutes > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{stats.readMinutes} min read</span>
            </>
          )}
        </div>
        <span className={saveState === 'saving' ? 'text-purple-600 dark:text-cyan-300' : ''}>
          {saveState === 'saving' ? 'Saving...' : `Saved in ${storageEngine}`}
        </span>
      </div>
    </GlassCard>
  );
};
