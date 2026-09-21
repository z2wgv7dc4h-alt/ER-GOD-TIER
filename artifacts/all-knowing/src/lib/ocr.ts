/** Browser OCR hook. No Tesseract bundled — drop-in later.
 *  Reckon still accepts a paste of the warp list, which is the reliable PS5 path.
 */
export async function readImageText(_file: Blob): Promise<string> {
  return ''
}

export function hintForShot(kind: string) {
  if (kind === 'warp-list') return 'Paste the grace names you can see. Matching uses the full 418-name Paramdex list.'
  if (kind === 'inventory') return 'Paste key-item names. Fingerslayer, Cursemark, medallion halves matter most.'
  return 'Paste any names from the shot. Matching is alias-based, not pixels yet.'
}
