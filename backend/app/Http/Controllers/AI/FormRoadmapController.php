<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\FormRoadmapConfirmRequest;
use App\Http\Requests\AI\FormRoadmapPreviewRequest;
use App\Models\LearningRoadmap;
use App\Services\AI\CompanionRoadmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

class FormRoadmapController extends Controller
{
    public function __construct(private readonly CompanionRoadmapService $roadmaps) {}

    public function preview(FormRoadmapPreviewRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $key = 'ai-roadmap-form-preview:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['status' => 'error', 'message' => 'Too many roadmap previews. Please retry later.', 'data' => null], 429)
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

    public function confirm(FormRoadmapConfirmRequest $request): JsonResponse
    {
        $validated = $request->validated();
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
        return response()->json(['status' => 'error', 'message' => $exception->getMessage(), 'data' => null], $status);
    }
}
