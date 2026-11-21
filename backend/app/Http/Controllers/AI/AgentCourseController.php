<?php

namespace App\Http\Controllers\AI;

use App\Exceptions\AI\AgentServiceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\AI\CreateAgentCourseRequest;
use App\Models\Article;
use App\Services\AI\AgentCourseService;
use Illuminate\Http\JsonResponse;

class AgentCourseController extends Controller
{
    public function __construct(private readonly AgentCourseService $courses) {}

    public function __invoke(CreateAgentCourseRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_courses_enabled'), 503);
        $this->authorize('create', Article::class);
        try {
            $result = $this->courses->create($request->user(), $request->validated());
        } catch (AgentServiceException $exception) {
            $status = in_array($exception->status, [422, 502, 503, 504], true) ? $exception->status : 503;
            // The upstream detail is untrusted; keep one fixed message per class of failure.
            $message = match (true) {
                $status !== 422 => 'Course agent is temporarily unavailable.',
                $exception->upstreamCode === 'insufficient_verified_videos' => 'No usable public playlist was found for this topic.',
                default => 'The verified playlist could not be turned into a course.',
            };
            return response()->json(['status' => 'error', 'message' => $message, 'data' => null], $status);
        }
        return response()->json(['status' => 'success', 'message' => 'Course published.', 'data' => $result], 201);
    }
}
