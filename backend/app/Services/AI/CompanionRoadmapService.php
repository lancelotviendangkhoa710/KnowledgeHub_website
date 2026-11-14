<?php

namespace App\Services\AI;

use App\Models\Conversation;
use App\Models\LearningRoadmap;
use App\Models\Message;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/** Owns the chat-to-roadmap flow; the AI service never receives database credentials. */
class CompanionRoadmapService
{
    private const OFFICIAL_HOSTS = [
        'docs.python.org', 'developer.mozilla.org', 'www.postgresql.org',
        'learn.microsoft.com', 'docs.aws.amazon.com', 'cloud.google.com',
        'docs.cloud.google.com', 'kubernetes.io', 'pytorch.org', 'docs.pytorch.org',
    ];

    public function __construct(
        private readonly CompanionRoadmapAiClient $ai,
        private readonly RoadmapCatalogService $catalog,
        private readonly UserMemoryService $memories,
    ) {}

    public function preview(User $user, Conversation $conversation): array
    {
        if (! (bool) config('services.ai.chat_enabled', false)) {
            throw new RuntimeException(MessageService::CHAT_DISABLED_MESSAGE, 503);
        }

        $messages = $this->recentMessages($conversation);
        if ($messages === []) {
            $question = 'What career or learning goal would you like a roadmap for? Tell me your current level, available weeks, and study hours per week.';
            $this->appendQuestion($conversation, $question);
            return ['state' => 'needs_input', 'question' => $question, 'missing_fields' => ['goal', 'level', 'weeks', 'hours_per_week']];
        }

        $intent = $this->ai->post('/v1/roadmaps/intent', [
            'messages' => $messages,
            'memory' => array_map(static fn (string $value): string => mb_substr($value, 0, 500), $this->memories->activeForPrompt($user, 10)),
        ]);
        if (($intent['status'] ?? null) === 'needs_input') {
            $question = $intent['question'] ?? null;
            $missing = $intent['missing_fields'] ?? null;
            if (! is_string($question) || trim($question) === '' || mb_strlen($question) > 1000
                || ! is_array($missing) || ! array_is_list($missing) || $missing === []
                || array_diff($missing, ['goal', 'level', 'weeks', 'hours_per_week']) !== []) {
                throw new RuntimeException('Roadmap generation returned an invalid response.', 502);
            }
            $this->appendQuestion($conversation, $question);
            return ['state' => 'needs_input', 'question' => $question, 'missing_fields' => $missing];
        }
        if (($intent['status'] ?? null) !== 'ready') {
            throw new RuntimeException('Roadmap generation returned an invalid response.', 502);
        }

        $profile = $this->validateProfile($intent['profile'] ?? null);
        return $this->generateDraft($user, $conversation, $profile, null);
    }

    public function previewForm(User $user, array $input, ?UploadedFile $cv): array
    {
        $cvText = $cv === null ? null : $this->ai->extractPdf($cv);
        $intent = $this->ai->post('/v1/roadmaps/form-intent', [
            'career_goal' => trim($input['career_goal']),
            'current_level' => trim($input['current_level']),
            'target_job_requirements' => trim($input['target_job_requirements']),
            'weeks' => (int) $input['weeks'],
            'hours_per_week' => (int) $input['hours_per_week'],
            'cv_text' => $cvText,
        ]);
        $profile = $this->validateProfile($intent['profile'] ?? null);
        $profile['current_level_text'] = trim($input['current_level']);
        $analysis = $this->validateCvAnalysis($intent['cv_analysis'] ?? null, $cvText, $profile['skills']);
        return $this->generateDraft($user, null, $profile, $analysis);
    }

