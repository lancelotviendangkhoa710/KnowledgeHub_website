<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\ConfirmCvAssessmentRequest;
use App\Http\Requests\AI\PreviewCvAssessmentRequest;
use App\Models\UserCv;
use App\Services\AI\CvAssessmentService;
use App\Services\AI\UserCvService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CvAssessmentController extends Controller
{
    public function __construct(private readonly CvAssessmentService $assessments,
        private readonly UserCvService $cvs) {}

    public function preview(PreviewCvAssessmentRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_cv_enabled'), 503);
        $this->authorize('create', UserCv::class);
        try {
            $data = $this->assessments->preview($request->user(), $request->file('cv_file'),
                $request->validated('target_role'));
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json(['status' => 'success', 'message' => 'CV assessment preview.', 'data' => $data]);
    }

    public function confirm(ConfirmCvAssessmentRequest $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_cv_enabled'), 503);
        $this->authorize('create', UserCv::class);
        try {
            $data = $this->assessments->confirm($request->user(), $request->file('cv_file'),
                $request->validated('preview_token'));
        } catch (RuntimeException $exception) {
            return $this->error($exception, true);
        }
        return response()->json(['status' => 'success', 'message' => 'CV and assessment saved.', 'data' => $data], 201);
    }

    public function show(Request $request): JsonResponse
    {
        abort_unless(config('services.ai.agent_cv_enabled'), 503);
        $cv = $this->cvs->current($request->user());
        return response()->json(['status' => 'success', 'message' => 'CV assessment retrieved.',
            'data' => $cv?->assessment]);
    }

    private function error(RuntimeException $exception, bool $afterConfirmation = false): JsonResponse
    {
        // A rejected assessment payload is an upstream failure here, not user input.
        $status = match (true) {
            in_array($exception->getCode(), [502, 503, 504], true) => $exception->getCode(),
            $exception->getCode() === 422 => 502,
            default => 503,
        };
        $message = $afterConfirmation
            ? 'CV could not be saved. Start a new preview and try again.'
            : 'CV assessment is temporarily unavailable.';
        return response()->json(['status' => 'error', 'message' => $message, 'data' => null], $status);
    }
}
