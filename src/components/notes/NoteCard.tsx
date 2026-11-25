import React, { useMemo } from 'react';
import { CheckSquare, Pin, PinOff, Trash2 } from 'lucide-react';
import { SmartNote } from '../../types/productivity';
import { getChecklistProgress, getNoteTextStats, NOTE_COLOR_MAP } from '../../utils/richText';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface NoteCardProps {
  note: SmartNote;
  isSelected?: boolean;
  compact?: boolean;
  onSelect: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onRequestDelete: (note: SmartNote) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected = false,
  compact = false,
  onSelect,
  onTogglePin,
  onRequestDelete,
}) => {
  const colorMeta = NOTE_COLOR_MAP[note.color];

  const { checklist, words } = useMemo(() => {
    return {
      checklist: getChecklistProgress(note.contentHtml),
      words: getNoteTextStats(note.plainText).words,
    };
  }, [note.contentHtml, note.plainText]);

  const previewText =
    note.plainText.trim().length > 0
      ? note.plainText
      : 'Empty note — click to start writing...';

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(note.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(note.id);
          }
        }}
        className={`group relative overflow-hidden rounded-xl border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
          isSelected
            ? 'border-purple-500/50 dark:border-cyan-400/50 bg-purple-500/[0.08] dark:bg-cyan-400/[0.09] shadow-sm'
            : 'border-slate-200/70 dark:border-slate-800/80 hover:border-purple-400/40 dark:hover:border-cyan-400/35 bg-white/40 dark:bg-white/[0.02]'
        }`}
      >
        <div className={`h-[2px] w-full ${colorMeta.topBarClass}`} aria-hidden="true" />
        <div className="p-3.5 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white leading-snug line-clamp-1">
              {note.title || 'Untitled Note'}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note.id);
                }}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                className={`p-1 rounded-lg transition-colors ${
                  note.pinned
                    ? 'text-purple-600 dark:text-cyan-400'
                    : 'text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {previewText}
          </p>

          <div className="pt-1 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className={`font-sans font-medium ${colorMeta.textClass}`}>
                {colorMeta.label}
              </span>
              {checklist.total > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-500" />
                    {checklist.done}/{checklist.total}
                  </span>
                </>
              )}
            </div>
            <span className="shrink-0">{formatRelativeTime(note.updatedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GlassCard
      interactive
      onClick={() => onSelect(note.id)}
      className={`group relative overflow-hidden flex flex-col justify-between cursor-pointer ${
        isSelected ? 'ring-1 ring-purple-500/45 dark:ring-cyan-400/45' : ''
      }`}
    >
      {/* 2px top color category hairline */}
      <div className={`h-[2px] w-full ${colorMeta.topBarClass}`} aria-hidden="true" />

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          {/* Category + Pin Status + Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-medium ${colorMeta.textClass}`}>{colorMeta.label}</span>
              {note.pinned && (
                <>
                  <span className="text-slate-400/70" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-purple-600 dark:text-cyan-300 font-medium inline-flex items-center gap-1">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note.id);
                }}
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
                className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-600 dark:hover:text-cyan-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(note);
                }}
                aria-label={`Delete ${note.title || 'note'}`}
                title="Delete note"
                className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className="font-display text-base font-semibold text-slate-950 dark:text-white leading-snug line-clamp-2">
            {note.title || 'Untitled Note'}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-3">
            {previewText}
          </p>
        </div>

        {/* Unboxed Footer Metadata */}
        <div className="pt-3 border-t nx-divider flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span>{words} words</span>
            {checklist.total > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckSquare className="w-3 h-3" />
                  {checklist.done}/{checklist.total}
                </span>
              </>
            )}
          </div>
          <span className="shrink-0">Updated {formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>
    </GlassCard>
  );
};
