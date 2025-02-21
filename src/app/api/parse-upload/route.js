// app/api/parse-upload/route.js

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { OpenAI } from 'openai';
import vision from '@google-cloud/vision';

export const runtime = 'nodejs';

// Helper: Transform parse results → final DB schema
// Helper: Transform parse results → final DB schema
function transformToFinalSchema(parsedResult, fullText) {
  console.log('[SEMANTIC LOG] Transforming parse results into final schema...');

  // 1) Build artifacts array
  const artifacts = [{
    artifact_id: 1,
    subject: parsedResult.artifact?.subject || "Unknown",
    transcription: fullText || "",
    sent_datetime: parsedResult.artifact?.sent_datetime || "Unknown",
    artifact_purpose: parsedResult.artifact?.artifact_purpose || "Unknown",
    thread_id: null,
    in_reply_to: null,
    source_filename: null,
    collection_id: "NewCollection",
    extracted_datetime: new Date().toISOString(),
    auto_summary: null,
    manual_summary: null,
    tags: []
  }];

  // 2) Build People array using a Map for de-duplication.
  const peopleMap = new Map();
  let personId = 1;

  // Helper: Try to deduplicate a single-word name by checking first names among existing people.
  function findByFirstName(name) {
    const firstName = name.trim().toLowerCase();
    const candidates = [];
    try {
      for (const person of peopleMap.values()) {
        const candidateFirst = person.full_name.split(' ')[0].toLowerCase();
        if (candidateFirst === firstName) {
          candidates.push(person);
        }
      }
    } catch (error) {
      console.error('[SEMANTIC LOG] Error in parse-upload route:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    return candidates.length === 1 ? candidates[0] : null;
  }

  // Helper: Add or merge a person.
  function addPerson(name, email) {
    if (!name) return null;
    const nameStr = typeof name === 'object' && name.name ? String(name.name) : String(name);
    let key = nameStr.trim().toLowerCase();

    // If an exact match exists, use it.
    if (peopleMap.has(key)) {
      return peopleMap.get(key);
    }

    // If the name is a single word, attempt a first-name match.
    if (nameStr.trim().split(' ').length === 1) {
      const candidate = findByFirstName(nameStr);
      if (candidate) {
        return candidate;
      }
    }

    // Otherwise, create a new person entry.
    const newPerson = {
      person_id: personId++,
      full_name: nameStr.trim(),
      email_address: email ? String(email).trim() : null
    };
    peopleMap.set(key, newPerson);
    return newPerson;
  }

  // Add sender, recipients, and mentions.
  if (parsedResult.sender && parsedResult.sender.name) {
    addPerson(parsedResult.sender.name, parsedResult.sender.email);
  }
  if (Array.isArray(parsedResult.recipients)) {
    for (const r of parsedResult.recipients) {
      addPerson(r.name, r.email);
    }
  }
  if (Array.isArray(parsedResult.mentioned)) {
    for (const m of parsedResult.mentioned) {
      let mentionName = typeof m === 'object' && m.name ? m.name : m;
      addPerson(mentionName, null);
    }
  }
  const people = Array.from(peopleMap.values());

  // 3) Build artifact_participants array
  const artifact_participants = [];
  if (parsedResult.sender && parsedResult.sender.name) {
    const key = String(parsedResult.sender.name).trim().toLowerCase();
    const p = peopleMap.get(key);
    if (p) {
      artifact_participants.push({
        artifact_id: 1,
        person_id: p.person_id,
        role: "sender"
      });
    }
  }
  if (Array.isArray(parsedResult.recipients)) {
    for (const r of parsedResult.recipients) {
      const key = String(r.name).trim().toLowerCase();
      const p = peopleMap.get(key);
      if (p) {
        artifact_participants.push({
          artifact_id: 1,
          person_id: p.person_id,
          role: "recipient"
        });
      }
    }
  }
  if (Array.isArray(parsedResult.mentioned)) {
    for (const m of parsedResult.mentioned) {
      let mentionName = typeof m === 'object' && m.name ? m.name : m;
      const key = String(mentionName).trim().toLowerCase();
      let p = peopleMap.get(key);
      // If not found exactly, try a first name match.
      if (!p) {
        p = findByFirstName(mentionName);
      }
      if (p) {
        artifact_participants.push({
          artifact_id: 1,
          person_id: p.person_id,
          role: "mentioned"
        });
      }
    }
  }

  // 4) Build Entities and Artifact Entities arrays
  const entityMap = new Map();
  let entityId = 1;
  function addEntity(type, value) {
    if (!value) return null;
    const key = `${type}:${value}`.toLowerCase();
    if (!entityMap.has(key)) {
      entityMap.set(key, {
        entity_id: entityId++,
        entity_type: type || "Topic",
        entity_value: value
      });
    }
    return entityMap.get(key);
  }
  const artifact_entities = [];
  if (Array.isArray(parsedResult.entities)) {
    for (const e of parsedResult.entities) {
      const en = addEntity(e.entity_type, e.entity_value);
      if (en) {
        artifact_entities.push({
          artifact_id: 1,
          entity_id: en.entity_id,
          context: e.context || null
        });
      }
    }
  }
  const entities = Array.from(entityMap.values());

  // 5) Build Locations and Artifact Locations arrays
  const locationMap = new Map();
  let locationId = 1;
  function addLocation(locName, lat, lon) {
    if (!locName) return null;
    const key = String(locName).trim().toLowerCase();
    if (!locationMap.has(key)) {
      locationMap.set(key, {
        location_id: locationId++,
        location_name: String(locName).trim(),
        latitude: lat || null,
        longitude: lon || null
      });
    }
    return locationMap.get(key);
  }
  const artifact_locations = [];
  if (Array.isArray(parsedResult.locations)) {
    for (const loc of parsedResult.locations) {
      const l = addLocation(loc.location_name, loc.latitude, loc.longitude);
      if (l) {
        artifact_locations.push({
          artifact_id: 1,
          location_id: l.location_id,
          context: loc.context || null
        });
      }
    }
  }
  const locations = Array.from(locationMap.values());

  console.log('[SEMANTIC LOG] Finished building final schema.');
  return {
    artifacts,
    people,
    artifact_participants,
    entities,
    artifact_entities,
    locations,
    artifact_locations
  };
}

// Second-pass extraction: focused on additional entities, people, and locations
async function secondPassExtraction(extractedText, openai) {
  console.log('[SEMANTIC LOG] Starting second-pass extraction...');
  const secondPassPrompt = `
You are an expert entity extraction assistant.
The following is the text of an email-like message. Some names, locations, and entities might not have been captured in a previous parse.
Please identify any additional references that appear to be:
- People (if a person's name is mentioned in the body, output the full name if available)
- Locations (place names or addresses)
- Entities (brands, events, topics, etc.)

Return valid JSON with these keys:
{
  "additional_people": [ { "name": "...", "email": null, "confidence": 0.9, "note": "..." }, ... ],
  "additional_locations": [ { "location_name": "...", "latitude": null, "longitude": null, "context": "short snippet", "confidence": 0.9, "note": "..." }, ... ],
  "additional_entities": [ { "entity_type": "Brand|Event|Topic|...", "entity_value": "...", "context": "short snippet", "confidence": 0.9 }, ... ]
}
Only output the JSON.
The text is:
-----------
${extractedText}
-----------
`;
  console.log('[SEMANTIC LOG] Sending second-pass prompt to OpenAI, length:', secondPassPrompt.length);
  const secondPassResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert entity extraction assistant.' },
      { role: 'user', content: secondPassPrompt },
    ],
    temperature: 0.2
  });
  let secondPassRaw = secondPassResponse.choices[0].message.content.trim();
  if (secondPassRaw.startsWith("```json")) {
    secondPassRaw = secondPassRaw.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  }
  let secondPassResult;
  try {
    secondPassResult = JSON.parse(secondPassRaw);
    console.log('[SEMANTIC LOG] Successfully parsed second-pass JSON.');
  } catch (err) {
    console.error('[SEMANTIC LOG] Failed to parse second-pass JSON:', err);
    secondPassResult = { additional_people: [], additional_locations: [], additional_entities: [] };
  }
  return secondPassResult;
}