    private function generateDraft(User $user, ?Conversation $conversation, array $profile, ?array $cvAnalysis): array
    {
        $skills = $profile['skills'];
        $ranked = $this->catalog->rank($skills, $profile['goal']);
        $composition = $this->ai->post('/v1/roadmaps/compose', ['profile' => $profile, 'skills' => $skills]);
        $items = $this->validateComposition($composition, $skills);
        $totalMinutes = $profile['weeks'] * $profile['hours_per_week'] * 60;
        $baseMinutes = intdiv($totalMinutes, count($items));
        $remainingMinutes = $totalMinutes % count($items);
        foreach ($items as $index => &$item) {
            $item['estimated_minutes'] = $baseMinutes + ($index < $remainingMinutes ? 1 : 0);
            $startMinute = $index * $baseMinutes + min($index, $remainingMinutes);
            $endMinute = $startMinute + $item['estimated_minutes'];
            $weeklyMinutes = $profile['hours_per_week'] * 60;
            $item['week_start'] = intdiv($startMinute, $weeklyMinutes) + 1;
            $item['week_end'] = intdiv($endMinute - 1, $weeklyMinutes) + 1;
        }
        unset($item);
        $items = $this->attachCourses($items, $ranked);

        $internal = $this->internalCoverage($skills, $items, $ranked);
        $needsResources = array_values(array_filter($skills, static fn (string $skill): bool => $internal[$skill]['score'] < 1.0));
        $resources = [];
        $resourceStatus = 'ok';
        if ($needsResources !== []) {
            $resourcePayload = $this->ai->post('/v1/resources/search', ['skills' => $needsResources]);
            if (! in_array($resourcePayload['retrieval_status'] ?? null, ['ok', 'unavailable'], true)) {
                throw new RuntimeException('Resource retrieval returned an invalid response.', 502);
            }
            $resourceStatus = $resourcePayload['retrieval_status'];
            $resources = $this->validateResources($resourcePayload['resources'] ?? null, $needsResources);
        }
        [$items, $coverage] = $this->attachResourcesAndScore($items, $skills, $internal, $resources);
        $coverage['profile'] = $profile;
        $coverage['resource_status'] = $resourceStatus;
        if ($cvAnalysis !== null) {
            $coverage['cv_analysis'] = $cvAnalysis;
        }

        $draft = [
            'title' => trim($composition['title']),
            'summary' => trim($composition['summary']),
            'goal' => $profile['goal'],
            'items' => $items,
            'coverage' => $coverage,
            'cv_analysis' => $cvAnalysis,
        ];
        $expires = now()->addMinutes(30);
        $previewCiphertext = Crypt::encryptString(json_encode([
            'user_id' => (string) $user->id,
            'conversation_id' => $conversation?->id,
            'generation_key' => (string) Str::uuid(),
            'expires_at' => $expires->timestamp,
            'draft' => $draft,
        ], JSON_THROW_ON_ERROR));

        if (strlen($previewCiphertext) > 150000) {
            throw new RuntimeException('Roadmap preview is too large. Please shorten your details and try again.', 502);
        }
        return ['state' => 'ready', 'draft' => $draft, 'preview_token' => $previewCiphertext, 'expires_at' => $expires->toIso8601String()];
    }

