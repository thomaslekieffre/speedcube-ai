export interface Algorithm {
  id: string;
  name: string;
  set: string;
  subset?: string;
  puzzle: string;
  notation: string;
  alternatives: AlgorithmAlternative[];
  moveCount: number;
  setup?: string;
  votes?: number;
  source: string;
}

export interface AlgorithmAlternative {
  notation: string;
  moveCount: number;
  votes?: number;
  author?: string;
}

export interface AlgorithmSet {
  id: string;
  name: string;
  puzzle: string;
  description: string;
  caseCount: number;
  category: string;
  algorithms: Algorithm[];
}

export interface Method {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  steps: MethodStep[];
  pros: string[];
  cons: string[];
  notableUsers: string[];
  relatedSets: string[];
  avgMoveCount?: string;
  yearCreated?: number;
  creator?: string;
}

export interface MethodStep {
  name: string;
  description: string;
  algorithmSets?: string[];
  moveCountRange?: string;
  tips?: string[];
}

export interface CubeHardware {
  id: string;
  name: string;
  brand: string;
  puzzle: string;
  price: string;
  tier: 'budget' | 'mid' | 'flagship';
  features: string[];
  releaseYear: number;
  magnetic: boolean;
  smartCube?: boolean;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

export interface Lube {
  id: string;
  name: string;
  brand: string;
  type: 'silicone' | 'water-based' | 'hybrid';
  viscosity: 'light' | 'medium' | 'heavy';
  price: string;
  description: string;
  bestFor: string[];
  rating?: number;
  reviewCount?: number;
  image?: string;
}

export interface WCARecord {
  event: string;
  eventId: string;
  single: RecordEntry;
  average: RecordEntry;
}

export interface RecordEntry {
  time: string;
  holder: string;
  nationality: string;
  competition: string;
  date: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  relatedTerms?: string[];
}

export interface Tip {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  keyPoints: string[];
}

export interface LearningPath {
  id: string;
  name: string;
  target: string;
  description: string;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  target: string;
  description: string;
  skills: string[];
  algorithmSets: string[];
  estimatedTime: string;
}

export interface SearchResult {
  type: 'algorithm' | 'method' | 'hardware' | 'record' | 'glossary' | 'tip';
  title: string;
  description: string;
  url: string;
}
