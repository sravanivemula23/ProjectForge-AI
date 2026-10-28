// Clearly-fake fixtures shaped like real API responses. They are test data, not real repositories or papers.
const iso = (days) => new Date(Date.now() - days * 864e5).toISOString()
export const ghItem = (o = {}) => ({ name: 'plant-disease-detection', full_name: 'octo/plant-disease-detection', owner: { login: 'octo' }, description: 'Plant disease detection using CNN on leaf images', html_url: 'https://github.com/octo/plant-disease-detection',
  stargazers_count: 120, forks_count: 30, watchers_count: 120, language: 'Python', topics: ['cnn', 'plant-disease', 'agriculture'], created_at: iso(900), updated_at: iso(20), pushed_at: iso(20), open_issues_count: 3, license: { spdx_id: 'MIT' }, archived: false, default_branch: 'main', ...o })
export const GH_ITEMS = [
  ghItem(),
  ghItem({ name: 'random-ml-projects', full_name: 'octo/random-ml-projects', html_url: 'https://github.com/octo/random-ml-projects', description: 'Random machine learning notebooks', topics: ['machine-learning'], stargazers_count: 5000 }),
  ghItem({ name: 'crop-disease-classifier', full_name: 'leaf/crop-disease-classifier', owner: { login: 'leaf' }, html_url: 'https://github.com/leaf/crop-disease-classifier', description: 'Crop disease classification for farmers', topics: ['crop', 'disease'], pushed_at: iso(800), updated_at: iso(800) }),
  { ...ghItem({ name: 'evil', full_name: 'x/evil', html_url: 'https://evil.example.com/x/evil' }) }, // must be dropped (not a github.com link)
]
export const ghResponse = (items = GH_ITEMS, total = 321) => ({ ok: true, status: 200, headers: new Headers({ 'x-ratelimit-remaining': '9' }), json: async () => ({ total_count: total, items }) })
export const OA_WORKS = { results: [
  { title: 'Plant disease detection with convolutional networks', doi: 'https://doi.org/10.1234/plant.2023.1', publication_date: '2023-05-01', cited_by_count: 12, authorships: [{ author: { display_name: 'A. Researcher' } }],
    primary_location: { source: { display_name: 'Journal of Test Agriculture' } },
    abstract_inverted_index: Object.fromEntries('We propose a CNN approach for leaf disease detection. We use a public leaf dataset of 5000 images. The model achieves 95% accuracy. However, it is limited to English labels. Future work will explore multilingual advice.'.split(' ').map((w, i) => [w, [i]])) },
  { title: 'Cooking recipes corpus', doi: null, id: 'https://openalex.org/W9', publication_date: '2020-01-01', cited_by_count: 0, authorships: [], abstract_inverted_index: null },
] }
export const fetchRouter = ({ github = () => ghResponse(), openalex = () => ({ ok: true, status: 200, headers: new Headers(), json: async () => OA_WORKS }) } = {}) => {
  const calls = []
  const fn = async (url, opts) => {
    const u = new URL(url); calls.push({ host: u.hostname, q: u.searchParams.get('q') || u.searchParams.get('search'), headers: opts?.headers || {} })
    if (u.hostname === 'api.github.com') return github(u)
    if (u.hostname === 'api.openalex.org') return openalex(u)
    return { ok: false, status: 503, headers: new Headers(), json: async () => ({}), text: async () => '' }
  }
  fn.calls = calls
  return fn
}