export async function POST(request) {
  try {
    console.log('[SEMANTIC LOG] Starting parse-upload route...');
    // 1. Parse the uploaded file from FormData.
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      console.log('[SEMANTIC LOG] No file provided in form data.');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    console.log('[SEMANTIC LOG] Received file:', file.name);

    // 2. Write the file to a temporary location.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    console.log('[SEMANTIC LOG] Writing file to temp path:', tempFilePath);
    await fs.writeFile(tempFilePath, buffer);

    // 3. OCR with Google Cloud Vision.
    console.log('[SEMANTIC LOG] Calling GCV textDetection...');
    const visionClient = new vision.ImageAnnotatorClient();
    const [result] = await visionClient.textDetection(tempFilePath);
    const extractedText = result.fullTextAnnotation?.text || '';
    const annotations = result.textAnnotations || [];
    const personAnnotations = annotations.slice(1); // You might apply further filtering here if needed

    console.log(`[SEMANTIC LOG] OCR complete. Extracted text length: ${extractedText.length}`);

    // 4. Clean up temp file.
    await fs.unlink(tempFilePath);
    console.log('[SEMANTIC LOG] Temp file deleted.');

    if (!extractedText) {
      console.log('[SEMANTIC LOG] extractedText is empty, returning early...');
      return NextResponse.json({
        error: 'No text extracted from image.',
        extractedText
      }, { status: 200 });
    }

    // 5. First LLM parse prompt.
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
    console.log('[SEMANTIC LOG] Sending first parse prompt to OpenAI, length:', parsePrompt.length);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const parseResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert data parser.' },
        { role: 'user', content: parsePrompt },
      ],
      temperature: 0.2
    });
    let parseResultRaw = parseResponse.choices[0].message.content;
    console.log('[SEMANTIC LOG] Raw first-pass LLM parse result:', parseResultRaw);

    // Patch: Remove markdown code fences if present.
    parseResultRaw = parseResultRaw.trim();
    if (parseResultRaw.startsWith("```json")) {
      parseResultRaw = parseResultRaw.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }
    let parseResult;
    try {
      parseResult = JSON.parse(parseResultRaw);
      console.log('[SEMANTIC LOG] Successfully parsed JSON from first-pass LLM result.');
    } catch (err) {
      console.error('[SEMANTIC LOG] Failed to parse first-pass LLM JSON:', err);
      return NextResponse.json({
        error: 'Failed to parse first-pass LLM output as JSON',
        rawOutput: parseResultRaw
      }, { status: 500 });
    }

    // 5b. Second-pass extraction for additional entities, people, and locations.
    const additionalData = await secondPassExtraction(extractedText, openai);
    console.log('[SEMANTIC LOG] Second-pass extraction result:', additionalData);

    // Merge additional data into first-pass parseResult.
    // We add additional_people only to "mentioned" to avoid duplicating recipients.
    parseResult.mentioned = (parseResult.mentioned || []).concat(additionalData.additional_people || []);
    parseResult.entities = (parseResult.entities || []).concat(additionalData.additional_entities || []);
    parseResult.locations = (parseResult.locations || []).concat(additionalData.additional_locations || []);
    console.log('[SEMANTIC LOG] Merged first-pass and second-pass results.');

    // 6. Transform merged parse result into final schema.
    console.log('[SEMANTIC LOG] Transforming merged parse result into final schema...');
    const finalSchema = transformToFinalSchema(parseResult, extractedText);

    // 7. Cross-reference personAnnotations with finalSchema.people, but only keep one annotation per person.
    const annotatedPeopleMap = new Map(); // maps person_id -> annotation object

    for (const anno of personAnnotations) {
      const detectedText = anno.description ? anno.description.trim().toLowerCase() : "";
      // Attempt to match against finalSchema.people
      const match = finalSchema.people.find(person =>
        person.full_name.trim().toLowerCase().includes(detectedText)
      );

      if (match) {
        // If we haven't already assigned an annotation to this person, store it.
        if (!annotatedPeopleMap.has(match.person_id)) {
          annotatedPeopleMap.set(match.person_id, {
            person_id: match.person_id,
            vertices: anno.boundingPoly.vertices
          });
        }
        // Otherwise, skip (we do nothing) because we already have an annotation for that person.
      }
    }

    // Now convert annotatedPeopleMap to an array
    const annotatedPeople = Array.from(annotatedPeopleMap.values());

    console.log('[SEMANTIC LOG] Single annotation per person. Count:', annotatedPeople.length);
    console.log(JSON.stringify(annotatedPeople, null, 2));

    // 8. Return final result including finalSchema, parseResult, and annotated person data.
    console.log('[SEMANTIC LOG] Returning final schema to client.');
    return NextResponse.json({
      finalSchema,
      parseResult,
      personAnnotations: annotatedPeople
    });
  }
  catch (error) {
    console.error('[SEMANTIC LOG] Error in parse-upload route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
