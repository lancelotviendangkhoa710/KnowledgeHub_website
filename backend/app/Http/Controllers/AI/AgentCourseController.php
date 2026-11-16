<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\CreateAgentCourseRequest;
use App\Models\Article;
use App\Services\AI\AgentCourseService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AgentCourseController extends Controller
{
    public function __construct(private readonly AgentCourseService $courses) {}

    public function __invoke(CreateAgentCourseRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_courses_enabled'), 503);
        $this->authorize('create', Article::class);
        try {
            $result = $this->courses->create($request->user(), $request->validated());
        } catch (RuntimeException $exception) {
            $status = in_array($exception->getCode(), [502, 503, 504], true) ? $exception->getCode() : 503;
            return response()->json(['status' => 'error', 'message' => 'Course agent is temporarily unavailable.', 'data' => null], $status);
        }
        return response()->json(['status' => 'success', 'message' => 'Course published.', 'data' => $result], 201);
    }
}
