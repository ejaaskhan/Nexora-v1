import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  LayoutGrid,
  PanelLeft,
  Pin,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { NoteColorCategory, SmartNote } from '../../types/productivity';
import { NOTE_COLOR_MAP, NOTE_COLORS } from '../../utils/richText';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { NoteCard } from '../../components/notes/NoteCard';
import { RichTextEditor } from '../../components/notes/RichTextEditor';

type NotesViewMode = 'split' | 'grid';
type NotesSortBy = 'pinned_recent' | 'updated_desc' | 'created_desc' | 'title_asc';

export const NotesPage: React.FC = () => {
  const {
    notes,
    notesStorageEngine,
    addNote,
    updateNote,
    togglePinNote,
    duplicateNote,
    deleteNote,
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<NotesViewMode>('split');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => notes[0]?.id ?? null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<NoteColorCategory | 'all'>('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<NotesSortBy>('pinned_recent');

  const [notePendingDelete, setNotePendingDelete] = useState<SmartNote | null>(null);

  // Keep selectedNoteId valid as notes hydrate or get deleted
  useEffect(() => {
    if (notes.length === 0) {
      setSelectedNoteId(null);
      setMobileEditorOpen(false);
      return;
    }
    if (!selectedNoteId || !notes.some((n) => n.id === selectedNoteId)) {
      const sortedFirst = [...notes].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      })[0];
      setSelectedNoteId(sortedFirst?.id ?? null);
    }
  }, [notes, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = notes.filter((note) => {
      if (pinnedOnly && !note.pinned) return false;
      if (colorFilter !== 'all' && note.color !== colorFilter) return false;
      if (!q) return true;
      const categoryLabel = NOTE_COLOR_MAP[note.color].label.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.plainText.toLowerCase().includes(q) ||
        categoryLabel.includes(q)
      );
    });

    return matched.sort((a, b) => {
      if (sortBy === 'pinned_recent') {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
      if (sortBy === 'updated_desc') {
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
      if (sortBy === 'created_desc') {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
    });
  }, [notes, searchQuery, colorFilter, pinnedOnly, sortBy]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes]
  );

  const regularNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes]
  );

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0] ?? null,
    [notes, selectedNoteId, filteredNotes]
  );

  const totalPinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const hasActiveFilters =
    searchQuery.trim().length > 0 || colorFilter !== 'all' || pinnedOnly;

  const handleCreateNote = (presetColor?: NoteColorCategory) => {
    const created = addNote({
      title: '',
      contentHtml: '<p></p>',
      color: presetColor ?? (colorFilter !== 'all' ? colorFilter : 'violet'),
      pinned: pinnedOnly,
    });
    setSelectedNoteId(created.id);
    setViewMode('split');
    setMobileEditorOpen(true);
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (viewMode === 'grid') {
      setViewMode('split');
    }
    setMobileEditorOpen(true);
  };

  const handleDuplicateNote = (noteId: string) => {
    const copy = duplicateNote(noteId);
    if (copy) {
      setSelectedNoteId(copy.id);
      setMobileEditorOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (!notePendingDelete) return;
    const deletingId = notePendingDelete.id;
    const remaining = filteredNotes.filter((n) => n.id !== deletingId);
    deleteNote(deletingId);
    setNotePendingDelete(null);
    if (selectedNoteId === deletingId) {
      setSelectedNoteId(remaining[0]?.id ?? null);
      if (remaining.length === 0) {
        setMobileEditorOpen(false);
      }
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setColorFilter('all');
    setPinnedOnly(false);
  };

  return (
    <PageTransition className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            Rich-text workspace · Persisted locally via {notesStorageEngine}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Smart Notes
          </h1>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} · {totalPinnedCount} pinned
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Split-Pane / Card Grid Segmented Toggle */}
          <div
            role="group"
            aria-label="Notes layout view"
            className="inline-flex items-center p-1 rounded-xl nx-glass"
          >
            <button
              type="button"
              onClick={() => setViewMode('split')}
              aria-pressed={viewMode === 'split'}
              className={`min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-purple-500/15 dark:bg-cyan-400/18 text-purple-700 dark:text-cyan-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                setMobileEditorOpen(false);
              }}
              aria-pressed={viewMode === 'grid'}
              className={`min-h-[36px] px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-500/15 dark:bg-cyan-400/18 text-purple-700 dark:text-cyan-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          <GlowButton variant="primary" onClick={() => handleCreateNote()}>
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </GlowButton>
        </div>
      </div>

      {/* Search, Color Category & Sort Bar */}
      <GlassCard className="p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, note content, or categories..."
              aria-label="Search notes"
              className="w-full min-h-[42px] pl-10 pr-9 rounded-xl nx-input text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPinnedOnly((prev) => !prev)}
              aria-pressed={pinnedOnly}
              className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                pinnedOnly
                  ? 'border-purple-500/50 dark:border-cyan-400/50 bg-purple-500/12 dark:bg-cyan-400/12 text-purple-700 dark:text-cyan-300'
                  : 'nx-input text-slate-600 dark:text-slate-300 hover:border-cyan-400/40'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as NotesSortBy)}
              aria-label="Sort notes"
              className="min-h-[42px] px-3 rounded-xl nx-input text-xs font-medium"
            >
              <option value="pinned_recent">Pinned &amp; Recent</option>
              <option value="updated_desc">Recently Updated</option>
              <option value="created_desc">Newest Created</option>
              <option value="title_asc">Title A–Z</option>
            </select>
          </div>
        </div>

        {/* Color Category Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t nx-divider">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by color category">
            <button
              type="button"
              onClick={() => setColorFilter('all')}
              aria-pressed={colorFilter === 'all'}
              className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                colorFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {NOTE_COLORS.map((cat) => {
              const active = colorFilter === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setColorFilter(active ? 'all' : cat.key)}
                  aria-pressed={active}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors border ${
                    active
                      ? 'border-purple-500/45 dark:border-cyan-400/45 bg-purple-500/10 dark:bg-cyan-400/10 text-slate-950 dark:text-white'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.swatchHex }}
                    aria-hidden="true"
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              {filteredNotes.length} of {notes.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="font-sans text-xs font-medium text-purple-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Main Content Area: Empty, Card Grid, or Split-Pane Workspace */}
      {notes.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl nx-glass-elevated flex items-center justify-center text-purple-600 dark:text-cyan-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Your Smart Notes vault is ready
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Capture architecture specs, meeting notes, checklists, and code snippets — stored locally in {notesStorageEngine}.
            </p>
          </div>
          <GlowButton variant="primary" onClick={() => handleCreateNote()}>
            <Plus className="w-4 h-4" />
            <span>Create Your First Note</span>
          </GlowButton>
        </GlassCard>
      ) : filteredNotes.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            No notes match these filters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try clearing your search query or switching color categories.
          </p>
          <div className="pt-1 flex items-center justify-center gap-2.5">
            <GlowButton variant="secondary" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </GlowButton>
            <GlowButton variant="primary" size="sm" onClick={() => handleCreateNote()}>
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </GlowButton>
          </div>
        </GlassCard>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-cyan-400">
                  Pinned Notes ({pinnedNotes.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={note.id === activeNote?.id}
                    onSelect={handleSelectNote}
                    onTogglePin={togglePinNote}
                    onRequestDelete={setNotePendingDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {regularNotes.length > 0 && (
            <section className="space-y-3">
              {pinnedNotes.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  All Notes ({regularNotes.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {regularNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={note.id === activeNote?.id}
                    onSelect={handleSelectNote}
                    onTogglePin={togglePinNote}
                    onRequestDelete={setNotePendingDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Split-Pane Editor Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Index Pane (Hidden on mobile when editor is open) */}
          <GlassCard
            className={`lg:col-span-4 p-3.5 space-y-4 lg:max-h-[700px] lg:overflow-y-auto ${
              mobileEditorOpen ? 'hidden lg:block' : 'block'
            }`}
          >
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-cyan-400">
                  Pinned ({pinnedNotes.length})
                </p>
                <div className="space-y-2">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      compact
                      isSelected={note.id === activeNote?.id}
                      onSelect={handleSelectNote}
                      onTogglePin={togglePinNote}
                      onRequestDelete={setNotePendingDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {regularNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.length > 0 && (
                  <p className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    All Notes ({regularNotes.length})
                  </p>
                )}
                <div className="space-y-2">
                  {regularNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      compact
                      isSelected={note.id === activeNote?.id}
                      onSelect={handleSelectNote}
                      onTogglePin={togglePinNote}
                      onRequestDelete={setNotePendingDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Right Rich Text Editor Pane */}
          <div
            className={`lg:col-span-8 min-w-0 ${
              mobileEditorOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {activeNote ? (
              <RichTextEditor
                note={activeNote}
                storageEngine={notesStorageEngine}
                onUpdate={updateNote}
                onTogglePin={togglePinNote}
                onDuplicate={handleDuplicateNote}
                onRequestDelete={setNotePendingDelete}
                onBackMobile={() => setMobileEditorOpen(false)}
              />
            ) : (
              <GlassCard className="p-10 text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select a note from the list or create a new one to begin editing.
                </p>
                <GlowButton variant="primary" size="sm" onClick={() => handleCreateNote()}>
                  <Plus className="w-4 h-4" />
                  <span>New Note</span>
                </GlowButton>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* Safe Note Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(notePendingDelete)}
        title="Delete this note?"
        description={
          notePendingDelete
            ? `"${notePendingDelete.title || 'Untitled Note'}" will be permanently removed from your local ${notesStorageEngine} store.`
            : ''
        }
        detail="Export a JSON backup from Settings first if you want to archive your notes."
        confirmLabel="Delete Note"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setNotePendingDelete(null)}
      />
    </PageTransition>
  );
};
