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

/**
 * The most a single document may be. A court order photographed on a modern
 * phone is 1-3 MB; a 25 MB one is a video or a mistake, and the sandbox has no
 * quota to warn anyone before it fills.
 */
const MAX_BYTES = 25 * 1024 * 1024;

/** Total the feature will hold before it asks for something to be deleted. */
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;

export class DocumentTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super("That file is too large to attach.");
    this.name = "DocumentTooLargeError";
  }
}

export class DocumentStoreFullError extends Error {
  constructor(readonly totalBytes: number) {
    super("Case documents are using too much space on this device.");
    this.name = "DocumentStoreFullError";
  }
}

/** Bytes currently held by every stored document. */
export function totalStoredBytes(): number {
  try {
    return root()
      .list()
      .reduce((sum, entry) => sum + (entry instanceof File ? (entry.size ?? 0) : 0), 0);
  } catch {
    return 0;
  }
}

async function adopt(
  sourceUri: string,
  displayName: string,
  mimeType?: string,
): Promise<CaseDocument | null> {
  const source = new File(sourceUri);

  // Refuse before copying, not after: a rejected file that has already been
  // written is the worst of both.
  const incoming = source.size ?? 0;
  if (incoming > MAX_BYTES) throw new DocumentTooLargeError(incoming);
  if (totalStoredBytes() + incoming > MAX_TOTAL_BYTES) {
    throw new DocumentStoreFullError(totalStoredBytes());
  }

  // Deduplicate on (size, name). Attaching the same order twice — easy to do
  // when a picker reopens on the last folder — used to write a second copy of
  // every byte, and nothing ever reclaimed it. Content hashing would be exact
  // but means reading the whole file; size and name catch the real case.
  const existing = findDuplicate(displayName, incoming);
  if (existing) return existing;

  try {
    const id = diaryUid();
    const target = new File(root(), safeName(displayName, id));
    await source.copy(target);
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

/**
 * An already-stored file with the same extension and byte count.
 *
 * Returns a CaseDocument pointing at the existing bytes rather than copying
 * them again. The display name is the one the caller supplied, so the same
 * bytes can appear on two cases under two names without being stored twice.
 */
function findDuplicate(displayName: string, size: number): CaseDocument | null {
  if (size <= 0) return null;
  try {
    const ext = /\.([A-Za-z0-9]{1,8})$/.exec(displayName)?.[1]?.toLowerCase();
    for (const entry of root().list()) {
      if (!(entry instanceof File)) continue;
      if ((entry.size ?? -1) !== size) continue;
      const entryExt = /\.([A-Za-z0-9]{1,8})$/.exec(entry.uri)?.[1]?.toLowerCase();
      if (ext !== entryExt) continue;
      return {
        id: diaryUid(),
        name: displayName,
        uri: entry.uri,
        size,
        addedAt: Date.now(),
      };
    }
  } catch {
    // A listing failure is not a reason to refuse an attach.
  }
  return null;
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
export function deleteDocumentFile(doc: CaseDocument, stillReferenced = false): void {
  // Two records can point at the same bytes: attaching the same order to a
  // second case reuses the stored file instead of copying it again. Deleting
  // one must not take the other's document with it, so the caller — which is
  // the only thing that can see every record — says whether anything else
  // still refers to this uri.
  if (stillReferenced) return;
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
