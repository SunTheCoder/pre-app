import nlp from 'compromise';

export function runLocalNLP(extractedText) {
  const doc = nlp(extractedText);
  // Extract people names using Compromise's .people() method.
  const people = doc.people().out('array');
  const peopleResult = people.map(name => ({ name, email: null, confidence: 1 }));

  // Extract locations using Compromise's .places() method.
  const places = doc.places().out('array');
  const locationsResult = places.map(place => ({
    location_name: place,
    latitude: null,
    longitude: null,
    context: '',
    confidence: 1,
    note: ''
  }));

  // Extract organizations as entities.
  const orgs = doc.organizations().out('array');
  const entitiesResult = orgs.map(org => ({
    entity_type: 'Organization',
    entity_value: org,
    context: '',
    confidence: 1
  }));

  return {
    people: peopleResult,
    locations: locationsResult,
    entities: entitiesResult
  };
}