    /** @return array{roadmap: LearningRoadmap, replayed: bool} */
    public function confirm(User $user, ?Conversation $conversation, string $token): array
    {
        try {
            $signed = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException $exception) {
            throw ValidationException::withMessages(['preview_token' => 'The roadmap preview token is invalid.']);
        }
        if (! is_array($signed) || ($signed['user_id'] ?? null) !== (string) $user->id
            || ($signed['conversation_id'] ?? null) !== $conversation?->id
            || ! is_string($signed['generation_key'] ?? null) || ! Str::isUuid($signed['generation_key'])
            || ! is_int($signed['expires_at'] ?? null)
            || ! is_array($signed['draft'] ?? null) || ! is_array($signed['draft']['items'] ?? null)) {
            throw ValidationException::withMessages(['preview_token' => 'The roadmap preview token is invalid or expired.']);
        }

        $generationKey = $signed['generation_key'];
        $existing = LearningRoadmap::query()->where('generation_key', $generationKey)->where('user_id', $user->id)->first();
        if ($existing !== null) {
            return ['roadmap' => $existing->load('items'), 'replayed' => true];
        }
        if ($signed['expires_at'] < now()->timestamp) {
            throw ValidationException::withMessages(['preview_token' => 'The roadmap preview token has expired.']);
        }

        $draft = $signed['draft'];
        foreach ($draft['items'] as $item) {
            if (! is_array($item) || ! is_null($item['article_id'] ?? null)
                && (! is_string($item['article_id']) || ! $this->catalog->isCurrentlyPublished($item['article_id']))) {
                throw new RuntimeException('A course changed since preview. Generate a new roadmap.', 409);
            }
            foreach (($item['external_resources'] ?? []) as $resource) {
                if (! is_array($resource) || ! $this->isAllowedUrl($resource['url'] ?? null) || ! $this->resourceReachable($resource['url'])) {
                    throw new RuntimeException('An external resource changed since preview. Generate a new roadmap.', 409);
                }
            }
        }

        try {
            $roadmap = DB::transaction(function () use ($user, $draft, $generationKey): LearningRoadmap {
                $roadmap = LearningRoadmap::query()->create([
                    'user_id' => $user->id,
                    'title' => $draft['title'],
                    'goal' => $draft['goal'],
                    'status' => 'active',
                    'origin' => 'ai',
                    'generation_key' => $generationKey,
                    'ai_summary' => $draft['summary'],
                    'coverage' => $draft['coverage'],
                ]);
                $previousItemId = null;
                foreach ($draft['items'] as $item) {
                    $createdItem = $roadmap->items()->create([
                        'article_id' => $item['article_id'],
                        'title' => $item['title'],
                        'description' => $item['description'],
                        'position' => $item['position'],
                        'ai_details' => [
                            'stage_title' => $item['stage_title'],
                            'skills' => $item['skills'],
                            'estimated_minutes' => $item['estimated_minutes'],
                            'week_start' => $item['week_start'],
                            'week_end' => $item['week_end'],
                            'course' => $item['course'],
                            'external_resources' => $item['external_resources'],
                        ],
                    ]);
                    if ($previousItemId !== null) {
                        DB::table('roadmap_item_prerequisites')->insert([
                            'roadmap_item_id' => $createdItem->id,
                            'prerequisite_item_id' => $previousItemId,
                        ]);
                    }
                    $previousItemId = $createdItem->id;
                }
                return $roadmap->load('items');
            });
            return ['roadmap' => $roadmap, 'replayed' => false];
        } catch (UniqueConstraintViolationException $exception) {
            $existing = LearningRoadmap::query()->where('generation_key', $generationKey)->where('user_id', $user->id)->first();
            if ($existing !== null) {
                return ['roadmap' => $existing->load('items'), 'replayed' => true];
            }
            throw $exception;
        }
    }

    private function recentMessages(Conversation $conversation): array
    {
        $query = Message::query()->where('conversation_id', $conversation->id)->whereIn('role', ['user', 'assistant']);
        if (Schema::hasColumn('messages', 'sequence')) {
            $query->orderByDesc('sequence')->orderByDesc('created_at')->orderByDesc('id');
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }
        return $query->limit(20)->get(['role', 'content'])->reverse()->map(static fn (Message $message): array => [
            'role' => $message->role,
            'content' => mb_substr((string) $message->content, 0, 8000),
        ])->values()->all();
    }

    private function appendQuestion(Conversation $conversation, string $question): void
    {
        $lastUserId = Message::query()->where('conversation_id', $conversation->id)
            ->where('role', 'user')->orderByDesc('created_at')->orderByDesc('id')->value('id');
        $key = hash('sha256', (string) $lastUserId.'|'.$question);
        DB::transaction(function () use ($conversation, $question, $key): void {
            Conversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();
            $exists = Message::query()->where('conversation_id', $conversation->id)
                ->whereRaw("metadata->>'roadmap_question_key' = ?", [$key])->exists();
            if ($exists) {
                return;
            }
            $message = new Message([
                'conversation_id' => $conversation->id,
                'role' => 'assistant',
                'content' => $question,
                'metadata' => ['roadmap_question_key' => $key],
            ]);
            if (Schema::hasColumn('messages', 'sequence')) {
                $message->sequence = ((int) Message::query()->where('conversation_id', $conversation->id)->max('sequence')) + 1;
            }
            $last = Message::query()->where('conversation_id', $conversation->id)->max('created_at');
            $created = now()->startOfSecond();
            if ($last !== null && $created->lessThanOrEqualTo($last)) {
                $created = \Illuminate\Support\Carbon::parse($last)->addSecond();
            }
            $message->created_at = $created;
            $message->save();
            $conversation->updated_at = $created;
            $conversation->save();
        });
    }

