<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\ConfirmAdminAgentRequest;
use App\Http\Requests\AI\PlanAdminAgentRequest;
use App\Services\AI\AdminAgentService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AdminAgentController extends Controller
{
    public function __construct(private readonly AdminAgentService $agent) {}

    public function plan(PlanAdminAgentRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_admin_enabled'), 503);
        try {
            $data = $this->agent->plan($request->user(), $request->validated());
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json(['status' => 'success', 'message' => 'Action proposed for confirmation.', 'data' => $data], 201);
    }

    public function confirm(ConfirmAdminAgentRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_admin_enabled'), 503);
        $data = $this->agent->confirm($request->user(), $request->validated());
        return response()->json(['status' => 'success', 'message' => 'Action completed.', 'data' => $data]);
    }

    private function error(RuntimeException $exception): JsonResponse
    {
        $status = in_array($exception->getCode(), [502, 503, 504], true) ? $exception->getCode() : 503;
        return response()->json(['status' => 'error', 'message' => 'Admin agent is temporarily unavailable.', 'data' => null], $status);
    }
}
