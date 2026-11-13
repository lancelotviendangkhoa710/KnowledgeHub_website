<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\LearningRoadmap;
use App\Services\AI\CompanionRoadmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

class FormRoadmapController extends Controller
{
    public function __construct(private readonly CompanionRoadmapService $roadmaps) {}

    public function preview(Request $request): JsonResponse
    {
        $this->authorize('create', LearningRoadmap::class);
        $validated = $request->validate([
            'career_goal' => ['required', 'string', 'min:3', 'max:500'],
            'current_level' => ['required', 'string', 'min:3', 'max:200'],
            'target_job_requirements' => ['required', 'string', 'min:1', 'max:5000'],
            'weeks' => ['required', 'integer', 'between:1,104'],
            'hours_per_week' => ['required', 'integer', 'between:1,80'],
            'cv_file' => ['nullable', 'file', 'mimetypes:application/pdf', 'extensions:pdf', 'max:2048'],
        ]);
        $key = 'ai-roadmap-form-preview:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['status' => 'error', 'message' => 'Too many roadmap previews. Please retry later.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 60);

        try {
            $data = $this->roadmaps->previewForm($request->user(), $validated, $request->file('cv_file'));
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json(['status' => 'success', 'message' => 'Roadmap preview prepared.', 'data' => $data]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $this->authorize('create', LearningRoadmap::class);
        $validated = $request->validate(['preview_token' => ['required', 'string', 'max:150000']]);
        try {
            $result = $this->roadmaps->confirm($request->user(), null, $validated['preview_token']);
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json([
            'status' => 'success',
            'message' => $result['replayed'] ? 'Roadmap was already saved.' : 'Roadmap saved successfully.',
            'data' => $result['roadmap'],
        ], $result['replayed'] ? 200 : 201);
    }

    private function error(RuntimeException $exception): JsonResponse
    {
        $status = in_array($exception->getCode(), [409, 502, 503, 504], true) ? $exception->getCode() : 502;
        return response()->json(['status' => 'error', 'message' => $exception->getMessage()], $status);
    }
}
