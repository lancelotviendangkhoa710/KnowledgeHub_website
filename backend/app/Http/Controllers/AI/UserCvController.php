<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\StoreUserCvRequest;
use App\Models\UserCv;
use App\Services\AI\UserCvService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use RuntimeException;


class UserCvController extends Controller
{
    public function __construct(private readonly UserCvService $cvs) {}

    public function show(Request $request): JsonResponse
    {
        $cv = $this->cvs->current($request->user());
        return response()->json(['status' => 'success', 'message' => 'CV retrieved.', 'data' => $cv ? $this->metadata($cv) : null]);
    }

    public function store(StoreUserCvRequest $request): JsonResponse
    {
        $this->authorize('create', UserCv::class);

        try {
            $cv = $this->cvs->save($request->user(), $request->file('cv_file'));
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json(['status' => 'success', 'message' => 'CV saved.', 'data' => $this->metadata($cv)], 201);
    }

    public function download(Request $request): Response|JsonResponse
    {
        try {
            $cv = $this->cvs->download($request->user());
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        abort_if($cv === null, 404);
        return response($cv['bytes'], 200, ['Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="cv.pdf"', 'Cache-Control' => 'private, no-store']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->authorize('deleteAll', UserCv::class);

        try {
            $this->cvs->deleteAllForUser($request->user());
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        return response()->json(['status' => 'success', 'message' => 'CV deleted.', 'data' => null]);
    }

    private function metadata(UserCv $cv): array
    {
        return ['id' => $cv->id, 'filename' => $cv->filename, 'size_bytes' => $cv->size_bytes,
            'consented_at' => $cv->consented_at->toISOString(), 'created_at' => $cv->created_at->toISOString()];
    }

    private function error(RuntimeException $exception): JsonResponse
    {
        $status = in_array($exception->getCode(), [502, 503, 504], true) ? $exception->getCode() : 503;
        return response()->json(['status' => 'error', 'message' => 'CV service is temporarily unavailable. Please retry.', 'data' => null], $status);
    }
}
