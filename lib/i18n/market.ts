import { bilingual } from './text';

// The words for the structured values of the robot records, the same on every page: robot types,
// Germany status, proof stages, jobs, settings, regions, spec qualifiers. Our own words, so they are
// translated; the free text of a record (summary, notes, evidence) stays as the sources wrote it.

export const MARKET_TEXT = bilingual({
  en: {
    type: { humanoid: 'Humanoid', quadruped: 'Robot dog', mobile_manipulator: 'Mobile manipulator', specialised: 'Job-specific robot' },
    typePlural: { humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators', specialised: 'Job-specific robots' },
    status: { buy_now: 'Buy in Germany', quote: 'Order on request', preorder: 'Pre-order only', not_sold: 'Not sold in Germany' },
    body: { tracks: 'On tracks', wheels: 'On wheels', legs: 'On legs', machine: 'Machine', legsWheels: 'Legs with wheels', stationary: 'Stationary' },
    /** The "Moves on" row: the body words without "On". */
    moves: { tracks: 'Tracks', wheels: 'Wheels', legs: 'Legs', machine: 'Machine', legsWheels: 'Legs with wheels', stationary: 'Stationary' },
    from: 'from', net: 'net', gross: 'incl. VAT', onRequest: 'Price on request', notSoldHere: 'Not sold here',
    yes: 'Yes', no: 'No', none: 'None', notPublished: 'Not published', notApplicable: 'Not applicable', to: 'to',
    job: {
      layout_marking: 'Layout marking', drilling_anchoring: 'Drilling and anchors', demolition: 'Demolition', surface_spraying: 'Spraying and painting',
      drywall_finishing: 'Drywall finishing', floor_grinding: 'Floor grinding', concrete_finishing: 'Concrete finishing', rebar_tying: 'Rebar tying',
      rebar_placement: 'Rebar placement', bricklaying: 'Bricklaying', printing_3d: '3D printing', material_lifting: 'Material lifting', welding: 'Welding',
      facade_cleaning: 'Facade cleaning', glazing_installation: 'Glazing installation', scanning_documentation: 'Scanning and documentation',
      excavation: 'Excavation', tunnelling: 'Tunnelling', other: 'Other jobs',
    } as Record<string, string>,
    /** How far a robot is proven at a job, from the maker's offer to daily use. */
    stage: { claim: 'Made for this work', demo: 'Shown in a demo', pilot: 'Tested in a pilot', deployment: 'In daily use' },
    proofNone: 'No proof yet',
    proofHelp: {
      deployment: 'used on real projects, named in a source',
      pilot: 'tried on a real site, named in a source',
      demo: 'shown working at a fair or in a test',
      claim: 'the maker offers it for this work',
      none: 'no source shows a robot doing it yet',
    },
    /** The three stages of a documented use, as the use-case page and its legend name them. */
    useStage: { deployment: 'In daily use', pilot: 'Pilot on a real project', demo: 'Demonstration' },
    /** Counted: "12 in daily use", "1 pilot", "3 pilots". */
    useStageCount: { deployment: ['in daily use', 'in daily use'], pilot: ['pilot', 'pilots'], demo: ['demo', 'demos'] } as Record<'deployment' | 'pilot' | 'demo', [string, string]>,
    colourKey: 'Colour key',
    setting: {
      high_rise: { label: 'High-rise and multi-storey', intro: 'Towers, apartment blocks and multi-storey buildings: lifts, façades, floors and the work between them.' },
      underground: { label: 'Underground and tunnels', intro: 'Tunnels, mines, metro and shafts: spraying, drilling, inspection and repair below ground.' },
      civil: { label: 'Roads, bridges and civil works', intro: 'Roads, motorways, airports, ports, bridges and earthworks.' },
      energy: { label: 'Solar, wind and data centres', intro: 'Solar parks, wind farms and data-centre builds.' },
      interior: { label: 'Interior finishing', intro: 'Drywall, painting, plaster, tiles, floors, glazing and installation inside buildings.' },
      structure: { label: 'Structure, concrete and demolition', intro: 'Concrete, masonry, 3D printing, rebar, demolition and concrete repair.' },
      prefab: { label: 'Prefab and factories', intro: 'Timber-frame, precast and steel plants that build parts of buildings.' },
      logistics: { label: 'Site logistics, survey and inspection', intro: 'Moving material, layout and survey, progress scans and plant inspection.' },
      industry: { label: 'Factories, warehouses and plants', intro: 'General-purpose robots at work in car plants, warehouses and industrial sites.' },
      research: { label: 'Labs and research', intro: 'Humanoids and other general-purpose robots tested in labs and pilot cells.' },
    } as Record<string, { label: string; intro: string }>,
    region: { DE: 'Germany', EU: 'Rest of Europe', CN: 'China and Hong Kong', JP: 'Japan', KR: 'South Korea', US: 'USA', OTHER: 'Rest of the world', NONE: 'Place not named' } as Record<string, string>,
    qualifier: {
      rated: 'rated, one arm', rated_dual: 'rated, both arms', peak: 'peak, one arm', peak_dual: 'peak, both arms', sustained: 'sustained', instant: 'instant',
      carry_walking: 'carried while walking', idle: 'idle', walking: 'walking', loaded: 'loaded', unstated: 'basis unstated',
    } as Record<string, string>,
    trust: { verified: 'Verified', assessed: 'Assessed', reported: 'Reported', unknown: 'Unknown' } as Record<string, string>,
    trustHint: {
      verified: 'A manufacturer-domain source states this value.',
      assessed: 'Curated by us from evidence; the note says which.',
      reported: 'Reported by a third-party source; manufacturer confirmation is not established.',
      unknown: 'No confirmed value is recorded for this field.',
    } as Record<string, string>,
    priceTier: { 1: 'manufacturer store', 2: 'distributor listing', 3: 'reported estimate' } as Record<number, string>,
    formFactor: {
      humanoid: 'Humanoid', quadruped: 'Quadruped', mobile_manipulator: 'Mobile manipulator', amr_agv: 'AMR / AGV', industrial_arm: 'Industrial arm',
      cobot: 'Cobot', dedicated_robot: 'Dedicated robot', integrated_cell: 'Integrated cell',
    } as Record<string, string>,
    /** Where a robot is in its life, in the catalogue's words. */
    lifecycle: { concept: 'Concept', prototype: 'Prototype', pre_order: 'Pre-order', shipping: 'Available to order', discontinued: 'Discontinued', unknown: 'Status unknown', pilot_only: 'Pilot only' } as Record<string, string>,
    availability: { for_sale: 'For sale', pre_order: 'Pre-order', enterprise_only: 'Enterprise only', not_sold: 'Not sold yet', discontinued: 'Discontinued', unknown: 'Unknown' } as Record<string, string>,
  },
  de: {
    type: { humanoid: 'Humanoid', quadruped: 'Roboterhund', mobile_manipulator: 'Mobiler Manipulator', specialised: 'Spezialroboter' },
    typePlural: { humanoid: 'Humanoide', quadruped: 'Roboterhunde', mobile_manipulator: 'Mobile Manipulatoren', specialised: 'Spezialroboter' },
    status: { buy_now: 'In Deutschland kaufbar', quote: 'Auf Anfrage bestellbar', preorder: 'Nur Vorbestellung', not_sold: 'In Deutschland nicht im Verkauf' },
    body: { tracks: 'Auf Ketten', wheels: 'Auf Rädern', legs: 'Auf Beinen', machine: 'Maschine', legsWheels: 'Beine mit Rädern', stationary: 'Stationär' },
    moves: { tracks: 'Ketten', wheels: 'Räder', legs: 'Beine', machine: 'Maschine', legsWheels: 'Beine mit Rädern', stationary: 'Stationär' },
    from: 'ab', net: 'netto', gross: 'inkl. MwSt.', onRequest: 'Preis auf Anfrage', notSoldHere: 'Hier nicht im Verkauf',
    yes: 'Ja', no: 'Nein', none: 'Keine', notPublished: 'Nicht veröffentlicht', notApplicable: 'Entfällt', to: 'bis',
    job: {
      layout_marking: 'Anzeichnen', drilling_anchoring: 'Bohren und Verankern', demolition: 'Abbruch', surface_spraying: 'Spritzen und Streichen',
      drywall_finishing: 'Trockenbau spachteln', floor_grinding: 'Boden schleifen', concrete_finishing: 'Beton glätten', rebar_tying: 'Bewehrung rödeln',
      rebar_placement: 'Bewehrung verlegen', bricklaying: 'Mauern', printing_3d: '3D-Druck', material_lifting: 'Material heben', welding: 'Schweißen',
      facade_cleaning: 'Fassadenreinigung', glazing_installation: 'Glasmontage', scanning_documentation: 'Scannen und Dokumentieren',
      excavation: 'Erdarbeiten', tunnelling: 'Tunnelbau', other: 'Andere Arbeiten',
    },
    stage: { claim: 'Für diese Arbeit gebaut', demo: 'In einer Demo gezeigt', pilot: 'In einem Pilotprojekt getestet', deployment: 'Im täglichen Einsatz' },
    proofNone: 'Noch kein Nachweis',
    proofHelp: {
      deployment: 'auf echten Projekten im Einsatz, in einer Quelle genannt',
      pilot: 'auf einer echten Baustelle erprobt, in einer Quelle genannt',
      demo: 'auf einer Messe oder in einem Test vorgeführt',
      claim: 'der Hersteller bietet ihn für diese Arbeit an',
      none: 'noch keine Quelle zeigt einen Roboter bei dieser Arbeit',
    },
    useStage: { deployment: 'Im täglichen Einsatz', pilot: 'Pilotprojekt', demo: 'Vorführung' },
    useStageCount: { deployment: ['im täglichen Einsatz', 'im täglichen Einsatz'], pilot: ['Pilotprojekt', 'Pilotprojekte'], demo: ['Demo', 'Demos'] },
    colourKey: 'Farblegende',
    setting: {
      high_rise: { label: 'Hochhaus und Geschossbau', intro: 'Türme, Wohnblöcke und mehrgeschossige Gebäude: Aufzüge, Fassaden, Decken und die Arbeit dazwischen.' },
      underground: { label: 'Untertagebau und Tunnel', intro: 'Tunnel, Bergwerke, U-Bahn und Schächte: Spritzen, Bohren, Prüfen und Instandsetzen unter der Erde.' },
      civil: { label: 'Straßen, Brücken und Ingenieurbau', intro: 'Straßen, Autobahnen, Flughäfen, Häfen, Brücken und Erdbau.' },
      energy: { label: 'Solar, Wind und Rechenzentren', intro: 'Solarparks, Windparks und der Bau von Rechenzentren.' },
      interior: { label: 'Innenausbau', intro: 'Trockenbau, Malerarbeiten, Putz, Fliesen, Böden, Verglasung und Installation in Gebäuden.' },
      structure: { label: 'Rohbau, Beton und Abbruch', intro: 'Beton, Mauerwerk, 3D-Druck, Bewehrung, Abbruch und Betoninstandsetzung.' },
      prefab: { label: 'Vorfertigung und Werke', intro: 'Holzbau-, Fertigteil- und Stahlbauwerke, die Bauteile für Gebäude herstellen.' },
      logistics: { label: 'Baulogistik, Vermessung und Prüfung', intro: 'Material bewegen, Anzeichnen und Vermessen, Baufortschritt scannen und Anlagen prüfen.' },
      industry: { label: 'Fabriken, Lager und Anlagen', intro: 'Universalroboter im Einsatz in Autowerken, Lagern und Industrieanlagen.' },
      research: { label: 'Labore und Forschung', intro: 'Humanoide und andere Universalroboter, getestet in Laboren und Pilotzellen.' },
    },
    region: { DE: 'Deutschland', EU: 'Übriges Europa', CN: 'China und Hongkong', JP: 'Japan', KR: 'Südkorea', US: 'USA', OTHER: 'Übrige Welt', NONE: 'Ort nicht genannt' },
    qualifier: {
      rated: 'Nennlast, ein Arm', rated_dual: 'Nennlast, beide Arme', peak: 'Spitzenlast, ein Arm', peak_dual: 'Spitzenlast, beide Arme', sustained: 'Dauerlast', instant: 'kurzzeitig',
      carry_walking: 'beim Gehen getragen', idle: 'im Stand', walking: 'beim Gehen', loaded: 'mit Last', unstated: 'Grundlage nicht angegeben',
    },
    trust: { verified: 'Bestätigt', assessed: 'Bewertet', reported: 'Berichtet', unknown: 'Unbekannt' },
    trustHint: {
      verified: 'Eine Quelle auf der Website des Herstellers nennt diesen Wert.',
      assessed: 'Von uns aus Belegen zusammengestellt; die Notiz nennt sie.',
      reported: 'Von einer Drittquelle berichtet; eine Bestätigung des Herstellers liegt nicht vor.',
      unknown: 'Für dieses Feld ist kein bestätigter Wert erfasst.',
    },
    priceTier: { 1: 'Shop des Herstellers', 2: 'Angebot eines Händlers', 3: 'berichtete Schätzung' },
    formFactor: {
      humanoid: 'Humanoid', quadruped: 'Vierbeiner', mobile_manipulator: 'Mobiler Manipulator', amr_agv: 'AMR / FTS', industrial_arm: 'Industriearm',
      cobot: 'Cobot', dedicated_robot: 'Spezialroboter', integrated_cell: 'Roboterzelle',
    },
    lifecycle: { concept: 'Konzept', prototype: 'Prototyp', pre_order: 'Vorbestellung', shipping: 'Bestellbar', discontinued: 'Eingestellt', unknown: 'Status unbekannt', pilot_only: 'Nur Pilotprojekte' },
    availability: { for_sale: 'Im Verkauf', pre_order: 'Vorbestellung', enterprise_only: 'Nur für Unternehmen', not_sold: 'Noch nicht im Verkauf', discontinued: 'Eingestellt', unknown: 'Unbekannt' },
  },
});
