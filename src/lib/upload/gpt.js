import { OpenAI } from 'openai';

export async function runGPTExtraction(extractedText) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const parsePrompt = `
You are an expert data extraction assistant.
I have an email-like message with header, recipients, body, and possible references to people, entities, and locations.
Some people have emails; some do not.
The same person might appear fully in the recipients list and partially (e.g. "Mark") in the body.
Your job is to:
1) Deduplicate references when possible. If you see “Mark Duvall” in recipients and “Mark” in the body, output the full name from recipients in both.
2) Return valid JSON with these keys:
{
  "artifact": {
    "subject": "...",
    "sent_datetime": "...",
    "artifact_purpose": "..."
  },
  "sender": { "name": "...", "email": "...", "confidence": 1.0 },
  "recipients": [ { "name": "...", "email": "...", "confidence": 1.0 }, ... ],
  "mentioned": [ { "name": "...", "email": null, "confidence": 0.9, "note": "..." }, ... ],
  "entities": [ { "entity_type": "Brand|Event|Topic|...", "entity_value": "...", "context": "short snippet", "confidence": 1.0 } ],
  "locations": [ { "location_name": "...", "latitude": null, "longitude": null, "context": "short snippet", "confidence": 1.0, "note": "..." } ]
}
Only parse what appears in the text; do not hallucinate extra data.
The text is:
-----------
${extractedText}
-----------
Output only the JSON as specified, with no extra commentary.
  `;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert data parser.' },
      { role: 'user', content: parsePrompt }
    ],
    temperature: 0.2
  });
  let raw = response.choices[0].message.content;
  raw = raw.trim();
  if (raw.startsWith("```json")) {
    raw = raw.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  }
  return JSON.parse(raw);
}
