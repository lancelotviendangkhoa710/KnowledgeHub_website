<?php

namespace App\Services\AI;

use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CvAssessmentService
{
    public function __construct(private readonly CompanionRoadmapAiClient $extractor,
        private readonly AgentAiClient $ai, private readonly UserCvService $cvs) {}

    public function preview(User $user, UploadedFile $file, ?string $targetRole): array
    {
        $text = $this->extractor->extractPdf($file);
        $result = $this->ai->post('/v1/agents/cv/assess', ['cv_text' => $text,
            'target_role' => $targetRole]);
        $assessment = $this->validateAssessment($result, $text);
        $digest = hash_file('sha256', $file->getRealPath());
        if ($digest === false) {
            throw new RuntimeException('CV analysis is temporarily unavailable.', 503);
        }
        $expires = now()->addMinutes(15);
        $previewToken = Crypt::encryptString(json_encode(['user_id' => $user->id,
            'file_hash' => $digest, 'assessment' => $assessment,
            'expires_at' => $expires->timestamp], JSON_THROW_ON_ERROR));
        return ['assessment' => $assessment, 'preview_token' => $previewToken,
            'expires_at' => $expires->toISOString()];
    }

    public function confirm(User $user, UploadedFile $file, string $token): array
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            throw ValidationException::withMessages(['preview_token' => ['Invalid preview token.']]);
        }
        $digest = hash_file('sha256', $file->getRealPath());
        if (! is_array($payload) || ($payload['user_id'] ?? null) !== $user->id
            || ! is_string($digest) || ! is_string($payload['file_hash'] ?? null)
            || ! hash_equals($payload['file_hash'], $digest)
            || ! is_int($payload['expires_at'] ?? null) || $payload['expires_at'] < now()->timestamp
            || ! is_array($payload['assessment'] ?? null)) {
            throw ValidationException::withMessages(['preview_token' => ['Preview expired or CV changed.']]);
        }
        // The preview wrote no database state. Claim its hash atomically now:
        // one confirmation wins, including under concurrent requests.
        $claimed = DB::table('ai_cv_confirmations')->insertOrIgnore(['id' => (string) Str::uuid(),
            'user_id' => $user->id, 'token_hash' => hash('sha256', $token),
            'expires_at' => now()->setTimestamp($payload['expires_at']),
            'created_at' => now(), 'updated_at' => now()]);
        if ($claimed !== 1) {
            throw ValidationException::withMessages(['preview_token' => ['This preview has already been confirmed.']]);
        }
        // The signed preview already passed evidence validation. Re-extraction
        // during save verifies the same PDF through the existing CV pipeline.
        $saved = $this->cvs->save($user, $file, $payload['assessment']);
        return ['cv' => ['id' => $saved->id, 'filename' => $saved->filename,
            'size_bytes' => $saved->size_bytes, 'consented_at' => $saved->consented_at->toISOString(),
            'created_at' => $saved->created_at->toISOString()],
            'assessment' => $saved->assessment];
    }

    private function validateAssessment(array $result, string $text): array
    {
        $summary = $this->bounded($result['summary'] ?? null, 1500);
        $strengths = $result['strengths'] ?? null;
        $recommendations = $result['recommendations'] ?? null;
        $gaps = $result['gaps'] ?? null;
        if ($summary === null || ! is_array($strengths) || count($strengths) > 12
            || ! is_array($recommendations) || count($recommendations) > 10
            || ! is_array($gaps) || count($gaps) > 10) {
            throw new RuntimeException('AI agent returned an invalid assessment.', 502);
        }
        $validStrengths = [];
        foreach ($strengths as $entry) {
            $skill = is_array($entry) ? $this->bounded($entry['skill'] ?? null, 100) : null;
            $evidence = is_array($entry) ? $this->bounded($entry['evidence'] ?? null, 500) : null;
            if ($skill === null || $evidence === null || ! str_contains($text, $evidence)) {
                throw new RuntimeException('AI agent returned unsupported CV evidence.', 502);
            }
            $validStrengths[] = ['skill' => $skill, 'evidence' => $evidence];
        }
        $validRecommendations = $this->boundedList($recommendations, 500);
        $validGaps = $this->boundedList($gaps, 500);
        return ['summary' => $summary, 'strengths' => $validStrengths,
            'recommendations' => $validRecommendations, 'gaps' => $validGaps];
    }

    private function boundedList(array $values, int $max): array
    {
        $result = [];
        foreach ($values as $value) {
            $bounded = $this->bounded($value, $max);
            if ($bounded === null) {
                throw new RuntimeException('AI agent returned an invalid assessment.', 502);
            }
            $result[] = $bounded;
        }
        return $result;
    }

    private function bounded(mixed $value, int $max): ?string
    {
        return is_string($value) && trim($value) !== '' && mb_strlen($value) <= $max ? trim($value) : null;
    }
}
