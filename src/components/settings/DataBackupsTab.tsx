import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  History,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { BackupSnapshot } from '../../types/productivity';
import {
  formatBytesCompact,
  parseBackupJson,
  ParsedBackupResult,
} from '../../utils/backup';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { GoogleDriveBackupCard } from './GoogleDriveBackupCard';

type ExportableCollection =
  | 'tasks'
  | 'notes'
  | 'goals'
  | 'events'
  | 'timeBlocks'
  | 'sessions'
  | 'settings';

const COLLECTION_OPTIONS: Array<{ key: ExportableCollection; label: string }> = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
  { key: 'goals', label: 'Goals' },
  { key: 'events', label: 'Calendar Events' },
  { key: 'timeBlocks', label: 'Time Blocks' },
  { key: 'sessions', label: 'Focus History' },
  { key: 'settings', label: 'Preferences' },
];

const SOURCE_LABELS: Record<BackupSnapshot['source'], string> = {
  manual: 'Manual Snapshot',
  'pre-import': 'Pre-Import Safety',
  'auto-safety': 'Auto Safety Backup',
};

export const DataBackupsTab: React.FC = () => {
  const {
    tasks,
    notes,
    goals,
    events,
    timeBlocks,
    sessions,
    snapshots,
    storageEngine,
    estimatedStorageBytes,
    exportBackup,
    exportSelectiveBackup,
    importBackup,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    resetToSampleData,
    clearAllData,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<ParsedBackupResult | null>(null);
  const [importError, setImportError] = useState('');

  // Selective export
  const [showSelective, setShowSelective] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<ExportableCollection[]>([
    'tasks',
    'notes',
    'goals',
    'events',
  ]);

  // Local restore-point snapshot creation
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // Confirm dialogs for safe mutations
  const [confirmReplaceImport, setConfirmReplaceImport] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<{
    snapshot: BackupSnapshot;
    strategy: 'merge' | 'replace';
  } | null>(null);
  const [snapshotToDelete, setSnapshotToDelete] = useState<BackupSnapshot | null>(null);
  const [confirmResetSample, setConfirmResetSample] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setPendingImport(null);

    try {
      const text = await file.text();
      const result = parseBackupJson(text);
      if (result.ok) {
        setPendingImport(result);
      } else {
        setImportError(result.error);
      }
    } catch {
      setImportError('Unable to read the selected file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectiveKey = (key: ExportableCollection) => {
    setSelectedExportKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSnapshot(true);
    try {
      await createSnapshot(snapshotLabel.trim() || undefined, 'manual');
      setSnapshotLabel('');
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Google Drive Cloud Backups */}
      <GoogleDriveBackupCard />

      {/* JSON Export & Import */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Data Export &amp; Import
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download portable NEXORA JSON backups or restore data with schema validation
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-purple-600 dark:text-cyan-300">
            {storageEngine} · {formatBytesCompact(estimatedStorageBytes)}
          </span>
        </div>

        <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {tasks.length} tasks · {notes.length} notes · {goals.length} goals · {events.length}{' '}
          events · {timeBlocks.length} blocks · {sessions.length} sessions
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <GlowButton variant="primary" onClick={exportBackup}>
            <Download className="w-4 h-4" />
            <span>Export Full JSON</span>
          </GlowButton>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <GlowButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>Import JSON File</span>
          </GlowButton>

          <GlowButton
            variant="ghost"
            size="sm"
            onClick={() => setShowSelective((v) => !v)}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showSelective ? 'Hide Selective Export' : 'Selective Export'}</span>
          </GlowButton>
        </div>

        {showSelective && (
          <div className="pt-4 border-t nx-divider space-y-3">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Choose specific collections to include in your JSON download
            </p>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_OPTIONS.map((opt) => {
                const checked = selectedExportKeys.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleSelectiveKey(opt.key)}
                    aria-pressed={checked}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      checked
                        ? 'border-purple-500/50 dark:border-cyan-400/50 bg-purple-500/12 dark:bg-cyan-400/12 text-slate-950 dark:text-white'
                        : 'nx-divider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div>
              <GlowButton
                variant="secondary"
                size="sm"
                disabled={selectedExportKeys.length === 0}
                onClick={() => exportSelectiveBackup(selectedExportKeys)}
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  Download Selected ({selectedExportKeys.length})
                </span>
              </GlowButton>
            </div>
          </div>
        )}

        {importError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {pendingImport && (
          <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 dark:text-slate-100">
                <p className="font-semibold">Validated NEXORA backup ready to import</p>
                <p className="mt-0.5 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {pendingImport.summary.tasks} tasks · {pendingImport.summary.goals} goals ·{' '}
                  {pendingImport.summary.events} events · {pendingImport.summary.notes} notes ·{' '}
                  {pendingImport.summary.timeBlocks} blocks · {pendingImport.summary.sessions}{' '}
                  sessions
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GlowButton
                variant="primary"
                size="sm"
                onClick={() => {
                  importBackup(pendingImport.data, 'merge');
                  setPendingImport(null);
                }}
              >
                Merge with Current Data
              </GlowButton>
              <GlowButton
                variant="secondary"
                size="sm"
                onClick={() => setConfirmReplaceImport(true)}
              >
                Replace All Data
              </GlowButton>
              <GlowButton variant="ghost" size="sm" onClick={() => setPendingImport(null)}>
                Cancel
              </GlowButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Local On-Device Backup Restore Points */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
              <span>On-Device Backup Restore Points</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Save named point-in-time snapshots directly in {storageEngine} (up to 12 kept locally)
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {snapshots.length}/12 saved
          </span>
        </div>

        <form onSubmit={(e) => void handleCreateSnapshot(e)} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={snapshotLabel}
            onChange={(e) => setSnapshotLabel(e.target.value)}
            placeholder="Optional label (e.g. Before Q4 sprint cleanup)"
            aria-label="Restore point label"
            className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
          />
          <GlowButton type="submit" variant="primary" disabled={savingSnapshot}>
            <Save className="w-4 h-4" />
            <span>{savingSnapshot ? 'Saving...' : 'Save Restore Point'}</span>
          </GlowButton>
        </form>

        {snapshots.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border nx-divider">
            No restore points saved yet. Create a snapshot before major changes—NEXORA also creates
            automatic safety snapshots before full replacements or resets.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70 rounded-xl border nx-divider overflow-hidden">
            {snapshots.map((snap) => (
              <li
                key={snap.id}
                className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950 dark:text-white truncate">
                    {snap.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {SOURCE_LABELS[snap.source]} ·{' '}
                    <span className="font-mono tabular-nums">
                      {formatRelativeTime(snap.createdAt)}
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono tabular-nums">
                      {formatBytesCompact(snap.sizeBytes)}
                    </span>
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 mt-0.5">
                    {snap.summary.tasks} tasks · {snap.summary.notes} notes · {snap.summary.goals}{' '}
                    goals · {snap.summary.events} events · {snap.summary.sessions} sessions
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSnapshotToRestore({ snapshot: snap, strategy: 'merge' })
                    }
                  >
                    Merge
                  </GlowButton>
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSnapshotToRestore({ snapshot: snap, strategy: 'replace' })
                    }
                  >
                    Restore
                  </GlowButton>
                  <button
                    type="button"
                    onClick={() => setSnapshotToDelete(snap)}
                    aria-label={`Delete restore point ${snap.label}`}
                    className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {/* Workspace Reset & Clear */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Workspace Recovery &amp; Reset
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            An automatic safety restore point is captured before resetting or clearing data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlowButton variant="secondary" size="sm" onClick={() => setConfirmResetSample(true)}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Sample Data</span>
          </GlowButton>
          <GlowButton variant="danger" size="sm" onClick={() => setConfirmClearAll(true)}>
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Workspace Data</span>
          </GlowButton>
        </div>
      </GlassCard>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmReplaceImport && pendingImport !== null}
        title="Replace current workspace data?"
        description="Importing with Replace will overwrite your current tasks, notes, goals, events, time blocks, and focus sessions with the selected JSON file."
        detail="A pre-import safety restore point will be saved automatically in local backups first."
        confirmLabel="Replace Workspace"
        tone="danger"
        onCancel={() => setConfirmReplaceImport(false)}
        onConfirm={() => {
          if (pendingImport) {
            importBackup(pendingImport.data, 'replace');
            setPendingImport(null);
          }
          setConfirmReplaceImport(false);
        }}
      />

      <ConfirmDialog
        open={snapshotToRestore !== null}
        title={
          snapshotToRestore?.strategy === 'replace'
            ? 'Restore snapshot and replace current data?'
            : 'Merge snapshot into current workspace?'
        }
        description={
          snapshotToRestore
            ? snapshotToRestore.strategy === 'replace'
              ? `Restore "${snapshotToRestore.snapshot.label}"? Current workspace collections will be replaced.`
              : `Combine records from "${snapshotToRestore.snapshot.label}" using your active merge conflict policy.`
            : ''
        }
        detail={
          snapshotToRestore?.strategy === 'replace'
            ? 'A safety restore point of your current state is saved automatically before restoring.'
            : undefined
        }
        confirmLabel={snapshotToRestore?.strategy === 'replace' ? 'Restore Snapshot' : 'Merge Snapshot'}
        tone={snapshotToRestore?.strategy === 'replace' ? 'danger' : 'primary'}
        onCancel={() => setSnapshotToRestore(null)}
        onConfirm={() => {
          if (snapshotToRestore) {
            restoreSnapshot(snapshotToRestore.snapshot.id, snapshotToRestore.strategy);
            setSnapshotToRestore(null);
          }
        }}
      />

      <ConfirmDialog
        open={snapshotToDelete !== null}
        title="Delete backup restore point?"
        description={
          snapshotToDelete
            ? `Permanently delete local snapshot "${snapshotToDelete.label}"?`
            : ''
        }
        confirmLabel="Delete Snapshot"
        tone="danger"
        onCancel={() => setSnapshotToDelete(null)}
        onConfirm={() => {
          if (snapshotToDelete) {
            void deleteSnapshot(snapshotToDelete.id);
            setSnapshotToDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmResetSample}
        title="Restore starter sample workspace?"
        description="This replaces your active workspace items with NEXORA's starter tasks, notes, goals, events, and focus history."
        detail="An automatic pre-reset backup restore point will be saved locally so you can undo anytime."
        confirmLabel="Restore Sample Data"
        tone="primary"
        onCancel={() => setConfirmResetSample(false)}
        onConfirm={() => {
          resetToSampleData();
          setConfirmResetSample(false);
        }}
      />

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear all local workspace records?"
        description="Remove every task, smart note, goal, calendar event, scheduled time block, and focus session from your active workspace."
        detail="A pre-clear safety snapshot will be saved in Restore Points in case you need to recover."
        confirmLabel="Clear All Data"
        tone="danger"
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={() => {
          clearAllData();
          setConfirmClearAll(false);
        }}
      />
    </div>
  );
};
