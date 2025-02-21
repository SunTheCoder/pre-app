import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function uploadFile(file) {
  // Convert the incoming file to a Buffer and write to a temp file.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
  await fs.writeFile(tempFilePath, buffer);
  return tempFilePath;
}
