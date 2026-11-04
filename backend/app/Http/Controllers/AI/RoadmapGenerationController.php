<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\GenerateRoadmapRequest;
use App\Services\AI\AIRoadmapService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class RoadmapGenerationController extends Controller
{
    public function __construct(private readonly AIRoadmapService $generator) {}

    /** Return a provider-generated roadmap draft without persisting it. */
    public function preview(GenerateRoadmapRequest $request): JsonResponse
    {
        try {
            $roadmap = $this->generator->generate($request->validated());
        } catch (RuntimeException $exception) {
            $status = str_contains($exception->getMessage(), 'not configured') ? 503 : 502;

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
}
