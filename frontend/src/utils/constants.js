export const DOMAINS = ['AI/ML', 'Web Development', 'Mobile Development', 'Cybersecurity', 'Cloud Computing', 'IoT', 'Blockchain',
  'Computer Vision', 'NLP', 'Healthcare', 'Agriculture', 'Education', 'FinTech', 'Sustainability', 'Robotics']
export const LEVELS = ['beginner', 'intermediate', 'advanced']
export const SCORE_LABELS = {
  novelty: 'Novelty', feasibility: 'Feasibility', difficulty: 'Difficulty', career_relevance: 'Career relevance',
  research_potential: 'Research potential', market_potential: 'Market potential', implementation: 'Implementation',
}
export const scoreColor = (v) => (v >= 75 ? '#0F9D8A' : v >= 50 ? '#3B4CCA' : '#E8A33D')
export const toList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
