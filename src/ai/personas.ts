export interface OpponentPersona {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  style: string;
  icon: string;
  color: string;
}

export const PRACTICE_PERSONAS: OpponentPersona[] = [
  {
    id: 'friendly_collaborator',
    name: 'Friendly Collaborator',
    description: 'Looking for a win-win outcome. Easy to talk to, but expects fair concessions.',
    difficulty: 'Beginner',
    style: 'Collaborative, open, and agreeable. Will accept reasonable offers quickly.',
    icon: '🤝',
    color: '#4CAF7D',
  },
  {
    id: 'silent_analyzer',
    name: 'Silent Analyzer',
    description: 'Speaks very little. Uses silence to create pressure and extract information.',
    difficulty: 'Intermediate',
    style: 'Analytical, quiet, and stalling. Will wait for you to make the first move.',
    icon: '🕵️',
    color: '#6A5ACD',
  },
  {
    id: 'high_pressure_buyer',
    name: 'High-pressure Buyer',
    description: 'Always asking for discounts. Creates fake deadlines to force a deal.',
    difficulty: 'Advanced',
    style: 'Urgent, demanding, and price-focused. Threatens to walk away frequently.',
    icon: '⏱️',
    color: '#F5A623',
  },
  {
    id: 'aggressive_negotiator',
    name: 'Aggressive Negotiator',
    description: 'Combative and dismissive. Will try to anchor extremely low and insult your value.',
    difficulty: 'Expert',
    style: 'Hostile, anchoring low, and bullying. Rarely makes concessions without a fight.',
    icon: '🦈',
    color: '#E8573E',
  },
];
