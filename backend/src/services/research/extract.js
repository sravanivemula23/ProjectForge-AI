/** Extractive (never generative) reading of a paper abstract. Each field is a verbatim sentence from the real abstract,
 *  or null when the abstract does not contain it (the UI then shows "Information unavailable"). */
const split = (s) => String(s || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9(])/).map((x) => x.trim()).filter((x) => x.length > 20)
const RULES = {
  methodology: /\b(we (propose|present|introduce|develop|design|use|employ|apply|train)|this (paper|study|work) (propose|present|introduce|use|develop)s?|based on|using|approach|method|framework|architecture|model)\b/i,
  dataset: /\b(dataset|data set|corpus|benchmark|images|samples|collected|annotated|database)\b/i,
  mainResult: /\b(achiev|accuracy|outperform|improv|result|f1|precision|recall|auc|reduce|%|significant)\w*/i,
  limitations: /\b(limitation|limited|however|challenge|remain|lack|only|fails?|restrict|not (yet )?(address|consider))\w*/i,
  futureWork: /\b(future (work|research|direction)|will (be )?(explore|extend|investigate)|in the future|further (research|work|study))\b/i,
}
export function extractFromAbstract(abstract) {
  const sentences = split(abstract), used = new Set(), out = {}
  const order = ['futureWork', 'limitations', 'dataset', 'mainResult', 'methodology']
  for (const key of order) {
    const i = sentences.findIndex((s, idx) => !used.has(idx) && RULES[key].test(s))
    if (i >= 0) { used.add(i); out[key] = { text: sentences[i], source: 'abstract' } } else out[key] = null
  }
  return { methodology: out.methodology, dataset: out.dataset, mainResult: out.mainResult, limitations: out.limitations, futureWork: out.futureWork, hasAbstract: sentences.length > 0 }
}
