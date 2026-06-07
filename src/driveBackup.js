const SCOPES = 'https://www.googleapis.com/auth/drive.appdata email profile';
const FILE_NAME = 'healthtracker_backup.json';

let _tokenClient = null;
let _accessToken = null;
let _tokenExpiry = 0;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function initDriveAuth() {
  if (_tokenClient) return;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('NO_CLIENT_ID');
  await loadScript('https://accounts.google.com/gsi/client');
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {},
  });
}

export function requestToken(silent = false) {
  return new Promise((resolve, reject) => {
    _tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      _accessToken = resp.access_token;
      _tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
      resolve(_accessToken);
    };
    _tokenClient.requestAccessToken({ prompt: silent ? 'none' : '' });
  });
}

export async function getValidToken() {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken;
  return requestToken(true);
}

export function clearToken() {
  if (_accessToken) {
    window.google.accounts.oauth2.revoke(_accessToken, () => {});
  }
  _accessToken = null;
  _tokenExpiry = 0;
}

export async function getUserInfo() {
  const token = await getValidToken();
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to get user info');
  return res.json();
}

async function findBackupFile(token) {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to list Drive files');
  const { files } = await res.json();
  return files?.[0] ?? null;
}

export async function backupToDrive(data) {
  const token = await getValidToken();
  const content = JSON.stringify(data);
  const existing = await findBackupFile(token);

  if (existing) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: content,
      }
    );
    if (!res.ok) throw new Error('Failed to update backup');
  } else {
    const boundary = 'htbnd' + Date.now();
    const meta = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] });
    const body =
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}` +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}` +
      `\r\n--${boundary}--`;
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) throw new Error('Failed to create backup');
  }
  return new Date().toISOString();
}

export async function restoreFromDrive() {
  const token = await getValidToken();
  const file = await findBackupFile(token);
  if (!file) return null;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to restore from Drive');
  const restored = await res.json();
  return { data: restored, modifiedTime: file.modifiedTime };
}

export async function getBackupInfo() {
  const token = await getValidToken();
  return findBackupFile(token);
}
