import { redirect } from 'next/navigation';

export default function AiRoadmapRedirect() {
  redirect('/learning/roadmaps?mode=ai');
}