    private function validateProfile(mixed $value): array
    {
        if (! is_array($value) || ! is_string($value['goal'] ?? null) || mb_strlen(trim($value['goal'])) < 3
            || mb_strlen($value['goal']) > 500 || ! in_array($value['level'] ?? null, ['beginner', 'intermediate', 'advanced'], true)
            || ! is_int($value['weeks'] ?? null) || $value['weeks'] < 1 || $value['weeks'] > 104
            || ! is_int($value['hours_per_week'] ?? null) || $value['hours_per_week'] < 1 || $value['hours_per_week'] > 80
            || ! is_array($value['skills'] ?? null) || ! array_is_list($value['skills'])
            || count($value['skills']) < 1 || count($value['skills']) > 12
            || ! is_array($value['constraints'] ?? null) || ! array_is_list($value['constraints'])) {
            throw new RuntimeException('Roadmap generation returned an invalid learning profile.', 502);
        }
        $skills = [];
        foreach ($value['skills'] as $skill) {
            if (! is_string($skill) || trim($skill) === '' || mb_strlen($skill) > 100) {
                throw new RuntimeException('Roadmap generation returned an invalid learning profile.', 502);
            }
            $skills[mb_strtolower(trim($skill))] = trim($skill);
        }
        $constraints = [];
        foreach ($value['constraints'] as $constraint) {
            if (! is_string($constraint) || mb_strlen($constraint) > 500 || count($constraints) >= 10) {
                throw new RuntimeException('Roadmap generation returned an invalid learning profile.', 502);
            }
            $constraints[] = trim($constraint);
        }
        return [
            'goal' => trim($value['goal']), 'level' => $value['level'],
            'weeks' => $value['weeks'], 'hours_per_week' => $value['hours_per_week'],
            'constraints' => $constraints, 'skills' => array_values($skills),
        ];
    }

    private function validateCvAnalysis(mixed $value, ?string $cvText, array $skills): ?array
    {
        if ($cvText === null) {
            return null;
        }
        if (! is_array($value) || ! is_array($value['strengths'] ?? null)
            || ! array_is_list($value['strengths']) || ! is_array($value['recommendations'] ?? null)
            || ! array_is_list($value['recommendations'])) {
            throw new RuntimeException('CV analysis returned an invalid response.', 502);
        }
        $allowed = array_combine(array_map('mb_strtolower', $skills), $skills);
        $normalizedCv = preg_replace('/\s+/u', ' ', mb_strtolower($cvText));
        $strengths = [];
        foreach (array_slice($value['strengths'], 0, 20) as $entry) {
            if (! is_array($entry) || ! is_string($entry['skill'] ?? null)
                || ! is_string($entry['evidence'] ?? null)) {
                continue;
            }
            $key = mb_strtolower(trim($entry['skill']));
            $evidence = trim($entry['evidence']);
            $normalizedEvidence = preg_replace('/\s+/u', ' ', mb_strtolower($evidence));
            if (! isset($allowed[$key]) || $evidence === '' || mb_strlen($evidence) > 300
                || $normalizedEvidence === '' || ! str_contains($normalizedCv, $normalizedEvidence)) {
                continue;
            }
            $strengths[$key] = ['skill' => $allowed[$key], 'evidence' => $evidence];
        }
        $recommendations = [];
        foreach (array_slice($value['recommendations'], 0, 12) as $recommendation) {
            if (is_string($recommendation) && trim($recommendation) !== '' && mb_strlen($recommendation) <= 500) {
                $recommendations[] = trim($recommendation);
            }
        }
        $gaps = array_values(array_filter($skills, static fn (string $skill): bool => ! isset($strengths[mb_strtolower($skill)])));
        return [
            'strengths' => array_values($strengths),
            'gaps' => $gaps,
            'recommendations' => $recommendations,
            'cv_match_percent' => (int) round(count($strengths) * 100 / count($skills)),
        ];
    }

