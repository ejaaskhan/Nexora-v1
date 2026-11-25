import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SyncMetadata, WorkspaceData } from '../types/productivity';
import { createExportEnvelope, parseBackupJson } from '../utils/backup';
import { getTodayISO } from '../utils/date';
import {
  CloudSyncAdapter,
  RemoteBackupRecord,
  SyncOperationResult,
  SyncProviderStatus,
} from './syncAdapter';

export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'] as const;

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  sizeBytes: number;
}

export class DriveApiError extends Error {
  readonly status: number;
  readonly isUnauthorized: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
    this.isUnauthorized = status === 401;
  }
}

// Initialize Firebase App once using the provisioned applet configuration
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

// Security requirement: OAuth access token is kept strictly in memory (never localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveAuthSnapshot {
  user: User | null;
  hasAccessToken: boolean;
}

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleDriveAccessToken(): void {
  cachedAccessToken = null;
}

export function getGoogleDriveUser(): User | null {
  return firebaseAuth.currentUser;
}

export function initGoogleDriveAuth(
  onChange: (snapshot: DriveAuthSnapshot) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      onChange({ user: null, hasAccessToken: false });
      return;
    }

    if (!isSigningIn && !cachedAccessToken) {
      onChange({ user, hasAccessToken: false });
      return;
    }

    onChange({ user, hasAccessToken: Boolean(cachedAccessToken) });
  });
}

export async function signInWithGoogleDrive(): Promise<{
  user: User;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  GOOGLE_DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });

  isSigningIn = true;
  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken ?? null;
    if (!accessToken) {
      throw new Error(
        'Google Drive permission was not granted. Please allow access to save NEXORA backup files.'
      );
    }
    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  await signOut(firebaseAuth);
}

async function handleDriveResponse(response: Response): Promise<Response> {
  if (response.ok) return response;

  if (response.status === 401) {
    cachedAccessToken = null;
    throw new DriveApiError(
      'Your Google Drive session expired. Please sign in with Google again.',
      401
    );
  }

  let detail = `Google Drive request failed (${response.status}).`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body?.error?.message) {
      detail = body.error.message;
    }
  } catch {
    // Ignore non-JSON error payloads
  }

  throw new DriveApiError(detail, response.status);
}

interface RawDriveFile {
  id?: string;
  name?: string;
  modifiedTime?: string;
  size?: string;
}

function normalizeDriveFile(raw: RawDriveFile): DriveBackupFile {
  return {
    id: raw.id ?? '',
    name: raw.name ?? 'nexora-backup.json',
    modifiedTime: raw.modifiedTime ?? new Date().toISOString(),
    sizeBytes: raw.size ? Number.parseInt(raw.size, 10) || 0 : 0,
  };
}

function buildBackupFilename(label?: string): string {
  const datePart = getTodayISO();
  const timePart = new Date().toISOString().slice(11, 16).replace(':', '');
  const cleanLabel = (label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  if (cleanLabel) {
    return `nexora-backup-${datePart}-${cleanLabel}.json`;
  }
  return `nexora-backup-${datePart}-${timePart}.json`;
}

export async function listDriveBackups(accessToken: string): Promise<DriveBackupFile[]> {
  const query = "name contains 'nexora-backup' and mimeType='application/json' and trashed=false";
  const url = `${DRIVE_FILES_API}?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime%20desc&pageSize=20`;

  const response = await handleDriveResponse(
    await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  );

  const json = (await response.json()) as { files?: RawDriveFile[] };
  return (json.files ?? [])
    .filter((f) => Boolean(f.id))
    .map(normalizeDriveFile);
}

export async function uploadNewDriveBackup(
  accessToken: string,
  data: WorkspaceData,
  label?: string
): Promise<DriveBackupFile> {
  const envelope = createExportEnvelope(data);
  const payload = JSON.stringify(envelope, null, 2);
  const filename = buildBackupFilename(label);

  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: 'NEXORA Workspace Backup',
  };

  const boundary = `nexora_boundary_${Date.now().toString(36)}`;
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    payload,
    `--${boundary}--`,
  ].join('\r\n');

  const url = `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime,size`;
  const response = await handleDriveResponse(
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })
  );

  const raw = (await response.json()) as RawDriveFile;
  return normalizeDriveFile(raw);
}

