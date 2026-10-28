/** Relevance-gated innovation aspects shared by the research-gap engine, reality check and differentiation engine.
 *  An aspect is only suggested when `applies(ctx)` is true (no blind feature stuffing) and the project does not already include it. */
import { projectText } from './text.js'

const T = (re) => (txt) => re.test(txt)
export const aspectContext = (c) => {
  const txt = projectText(c)
  return {
    txt, domain: String(c.domain || '').toLowerCase(),
    ml: c.ai_ml_components.length > 0 || T(/model|learning|neural|cnn|transformer|nlp|vision|llm|detect|predict|classif|recogni|recommend/)(txt),
    nlp: T(/nlp|language|text|chatbot|sentiment|resume|llm|summar|translat|question/)(txt),
    vision: T(/vision|image|x-ray|camera|ocr|video|face|leaf|detect/)(txt),
    iot: T(/iot|sensor|esp32|arduino|embedded|edge/)(txt),
    mobile: T(/mobile|android|ios|flutter|app\b/)(txt),
    sensitive: T(/health|medical|patient|finance|bank|student|face|biometric|clinical|personal/)(txt),
    users: T(/student|learner|user|patient|farmer|career|recommend|personal|job|resume/)(txt),
    realtime: T(/iot|detect|stream|monitor|alert|real-time|live|sensor|camera|anomaly/)(txt),
    accessibility: T(/education|health|agri|farmer|mobile|assistive|student|learn/)(txt),
    agentic: T(/llm|chatbot|assistant|recommend|resume|tutor|advis|plan/)(txt),
    web: T(/web|dashboard|react|portal|platform/)(txt),
  }
}

export const ASPECTS = [
  { id: 'multilingual', label: 'Multilingual support', feature: 'Multilingual / regional-language support', kw: ['multilingual', 'multi-language', 'regional language', 'cross-lingual', 'translation'], applies: (x) => x.nlp || x.accessibility, difficulty: 'Medium', gain: 8,
    why: 'Most existing work is English-only; supporting regional languages widens the user base and is a clear point of differentiation.' },
  { id: 'explainable', label: 'Explainable AI', feature: 'Explainable AI (feature attributions / attention maps)', kw: ['explainab', 'interpretab', 'grad-cam', 'gradcam', 'shap', 'lime', 'attention map'], applies: (x) => x.ml, difficulty: 'Medium', gain: 8,
    why: 'Showing why a prediction was made builds trust and is rarely included in student-level implementations.' },
  { id: 'realtime', label: 'Real-time operation', feature: 'Real-time prediction / streaming pipeline', kw: ['real-time', 'realtime', 'streaming', 'low latency', 'live'], applies: (x) => x.realtime, difficulty: 'Medium', gain: 6,
    why: 'Many prototypes work offline on static data; real-time processing demonstrates systems engineering.' },
  { id: 'edge', label: 'Edge / offline deployment', feature: 'Edge or offline deployment (on-device inference)', kw: ['edge', 'offline', 'on-device', 'tflite', 'embedded', 'quantiz'], applies: (x) => x.iot || x.mobile || x.vision || x.domain === 'agriculture', difficulty: 'High', gain: 8,
    why: 'Works where connectivity is poor and reduces latency and cloud cost.' },
  { id: 'privacy', label: 'Privacy-preserving design', feature: 'Privacy-preserving / federated learning architecture', kw: ['federated', 'privacy-preserving', 'differential privacy', 'privacy', 'encrypted'], applies: (x) => x.sensitive && x.ml, difficulty: 'High', gain: 9,
    why: 'Your data type is sensitive; keeping data local while still learning is both a technical and an ethical strength.' },
  { id: 'personalization', label: 'Personalization', feature: 'Personalized recommendations / adaptive behaviour', kw: ['personaliz', 'personalis', 'adaptive', 'tailored', 'user-specific'], applies: (x) => x.users, difficulty: 'Medium', gain: 6,
    why: 'Generic outputs are common; adapting to each user turns the project from a tool into a product.' },
  { id: 'multimodal', label: 'Multimodal input', feature: 'Multimodal fusion (e.g. image + text/metadata)', kw: ['multimodal', 'multi-modal', 'fusion', 'image and text'], applies: (x) => x.ml && (x.vision || x.nlp), difficulty: 'High', gain: 7,
    why: 'Combining modalities often beats single-source baselines and is under-explored in simple projects.' },
  { id: 'human', label: 'Human-in-the-loop validation', feature: 'Human-in-the-loop validation and feedback learning', kw: ['human-in-the-loop', 'active learning', 'expert validation', 'feedback loop', 'feedback'], applies: (x) => x.ml, difficulty: 'Medium', gain: 5,
    why: 'Lets experts correct predictions and feeds corrections back, improving quality over time.' },
  { id: 'voice', label: 'Voice interface', feature: 'Voice interface / speech interaction', kw: ['voice', 'speech', 'voice assistant', 'conversational'], applies: (x) => x.accessibility, difficulty: 'Medium', gain: 5,
    why: 'Improves accessibility for low-literacy or hands-busy users.' },
  { id: 'agentic', label: 'Agentic workflows', feature: 'Agentic workflow (planning + tool use with guardrails)', kw: ['agent', 'agentic', 'tool use', 'autonomous'], applies: (x) => x.agentic, difficulty: 'High', gain: 7,
    why: 'Moves from single-shot answers to multi-step task completion, which is still uncommon in student projects.' },
  { id: 'dataset', label: 'New dataset / benchmark', feature: 'Curated dataset or evaluation benchmark', kw: ['benchmark', 'new dataset', 'curated dataset', 'annotated'], applies: (x) => x.ml, difficulty: 'Medium', gain: 7,
    why: 'A documented dataset or benchmark is a reusable research contribution.' },
  { id: 'analytics', label: 'Advanced analytics & visualization', feature: 'Real-time analytics dashboard with insight visualizations', kw: ['dashboard', 'visualization', 'visualisation', 'analytics', 'insight'], applies: (x) => x.web, difficulty: 'Low', gain: 4,
    why: 'Turns raw outputs into actionable insight for non-technical users.' },
  { id: 'mlops', label: 'Monitoring & MLOps', feature: 'Model monitoring and drift detection (MLOps)', kw: ['drift', 'mlops', 'model monitoring', 'model registry'], applies: (x) => x.ml, difficulty: 'Medium', gain: 5,
    why: 'Shows production-readiness: models degrade silently unless monitored.' },
  { id: 'recommender', label: 'Recommendation engine', feature: 'Recommendation engine for next best action', kw: ['recommend', 'next best', 'suggestion engine'], applies: (x) => x.users && x.ml, difficulty: 'Medium', gain: 5,
    why: 'Guides users to what to do next instead of only reporting results.' },
]
export const aspectPresentIn = (a, textLower) => a.kw.some((k) => textLower.includes(k))