    private function validateComposition(array $composition, array $skills): array
    {
        $items = $composition['items'] ?? null;
        if (! is_string($composition['title'] ?? null) || trim($composition['title']) === '' || mb_strlen($composition['title']) > 255
            || ! is_string($composition['summary'] ?? null) || trim($composition['summary']) === '' || mb_strlen($composition['summary']) > 5000
            || ! is_array($items) || ! array_is_list($items) || count($items) < 4 || count($items) > 12) {
            throw new RuntimeException('Roadmap generation returned an invalid plan.', 502);
        }
        $allowed = array_combine(array_map('mb_strtolower', $skills), $skills);
        $normalized = [];
        foreach ($items as $index => $item) {
            if (! is_array($item) || ! is_string($item['title'] ?? null) || trim($item['title']) === '' || mb_strlen($item['title']) > 255
                || ! is_string($item['description'] ?? null) || trim($item['description']) === '' || mb_strlen($item['description']) > 5000
                || ! is_string($item['stage_title'] ?? null) || trim($item['stage_title']) === '' || mb_strlen($item['stage_title']) > 255
                || ! is_array($item['skills'] ?? null) || ! array_is_list($item['skills'])) {
                throw new RuntimeException('Roadmap generation returned an invalid plan.', 502);
            }
            $itemSkills = [];
            foreach ($item['skills'] as $skill) {
                if (! is_string($skill) || ! isset($allowed[mb_strtolower(trim($skill))])) {
                    throw new RuntimeException('Roadmap generation returned an invalid plan.', 502);
                }
                $itemSkills[] = $allowed[mb_strtolower(trim($skill))];
            }
            $normalized[] = [
                'position' => $index + 1, 'title' => trim($item['title']),
                'description' => trim($item['description']), 'stage_title' => trim($item['stage_title']),
                'skills' => array_values(array_unique($itemSkills)), 'article_id' => null,
                'course' => null, 'external_resources' => [], 'estimated_minutes' => 0,
            ];
        }
        // A provider may omit a required skill from its stages; retain every extracted
        // skill in the plan so the coverage denominator cannot silently shrink.
        $represented = array_unique(array_merge(...array_column($normalized, 'skills')));
        foreach ($skills as $index => $skill) {
            if (! in_array($skill, $represented, true)) {
                $normalized[$index % count($normalized)]['skills'][] = $skill;
            }
        }
        return $normalized;
    }

    private function attachCourses(array $items, array $ranked): array
    {
        $used = [];
        foreach ($items as &$item) {
            $choices = [];
            foreach ($item['skills'] as $skill) {
                foreach ($ranked[$skill] ?? [] as $candidate) {
                    $choices[] = $candidate;
                }
            }
            usort($choices, static fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: strcmp($a['id'], $b['id']));
            $selected = null;
            foreach ($choices as $choice) {
                if (! isset($used[$choice['id']])) {
                    $selected = $choice;
                    break;
                }
            }
            if ($selected !== null) {
                $used[$selected['id']] = true;
                $item['article_id'] = $selected['id'];
                $item['course'] = [
                    'id' => $selected['id'], 'title' => $selected['title'], 'url' => $selected['url'],
                    'reason' => $selected['evidence'],
                ];
            }
        }
        unset($item);
        return $items;
    }

    private function internalCoverage(array $skills, array $items, array $ranked): array
    {
        $result = [];
        foreach ($skills as $skill) {
            $best = ['score' => 0.0, 'evidence' => []];
            foreach ($items as $item) {
                if (! in_array($skill, $item['skills'], true) || $item['article_id'] === null) {
                    continue;
                }
                foreach ($ranked[$skill] ?? [] as $candidate) {
                    if ($candidate['id'] === $item['article_id'] && $candidate['score'] > $best['score']) {
                        $best = ['score' => $candidate['score'], 'evidence' => [$candidate['title'].' — '.$candidate['evidence']]];
                    }
                }
            }
            $result[$skill] = $best;
        }
        return $result;
    }

    private function validateResources(mixed $value, array $skills): array
    {
        if (! is_array($value) || ! array_is_list($value) || count($value) > 36) {
            throw new RuntimeException('Resource retrieval returned an invalid response.', 502);
        }
        $resources = [];
        foreach ($value as $resource) {
            if (! is_array($resource) || ! in_array($resource['skill'] ?? null, $skills, true)
                || ! is_string($resource['title'] ?? null) || trim($resource['title']) === '' || mb_strlen($resource['title']) > 255
                || ! is_string($resource['topic'] ?? null) || mb_strlen($resource['topic']) > 255
                || ! is_string($resource['reason'] ?? null) || mb_strlen($resource['reason']) > 1000
                || ! is_string($resource['verified_at'] ?? null) || strtotime($resource['verified_at']) === false
                || ! $this->isAllowedUrl($resource['url'] ?? null)) {
                continue;
            }
            $resource['title'] = trim($resource['title']);
            $resource['topic'] = trim($resource['topic']);
            $resource['reason'] = trim($resource['reason']);
            if (count($resources[$resource['skill']] ?? []) < 2) {
                $resources[$resource['skill']][] = $resource;
            }
        }
        return $resources;
    }