export async function overwriteDriveBackup(
  accessToken: string,
  fileId: string,
  data: WorkspaceData
): Promise<DriveBackupFile> {
  const envelope = createExportEnvelope(data);
  const payload = JSON.stringify(envelope, null, 2);

  const url = `${DRIVE_UPLOAD_API}/${encodeURIComponent(
    fileId
  )}?uploadType=media&fields=id,name,modifiedTime,size`;
  const response = await handleDriveResponse(
    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: payload,
    })
  );

  const raw = (await response.json()) as RawDriveFile;
  return normalizeDriveFile(raw);
}

export async function downloadDriveBackup(
  accessToken: string,
  fileId: string
): Promise<string> {
  const url = `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`;
  const response = await handleDriveResponse(
    await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  );

  return response.text();
}

export async function deleteDriveBackup(
  accessToken: string,
  fileId: string
): Promise<void> {
  const url = `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`;
  await handleDriveResponse(
    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  );
}

/**
 * Concrete Google Drive CloudSyncAdapter implementation conforming to NEXORA's
 * vendor-agnostic CloudSyncAdapter interface.
 */
class GoogleDriveSyncAdapterImpl implements CloudSyncAdapter {
  readonly id = 'google-drive';
  readonly name = 'Google Drive Backup Adapter';
  readonly description =
    'Encrypted-in-transit JSON snapshots stored in your personal Google Drive via least-privilege drive.file access.';
  readonly status: SyncProviderStatus = 'active';
  readonly supportsRealtime = false;
  readonly supportsSnapshots = true;

  async pushWorkspace(data: WorkspaceData, _meta: SyncMetadata): Promise<SyncOperationResult> {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      return {
        ok: false,
        message: 'Sign in with Google Drive in Data & Backups to upload a cloud backup.',
      };
    }
    const created = await uploadNewDriveBackup(token, data);
    return {
      ok: true,
      syncedAt: created.modifiedTime,
      message: `Uploaded ${created.name} to Google Drive.`,
    };
  }

  async pullWorkspace(): Promise<{ ok: boolean; data?: WorkspaceData; message: string }> {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      return { ok: false, message: 'Sign in with Google Drive first.' };
    }
    const files = await listDriveBackups(token);
    if (files.length === 0) {
      return { ok: false, message: 'No NEXORA backup files found in Google Drive.' };
    }
    const rawText = await downloadDriveBackup(token, files[0].id);
    const parsed = parseBackupJson(rawText);
    if (!parsed.ok) {
      return { ok: false, message: parsed.error };
    }
    return {
      ok: true,
      data: parsed.data,
      message: `Loaded latest backup ${files[0].name}.`,
    };
  }

  async listRemoteSnapshots(): Promise<RemoteBackupRecord[]> {
    const token = getGoogleDriveAccessToken();
    if (!token) return [];
    const files = await listDriveBackups(token);
    return files.map((file) => ({
      id: file.id,
      name: file.name,
      updatedAt: file.modifiedTime,
      sizeBytes: file.sizeBytes,
    }));
  }

  async deleteRemoteSnapshot(remoteId: string): Promise<SyncOperationResult> {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      return { ok: false, message: 'Sign in with Google Drive first.' };
    }
    await deleteDriveBackup(token, remoteId);
    return { ok: true, message: 'Deleted Google Drive backup file.' };
  }
}

export const googleDriveSyncAdapter: CloudSyncAdapter = new GoogleDriveSyncAdapterImpl();
