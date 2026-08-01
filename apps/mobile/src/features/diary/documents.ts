/**
 * Case documents: scanned orders, copy certificates, a photographed order sheet.
 *
 * WHERE THE FILES LIVE, AND WHY. Every file is copied into the app's own
 * document directory — private to this app, not the shared photo roll, and never
 * uploaded. A case document is privileged client material; D-029's position is
 * that we take no custody of it, and that position is worth more than the
 * convenience of sync. Server storage would need per-user auth to scope files at
 * all, and auth is still blocked on SMTP (D-021), so this is also the only thing
 * currently buildable.
 *
 * COPIED, not referenced. A picker hands back a URI into a cache or a provider
 * that the OS may reclaim at any time; keeping only that reference is how a
 * document silently disappears months later. The copy is the record.
 *
 * The consequence to be honest about: these files belong to the device that
 * stored them. An imported diary carries paths that resolve nowhere, so
 * `documentExists` is checked before anything is offered for opening.
 */
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { diaryUid, type CaseDocument } from "@nexlex/shared";

/** Everything this feature writes lives under one directory we own, inside the
 * app's document directory — which the OS does not reclaim, unlike the cache. */
function root(): Directory {
  const dir = new Directory(Paths.document, "case-documents");
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Keeps the extension (so the OS opens it with the right app) and nothing else
 * from the original name — a filename is user input and this is a path. */
function safeName(name: string, id: string): string {
  const ext = /\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1]?.toLowerCase();
  return ext ? `${id}.${ext}` : id;
}

async function adopt(
  sourceUri: string,
  displayName: string,
  mimeType?: string,
): Promise<CaseDocument | null> {
  try {
    const id = diaryUid();
    const target = new File(root(), safeName(displayName, id));
    await new File(sourceUri).copy(target);
    return {
      id,
      name: displayName,
      mimeType,
      uri: target.uri,
      size: target.size ?? undefined,
      addedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Photograph an order or the order sheet — the common case, done in court. */
export async function attachFromCamera(): Promise<CaseDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return adopt(asset.uri, asset.fileName ?? `Photo ${new Date().toLocaleDateString("en-IN")}`, asset.mimeType);
}

export async function attachFromLibrary(): Promise<CaseDocument | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return adopt(asset.uri, asset.fileName ?? "Image", asset.mimeType);
}

/** PDFs — a downloaded certified copy, a filed pleading. */
export async function attachFromFiles(): Promise<CaseDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return adopt(asset.uri, asset.name, asset.mimeType);
}

/** Whether the file behind a record is actually present on this device. */
export function documentExists(doc: CaseDocument): boolean {
  try {
    return new File(doc.uri).exists;
  } catch {
    return false;
  }
}

/**
 * Removes the file as well as the record. Detaching a privileged document must
 * actually delete it — leaving the bytes in the sandbox while the UI says it is
 * gone would be the worst of both.
 */
export function deleteDocumentFile(doc: CaseDocument): void {
  try {
    const file = new File(doc.uri);
    if (file.exists) file.delete();
  } catch {
    // already gone, or unreadable — the record is dropped either way
  }
}

/** "1.4 MB" — size is shown because a 30 MB scan is worth noticing on a phone. */
export function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