    private function attachResourcesAndScore(array $items, array $skills, array $internal, array $resources): array
    {
        foreach ($items as &$item) {
            foreach ($item['skills'] as $skill) {
                foreach ($resources[$skill] ?? [] as $resource) {
                    if (count($item['external_resources']) < 3 && ! in_array($resource, $item['external_resources'], true)) {
                        $item['external_resources'][] = array_diff_key($resource, ['skill' => true]);
                    }
                }
            }
        }
        unset($item);
        $skillScores = [];
        $internalSum = 0.0;
        $externalSum = 0.0;
        foreach ($skills as $skill) {
            $internalScore = $internal[$skill]['score'];
            $externalScore = 0.0;
            $evidence = $internal[$skill]['evidence'];
            foreach ($items as $item) {
                if (! in_array($skill, $item['skills'], true)) {
                    continue;
                }
                foreach ($item['external_resources'] as $resource) {
                    $sourceScore = mb_stripos($resource['title'].' '.($resource['topic'] ?? ''), $skill) !== false ? 1.0 : 0.5;
                    $externalScore = max($externalScore, $sourceScore);
                    $evidence[] = $resource['title'].' — '.$resource['url'];
                }
            }
            $supplement = max(0.0, $externalScore - $internalScore);
            $internalSum += $internalScore;
            $externalSum += $supplement;
            $skillScores[] = [
                'skill' => $skill, 'internal' => (int) round($internalScore * 100),
                'external' => (int) round($supplement * 100), 'evidence' => $evidence,
            ];
        }
        $count = count($skills);
        $internalPercent = (int) round(100 * $internalSum / $count);
        $externalPercent = (int) round(100 * $externalSum / $count);
        $coverage = [
            'internal_percent' => $internalPercent,
            'external_percent' => $externalPercent,
            'overall_percent' => min(100, $internalPercent + $externalPercent),
            'gaps' => array_values(array_map(static fn (array $entry): string => $entry['skill'],
                array_filter($skillScores, static fn (array $entry): bool => $entry['internal'] + $entry['external'] < 100))),
            'skills' => $skillScores,
        ];
        return [$items, $coverage];
    }

    private function isAllowedUrl(mixed $url): bool
    {
        if (! is_string($url) || strlen($url) > 2000 || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }
        $parts = parse_url($url);
        return is_array($parts) && ($parts['scheme'] ?? null) === 'https'
            && in_array(strtolower($parts['host'] ?? ''), self::OFFICIAL_HOSTS, true)
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && (! isset($parts['port']) || $parts['port'] === 443);
    }

    private function resourceReachable(string $url): bool
    {
        try {
            for ($redirects = 0; $redirects < 3; $redirects++) {
                if (! $this->isAllowedUrl($url)) {
                    return false;
                }
                $response = Http::withOptions(['allow_redirects' => false])->timeout(5)->head($url);
                if (in_array($response->status(), [403, 405], true)) {
                    $response = Http::withOptions(['allow_redirects' => false])
                        ->withHeader('Range', 'bytes=0-1023')->timeout(5)->get($url);
                }
                if ($response->successful()) {
                    return true;
                }
                if (! in_array($response->status(), [301, 302, 303, 307, 308], true)) {
                    return false;
                }
                $location = $response->header('Location');
                if (! is_string($location) || $location === '' || str_starts_with($location, '//')) {
                    return false;
                }
                if (str_starts_with($location, 'https://')) {
                    $url = $location;
                } elseif (str_starts_with($location, '/')) {
                    $url = 'https://'.parse_url($url, PHP_URL_HOST).$location;
                } else {
                    $base = rtrim(dirname(parse_url($url, PHP_URL_PATH) ?: '/'), '/');
                    $url = 'https://'.parse_url($url, PHP_URL_HOST).$base.'/'.$location;
                }
            }
            return false;
        } catch (\Throwable) {
            return false;
        }
    }
}
