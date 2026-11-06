<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\GenerateRoadmapRequest;
use App\Http\Requests\AI\ConfirmRoadmapRequest;
use App\Models\LearningRoadmap;
use App\Services\AI\AIRoadmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class RoadmapGenerationController extends Controller
{
    public function __construct(private readonly AIRoadmapService $generator) {}

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

    public function confirm(ConfirmRoadmapRequest $request): JsonResponse
    {
        $this->authorize('create', LearningRoadmap::class);
        $data = $request->validated();
        $user = $request->user();
        if (! array_is_list($data['items'])) {
            throw ValidationException::withMessages(['items' => 'Items must be an ordered list.']);
        }
        foreach ($data['items'] as $index => $item) {
            if ((int) $item['position'] !== $index + 1) {
                throw ValidationException::withMessages(['items' => 'Roadmap item positions must be sequential.']);
            }
        }
        $roadmap = DB::transaction(function () use ($data, $user): LearningRoadmap {
            $roadmap = LearningRoadmap::query()->create([
                'user_id' => $user->id,
                'title' => trim($data['title']),
                'goal' => trim($data['goal']),
                'status' => 'active',
            ]);
            foreach ($data['items'] as $index => $item) {
                $description = trim($item['description']);
                $skills = array_values(array_filter(array_map('trim', $item['skills'])));
                if ($skills !== []) {
                    $skillsLine = "\nSkills: ".implode(', ', $skills);
                    if (mb_strlen($description.$skillsLine) <= 5000) {
                        $description .= $skillsLine;
                    }
                }
                $roadmap->items()->create([
                    'title' => trim($item['title']),
                    'description' => $description,
                    'position' => $index + 1,
                ]);
            }
            return $roadmap->load('items');
        });

        return response()->json(['status' => 'success', 'message' => 'Roadmap saved successfully.', 'data' => $roadmap], 201);
    }
}
