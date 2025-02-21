export function buildFinalSchema(gptData, localNLPData, ocrData) {
  // Build artifact using GPT data and OCR text.
  const artifact = {
    artifact_id: 1,
    subject: gptData.artifact?.subject || "Unknown",
    transcription: ocrData.extractedText || "",
    sent_datetime: gptData.artifact?.sent_datetime || "Unknown",
    artifact_purpose: gptData.artifact?.artifact_purpose || "Unknown",
    thread_id: null,
    in_reply_to: null,
    source_filename: null,
    collection_id: "NewCollection",
    extracted_datetime: new Date().toISOString(),
    auto_summary: null,
    manual_summary: null,
    tags: []
  };

  // Merge people from GPT and local NLP (deduplicate by name).
  const peopleMap = new Map();
  const addPerson = (person) => {
    const key = person.name.trim().toLowerCase();
    if (!peopleMap.has(key)) {
      peopleMap.set(key, { ...person });
    }
  };
  if (gptData.sender) addPerson(gptData.sender);
  (gptData.recipients || []).forEach(addPerson);
  (gptData.mentioned || []).forEach(addPerson);
  (localNLPData.people || []).forEach(addPerson);
  const people = Array.from(peopleMap.values()).map((person, idx) => ({
    person_id: idx + 1,
    full_name: person.name,
    email_address: person.email || null,
    confidence: person.confidence || 1,
    note: person.note || ''
  }));

  // Build artifact_participants.
  const artifact_participants = [];
  if (gptData.sender && gptData.sender.name) {
    const key = gptData.sender.name.trim().toLowerCase();
    const person = people.find(p => p.full_name.trim().toLowerCase() === key);
    if (person) {
      artifact_participants.push({
        artifact_id: 1,
        person_id: person.person_id,
        role: 'sender'
      });
    }
  }
  (gptData.recipients || []).forEach(rec => {
    const key = rec.name.trim().toLowerCase();
    const person = people.find(p => p.full_name.trim().toLowerCase() === key);
    if (person) {
      artifact_participants.push({
        artifact_id: 1,
        person_id: person.person_id,
        role: 'recipient'
      });
    }
  });
  (gptData.mentioned || []).forEach(m => {
    const nameStr = typeof m === 'object' && m.name ? m.name : m;
    const key = nameStr.trim().toLowerCase();
    const person = people.find(p => p.full_name.trim().toLowerCase() === key);
    if (person) {
      artifact_participants.push({
        artifact_id: 1,
        person_id: person.person_id,
        role: 'mentioned'
      });
    }
  });

  // Merge entities.
  const entityMap = new Map();
  const addEntity = (entity) => {
    const key = `${entity.entity_type}:${entity.entity_value}`.trim().toLowerCase();
    if (!entityMap.has(key)) {
      entityMap.set(key, { ...entity });
    }
  };
  (gptData.entities || []).forEach(addEntity);
  (localNLPData.entities || []).forEach(addEntity);
  const entities = Array.from(entityMap.values()).map((entity, idx) => ({
    entity_id: idx + 1,
    entity_type: entity.entity_type,
    entity_value: entity.entity_value,
    context: entity.context || '',
    confidence: entity.confidence || 1
  }));
  const artifact_entities = (gptData.entities || []).map(e => {
    const key = `${e.entity_type}:${e.entity_value}`.trim().toLowerCase();
    const found = entities.find(ent => `${ent.entity_type}:${ent.entity_value}`.trim().toLowerCase() === key);
    return found ? { artifact_id: 1, entity_id: found.entity_id, context: e.context || '' } : null;
  }).filter(Boolean);

  // Merge locations.
  const locationMap = new Map();
  const addLocation = (loc) => {
    const key = loc.location_name.trim().toLowerCase();
    if (!locationMap.has(key)) {
      locationMap.set(key, { ...loc });
    }
  };
  (gptData.locations || []).forEach(addLocation);
  (localNLPData.locations || []).forEach(addLocation);
  const locations = Array.from(locationMap.values()).map((loc, idx) => ({
    location_id: idx + 1,
    location_name: loc.location_name,
    latitude: loc.latitude || null,
    longitude: loc.longitude || null,
    context: loc.context || '',
    confidence: loc.confidence || 1,
    note: loc.note || ''
  }));
  const artifact_locations = (gptData.locations || []).map(loc => {
    const key = loc.location_name.trim().toLowerCase();
    const found = locations.find(l => l.location_name.trim().toLowerCase() === key);
    return found ? { artifact_id: 1, location_id: found.location_id, context: loc.context || '' } : null;
  }).filter(Boolean);

  return {
    artifacts: [artifact],
    people,
    artifact_participants,
    entities,
    artifact_entities,
    locations,
    artifact_locations
  };
}
