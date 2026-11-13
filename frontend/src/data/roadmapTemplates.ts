type Stage = { title: string; description: string };
type Template = { id: string; role: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; duration: string; summary: string; stages: Stage[] };

const tracks = [
  { slug: 'data-engineer', role: 'Data Engineer', stages: {
    beginner: [['Data foundations', 'Learn SQL, data types and basic analysis.'], ['Programming', 'Build small Python data scripts.'], ['Pipelines', 'Move and clean datasets reliably.'], ['Practice', 'Document one end-to-end data project.']],
    intermediate: [['Data modeling', 'Design maintainable analytical datasets.'], ['Orchestration', 'Schedule and observe data workflows.'], ['Cloud systems', 'Use managed storage and processing tools.'], ['Reliability', 'Add tests, lineage and recovery procedures.']],
    advanced: [['Architecture', 'Compare batch and streaming patterns.'], ['Scale', 'Tune storage, compute and query cost.'], ['Governance', 'Design privacy and access boundaries.'], ['Leadership', 'Review a production data platform design.']],
  } },
  { slug: 'frontend-developer', role: 'Frontend Developer', stages: {
    beginner: [['Web foundations', 'Practice semantic HTML and CSS layouts.'], ['JavaScript', 'Handle state, events and asynchronous data.'], ['React', 'Build reusable components and simple pages.'], ['Practice', 'Publish an accessible responsive project.']],
    intermediate: [['Application structure', 'Organize routes and shared components.'], ['Data flows', 'Handle API states, forms and errors.'], ['Quality', 'Test interactions and accessibility.'], ['Performance', 'Measure and improve page loading.']],
    advanced: [['Architecture', 'Set boundaries for large frontend applications.'], ['Design systems', 'Build consistent reusable UI patterns.'], ['Optimization', 'Profile rendering and delivery.'], ['Leadership', 'Review accessibility and platform tradeoffs.']],
  } },
  { slug: 'ai-engineer', role: 'AI Engineer', stages: {
    beginner: [['Python foundations', 'Work with data and typed functions.'], ['ML basics', 'Understand evaluation and train/test splits.'], ['Model APIs', 'Call a model with safe inputs and outputs.'], ['Practice', 'Build and evaluate a small assistant.']],
    intermediate: [['Retrieval', 'Ground responses in trustworthy sources.'], ['Evaluation', 'Measure quality, errors and failure modes.'], ['Serving', 'Deploy a reliable inference API.'], ['Safety', 'Protect secrets and user data.']],
    advanced: [['System design', 'Choose models and retrieval architecture.'], ['Observability', 'Track latency, cost and quality.'], ['Robustness', 'Test adversarial inputs and drift.'], ['Leadership', 'Set release and incident practices.']],
  } },
] as const;

const levels = [
  { key: 'beginner', label: 'Beginner', duration: '8–12 weeks' },
  { key: 'intermediate', label: 'Intermediate', duration: '10–16 weeks' },
  { key: 'advanced', label: 'Advanced', duration: '12–20 weeks' },
] as const;

export const roadmapTemplates: Template[] = tracks.flatMap((track) => levels.map((level) => ({
  id: `${track.slug}-${level.key}`,
  role: track.role,
  level: level.label,
  duration: level.duration,
  summary: `A reference path for ${level.label.toLowerCase()} ${track.role.toLowerCase()}s. Adapt it to your own goals with AI Companion.`,
  stages: track.stages[level.key].map(([title, description]) => ({ title, description })),
})));
