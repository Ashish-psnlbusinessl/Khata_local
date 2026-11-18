import { Capacitor } from '@capacitor/core';

// Saves/shares a text file. In the Android app it opens the share sheet (save to Drive, WhatsApp, etc.);
// in a browser it downloads the file.
export async function saveFile(filename, text, mime = 'text/csv') {
  const data = mime === 'text/csv' ? '﻿' + text : text; // BOM so Excel reads Hindi/Unicode correctly

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: res.uri });
    return;
  }

  const blob = new Blob([data], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file'));
    r.readAsText(file);
  });
