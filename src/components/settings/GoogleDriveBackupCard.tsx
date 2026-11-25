import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  LogOut,
  RefreshCw,
  Replace,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import {
  deleteDriveBackup,
  downloadDriveBackup,
  DriveApiError,
  DriveBackupFile,
  getGoogleDriveAccessToken,
  initGoogleDriveAuth,
  listDriveBackups,
  overwriteDriveBackup,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadNewDriveBackup,
} from '../../platform/googleDrive';
import {
  formatBytesCompact,
  parseBackupJson,
  ParsedBackupResult,
} from '../../utils/backup';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const GoogleGLogo: React.FC = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export const GoogleDriveBackupCard: React.FC = () => {
  const {
    getWorkspaceSnapshot,
    importBackup,
    markExternalSyncComplete,
    pushToast,
    syncMeta,
  } = useWorkspace();

  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(getGoogleDriveAccessToken()));
  const [authLoading, setAuthLoading] = useState(false);

  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [backupLabel, setBackupLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Downloaded & validated Drive backup awaiting user Merge/Replace choice
  const [downloadedBackup, setDownloadedBackup] = useState<{
    file: DriveBackupFile;
    parsed: ParsedBackupResult;
  } | null>(null);

  // Explicit confirmation dialog targets (required for all mutating/destructive Drive actions)
  const [fileToOverwrite, setFileToOverwrite] = useState<DriveBackupFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveBackupFile | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{
    file: DriveBackupFile;
    parsed: ParsedBackupResult;
    strategy: 'merge' | 'replace';
  } | null>(null);

  const handleDriveError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof DriveApiError && err.isUnauthorized) {
      setHasToken(false);
      setBackups([]);
      setErrorMessage(err.message);
      return;
    }
    const msg = err instanceof Error && err.message ? err.message : fallback;
    setErrorMessage(msg);
  }, []);

  const refreshBackups = useCallback(
    async (explicitToken?: string) => {
      const token = explicitToken ?? getGoogleDriveAccessToken();
      if (!token) {
        setHasToken(false);
        return;
      }
      setLoadingList(true);
      setErrorMessage('');
      try {
        const files = await listDriveBackups(token);
        setBackups(files);
      } catch (err) {
        handleDriveError(err, 'Could not load your Google Drive backups.');
      } finally {
        setLoadingList(false);
      }
    },
    [handleDriveError]
  );

  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(({ user, hasAccessToken }) => {
      setDriveUser(user);
      setHasToken(hasAccessToken);
      if (user && hasAccessToken) {
        void refreshBackups();
      } else {
        setBackups([]);
      }
    });
    return unsubscribe;
  }, [refreshBackups]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setErrorMessage('');
    try {
      const { user, accessToken } = await signInWithGoogleDrive();
      setDriveUser(user);
      setHasToken(true);
      pushToast({
        title: 'Connected to Google Drive',
        description: user.email ?? 'Ready to back up and restore your workspace.',
        tone: 'success',
      });
      await refreshBackups(accessToken);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Google Sign-In was cancelled or blocked by your browser.';
      setErrorMessage(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setErrorMessage('');
    try {
      await signOutGoogleDrive();
      setDriveUser(null);
      setHasToken(false);
      setBackups([]);
      setDownloadedBackup(null);
      pushToast({ title: 'Disconnected Google Drive', tone: 'neutral' });
    } catch (err) {
      handleDriveError(err, 'Unable to sign out of Google Drive.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUploadNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setHasToken(false);
      setErrorMessage('Please sign in with Google to upload a backup.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    try {
      const created = await uploadNewDriveBackup(
        token,
        getWorkspaceSnapshot(),
        backupLabel.trim() || undefined
      );
      setBackupLabel('');
      markExternalSyncComplete('google-drive', created.modifiedTime);
      pushToast({
        title: 'Backed up to Google Drive',
        description: created.name,
        tone: 'success',
      });
      await refreshBackups(token);
    } catch (err) {
      handleDriveError(err, 'Failed to upload workspace backup to Google Drive.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!fileToOverwrite) return;
    const target = fileToOverwrite;
    setFileToOverwrite(null);

    const token = getGoogleDriveAccessToken();
    if (!token) {
      setHasToken(false);
      setErrorMessage('Please sign in with Google before overwriting a backup.');
      return;
    }

    setBusyFileId(target.id);
    setErrorMessage('');
    try {
      const updated = await overwriteDriveBackup(token, target.id, getWorkspaceSnapshot());
      markExternalSyncComplete('google-drive', updated.modifiedTime);
      pushToast({
        title: 'Drive backup updated',
        description: `Overwrote ${updated.name}`,
        tone: 'success',
      });
      await refreshBackups(token);
    } catch (err) {
      handleDriveError(err, `Failed to overwrite ${target.name}.`);
    } finally {
      setBusyFileId(null);
    }
  };

  const handleDownloadForRestore = async (file: DriveBackupFile) => {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setHasToken(false);
      setErrorMessage('Please sign in with Google to download backups.');
      return;
    }

    setBusyFileId(file.id);
    setErrorMessage('');
    setDownloadedBackup(null);
    try {
      const rawJson = await downloadDriveBackup(token, file.id);
      const parsed = parseBackupJson(rawJson);
      if (!parsed.ok) {
        setErrorMessage(`${file.name}: ${parsed.error}`);
        return;
      }
      setDownloadedBackup({ file, parsed });
    } catch (err) {
      handleDriveError(err, `Failed to download ${file.name}.`);
    } finally {
      setBusyFileId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const target = fileToDelete;
    setFileToDelete(null);

    const token = getGoogleDriveAccessToken();
    if (!token) {
      setHasToken(false);
      setErrorMessage('Please sign in with Google before deleting a backup.');
      return;
    }

    setBusyFileId(target.id);
    setErrorMessage('');
    try {
      await deleteDriveBackup(token, target.id);
      if (downloadedBackup?.file.id === target.id) {
        setDownloadedBackup(null);
      }
      pushToast({
        title: 'Drive backup deleted',
        description: target.name,
        tone: 'neutral',
      });
      await refreshBackups(token);
    } catch (err) {
      handleDriveError(err, `Failed to delete ${target.name}.`);
    } finally {
      setBusyFileId(null);
    }
  };

  const isConnected = Boolean(driveUser && hasToken);

  return (
    <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-purple-600 dark:text-cyan-400 shrink-0" />
            <span>Google Drive Cloud Backups</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Back up and restore your complete NEXORA workspace directly to your personal Google Drive
          </p>
        </div>

        {syncMeta.lastSyncedAt && syncMeta.activeProviderId === 'google-drive' && (
          <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
            Last Drive sync · {formatRelativeTime(syncMeta.lastSyncedAt)}
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="rounded-xl border nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-medium text-slate-900 dark:text-white">
                {driveUser
                  ? `Session refresh required for ${driveUser.email ?? 'your Google account'}`
                  : 'Private, app-scoped Google Drive backup'}
              </p>
              <p>
                NEXORA requests least-privilege <span className="font-mono">drive.file</span>{' '}
                permission—it can only read and update NEXORA backup files created by this app. Your
                access token stays strictly in memory for this session.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={authLoading}
              className="inline-flex items-center justify-center gap-3 min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300/90 shadow-sm font-medium text-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              <GoogleGLogo />
              <span>{authLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Connected account bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-950 dark:text-white truncate">
                {driveUser?.displayName || 'Google Account Connected'}
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                {driveUser?.email}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <GlowButton
                variant="secondary"
                size="sm"
                disabled={loadingList}
                onClick={() => void refreshBackups()}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </GlowButton>
              <GlowButton
                variant="ghost"
                size="sm"
                disabled={authLoading}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </GlowButton>
            </div>
          </div>

          {/* Create new Drive backup form */}
          <form onSubmit={(e) => void handleUploadNew(e)} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="Optional backup label (e.g. weekly-archive)"
              aria-label="Google Drive backup label"
              className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            />
            <GlowButton type="submit" variant="primary" disabled={uploading}>
              <CloudUpload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Back Up to Google Drive'}</span>
            </GlowButton>
          </form>

          {/* Downloaded Drive backup preview & restore choices */}
          {downloadedBackup && (
            <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 dark:text-slate-100 min-w-0">
                  <p className="font-semibold truncate">
                    Validated Drive backup: {downloadedBackup.file.name}
                  </p>
                  <p className="mt-0.5 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {downloadedBackup.parsed.summary.tasks} tasks ·{' '}
                    {downloadedBackup.parsed.summary.goals} goals ·{' '}
                    {downloadedBackup.parsed.summary.events} events ·{' '}
                    {downloadedBackup.parsed.summary.notes} notes ·{' '}
                    {downloadedBackup.parsed.summary.timeBlocks} blocks ·{' '}
                    {downloadedBackup.parsed.summary.sessions} sessions
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GlowButton
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setRestoreConfirm({
                      file: downloadedBackup.file,
                      parsed: downloadedBackup.parsed,
                      strategy: 'merge',
                    })
                  }
                >
                  Merge with Current Data
                </GlowButton>
                <GlowButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setRestoreConfirm({
                      file: downloadedBackup.file,
                      parsed: downloadedBackup.parsed,
                      strategy: 'replace',
                    })
                  }
                >
                  Replace Local Workspace
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setDownloadedBackup(null)}
                >
                  Cancel
                </GlowButton>
              </div>
            </div>
          )}

          {/* Drive Backups List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Saved NEXORA Backups in Google Drive
              </span>
              <span className="font-mono tabular-nums">{backups.length} files</span>
            </div>

            {loadingList && backups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border nx-divider">
                Loading your NEXORA backup files from Google Drive...
              </div>
            ) : backups.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border nx-divider">
                No NEXORA backups found in Google Drive yet. Click &ldquo;Back Up to Google
                Drive&rdquo; above to save your first cloud snapshot.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70 rounded-xl border nx-divider overflow-hidden">
                {backups.map((file) => {
                  const isBusy = busyFileId === file.id;
                  return (
                    <li
                      key={file.id}
                      className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-950 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                          Updated {formatRelativeTime(file.modifiedTime)}
                          {file.sizeBytes > 0 ? ` · ${formatBytesCompact(file.sizeBytes)}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <GlowButton
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleDownloadForRestore(file)}
                        >
                          <CloudDownload className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                          <span>{isBusy ? 'Loading...' : 'Restore'}</span>
                        </GlowButton>
                        <GlowButton
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => setFileToOverwrite(file)}
                        >
                          <Replace className="w-3.5 h-3.5" />
                          <span>Overwrite</span>
                        </GlowButton>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setFileToDelete(file)}
                          aria-label={`Delete Google Drive backup ${file.name}`}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mandatory Confirmation Dialogs for Mutating / Destructive Actions */}
      <ConfirmDialog
        open={fileToOverwrite !== null}
        title="Overwrite backup in Google Drive?"
        description={
          fileToOverwrite
            ? `Replace the contents of "${fileToOverwrite.name}" in your Google Drive with your current local NEXORA workspace?`
            : ''
        }
        detail="The previous cloud version stored in that file will be replaced with your current tasks, notes, goals, events, time blocks, focus sessions, and settings."
        confirmLabel="Overwrite Drive File"
        tone="primary"
        onCancel={() => setFileToOverwrite(null)}
        onConfirm={() => void handleConfirmOverwrite()}
      />

      <ConfirmDialog
        open={fileToDelete !== null}
        title="Delete backup from Google Drive?"
        description={
          fileToDelete
            ? `Permanently delete "${fileToDelete.name}" from your Google Drive?`
            : ''
        }
        detail="Your local on-device NEXORA data will remain untouched."
        confirmLabel="Delete from Drive"
        tone="danger"
        onCancel={() => setFileToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <ConfirmDialog
        open={restoreConfirm !== null}
        title={
          restoreConfirm?.strategy === 'replace'
            ? 'Replace local workspace from Google Drive?'
            : 'Merge Google Drive backup into workspace?'
        }
        description={
          restoreConfirm
            ? restoreConfirm.strategy === 'replace'
              ? `Replace all current local tasks, notes, goals, events, time blocks, and focus history with "${restoreConfirm.file.name}"?`
              : `Combine records from "${restoreConfirm.file.name}" into your current workspace using your active conflict resolution strategy (${syncMeta.conflictStrategy})?`
            : ''
        }
        detail={
          restoreConfirm?.strategy === 'replace'
            ? 'NEXORA will automatically capture a local Pre-Import Safety Backup before replacing your current data.'
            : undefined
        }
        confirmLabel={
          restoreConfirm?.strategy === 'replace' ? 'Replace Local Data' : 'Merge Backup'
        }
        tone={restoreConfirm?.strategy === 'replace' ? 'danger' : 'primary'}
        onCancel={() => setRestoreConfirm(null)}
        onConfirm={() => {
          if (restoreConfirm) {
            importBackup(restoreConfirm.parsed.data, restoreConfirm.strategy);
            setDownloadedBackup(null);
            setRestoreConfirm(null);
          }
        }}
      />
    </GlassCard>
  );
};
