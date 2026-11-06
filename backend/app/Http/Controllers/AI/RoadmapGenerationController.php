<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\GenerateRoadmapRequest;
use App\Http\Requests\AI\ConfirmRoadmapRequest;
use App\Services\AI\AIRoadmapService;
use App\Services\AI\AIRoadmapConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

class RoadmapGenerationController extends Controller
{
    public function __construct(
        private readonly AIRoadmapService $generator,
        private readonly AIRoadmapConfirmationService $confirmation,
    ) {}

    /** Return a provider-generated roadmap draft without persisting it. */
    public function preview(GenerateRoadmapRequest $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->roles()->where('name', 'admin')->exists();
        $key = 'ai-roadmap-preview:'.$user->id;
        if (! $isAdmin && RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['status' => 'error', 'message' => 'Too many roadmap previews. Please retry later.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        if (! $isAdmin) {
            RateLimiter::hit($key, 60);
        }

        try {
            $roadmap = $this->generator->generate($request->validated());
        } catch (RuntimeException $exception) {
            $status = $exception->getCode() >= 400 && $exception->getCode() <= 599
                ? $exception->getCode()
                : (str_contains($exception->getMessage(), 'not configured') ? 503 : 502);

            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], $status);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap draft generated successfully.',
            'data' => $roadmap,
        ]);
    }

    /** Persist the roadmap provided by the authenticated user. */
    public function confirm(ConfirmRoadmapRequest $request): JsonResponse
    {
        $roadmap = $this->confirmation->save($request->user(), $request->validated());

        return response()->json(['status' => 'success', 'message' => 'Roadmap saved successfully.', 'data' => $roadmap], 201);
    }
}
