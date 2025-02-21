import vision from '@google-cloud/vision';

export async function processOCR(tempFilePath) {
  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.textDetection(tempFilePath);
  const extractedText = result.fullTextAnnotation?.text || '';
  // Grab all text annotations (skip the full-text one, which is at index 0)
  const annotations = result.textAnnotations || [];
  const personAnnotations = annotations.slice(1); // For example, these can be used for bounding boxes.
  return { extractedText, annotations, personAnnotations };
}
