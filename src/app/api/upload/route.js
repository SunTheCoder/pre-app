import { NextResponse } from 'next/server';
import { uploadFile } from '../../../lib/upload/uploader';
import { processOCR } from '../../../lib/upload/ocr';
import { runGPTExtraction } from '../../../lib/upload/gpt';
import { runLocalNLP } from '../../../lib/upload/nlp';
import { buildFinalSchema } from '../../../lib/upload/store';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    console.log('[SEMANTIC LOG] Starting parse-upload route...');
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      console.log('[SEMANTIC LOG] No file provided in form data.');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    console.log('[SEMANTIC LOG] Received file:', file.name);

    // 1. Upload file and get temporary file path.
    const tempFilePath = await uploadFile(file);
    console.log('[SEMANTIC LOG] File uploaded to temp path:', tempFilePath);

    // 2. Process OCR.
    const { extractedText, annotations, personAnnotations } = await processOCR(tempFilePath);
    console.log('[SEMANTIC LOG] OCR complete. Extracted text length:', extractedText.length);

    // 3. Clean up temp file.
    await fs.unlink(tempFilePath);
    console.log('[SEMANTIC LOG] Temp file deleted.');

    if (!extractedText) {
      console.log('[SEMANTIC LOG] extractedText is empty, returning early...');
      return NextResponse.json({
        error: 'No text extracted from image.',
        extractedText
      }, { status: 200 });
    }

    // 4. Run GPT extraction.
    const gptData = await runGPTExtraction(extractedText);
    console.log('[SEMANTIC LOG] GPT extraction complete.');

    // 5. Run local NLP extraction.
    const localNLPData = runLocalNLP(extractedText);
    console.log('[SEMANTIC LOG] Local NLP extraction complete.');

    // 6. Build final schema.
    const finalSchema = buildFinalSchema(gptData, localNLPData, { extractedText, annotations });
    console.log('[SEMANTIC LOG] Final schema built.');

    return NextResponse.json({
      finalSchema,
      parseResult: gptData,
      ocrData: { extractedText, annotations, personAnnotations }
    });
  } catch (error) {
    console.error('[SEMANTIC LOG] Server Error:', error);
    return NextResponse.json({ error: 'Failed to process the upload.', details: String(error) }, { status: 500 });
  }
}
