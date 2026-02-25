import { useState, useEffect, useRef } from 'react';
import type { SearchResult } from '@/types';
import type { AlgorithmSet, Method, CubeHardware, GlossaryTerm, Tip } from '@/types';

interface SearchData {
  algorithmSets: AlgorithmSet[];
  methods: Method[];
  cubes: CubeHardware[];
  glossary: GlossaryTerm[];
  tips: Tip[];
}

let _cachedData: SearchData | null = null;

async function loadSearchData(): Promise<SearchData> {
  if (_cachedData) return _cachedData;
  const mod = await import('@/data');
  _cachedData = {
    algorithmSets: mod.algorithmSets,
    methods: mod.methods,
    cubes: mod.cubes,
    glossary: mod.glossary,
    tips: mod.tips,
  };
  return _cachedData;
}

function search(data: SearchData, q: string): SearchResult[] {
  const lower = q.toLowerCase();
  const results: SearchResult[] = [];

  for (const set of data.algorithmSets) {
    if (set.name.toLowerCase().includes(lower) || set.description.toLowerCase().includes(lower)) {
      results.push({
        type: 'algorithm',
        title: set.name,
        description: `${set.puzzle} — ${set.algorithms.length} cases`,
        url: `/algorithms/${set.id}`,
      });
    }
    for (const algo of set.algorithms) {
      if (algo.name.toLowerCase().includes(lower) || algo.notation.toLowerCase().includes(lower)) {
        results.push({
          type: 'algorithm',
          title: algo.name,
          description: algo.notation,
          url: `/algorithms/${set.id}`,
        });
        if (results.length > 20) break;
      }
    }
    if (results.length > 20) break;
  }

  for (const method of data.methods) {
    if (method.name.toLowerCase().includes(lower) || method.description.toLowerCase().includes(lower)) {
      results.push({
        type: 'method',
        title: method.name,
        description: method.description.slice(0, 100) + '...',
        url: `/methods/${method.id}`,
      });
    }
  }

  for (const cube of data.cubes) {
    if (cube.name.toLowerCase().includes(lower) || cube.brand.toLowerCase().includes(lower)) {
      results.push({
        type: 'hardware',
        title: cube.name,
        description: `${cube.brand} — ${cube.price}`,
        url: '/hardware',
      });
    }
  }

  for (const term of data.glossary) {
    if (term.term.toLowerCase().includes(lower) || term.definition.toLowerCase().includes(lower)) {
      results.push({
        type: 'glossary',
        title: term.term,
        description: term.definition.slice(0, 100) + '...',
        url: '/glossary',
      });
    }
  }

  for (const tip of data.tips) {
    if (tip.title.toLowerCase().includes(lower) || tip.description.toLowerCase().includes(lower)) {
      results.push({
        type: 'tip',
        title: tip.title,
        description: tip.description.slice(0, 100) + '...',
        url: '/tips',
      });
    }
  }

  return results.slice(0, 25);
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const pendingQuery = useRef('');

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    pendingQuery.current = query;

    loadSearchData().then((data) => {
      // Only update if query hasn't changed while loading
      if (pendingQuery.current === query) {
        setResults(search(data, query));
      }
    });
  }, [query]);

  return { query, setQuery, results };
}
