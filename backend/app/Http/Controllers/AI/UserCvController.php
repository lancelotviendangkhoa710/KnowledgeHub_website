<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\StoreUserCvRequest;
use App\Models\UserCv;
use App\Models\UserCvIndex;
use App\Services\AI\UserCvService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use RuntimeException;


class UserCvController extends Controller
{
    public function __construct(private readonly UserCvService $cvs) {}

    public function show(Request $request): JsonResponse
    {
        $cv = $this->cvs->current($request->user());
        return response()->json(['status' => 'success', 'message' => 'CV retrieved.', 'data' => $cv ? $this->metadata($cv) : null]);
    }

    public function ragStatus(Request $request): JsonResponse
    {
        $cv = $this->cvs->current($request->user());
        $index = $cv === null ? null : UserCvIndex::query()->where('user_cv_id', $cv->id)->first();

        return response()->json([
            'status' => 'success',
            'message' => 'CV RAG status retrieved.',
            'data' => [
                'cv' => $cv ? $this->metadata($cv, $index) : null,
                'index' => $index ? [
                    'status' => $index->status,
                    'chunk_count' => $index->chunks()->count(),
                    'embedding_model' => $index->embedding_model,
                    'embedding_revision' => $index->embedding_revision,
                    'embedding_dimensions' => $index->embedding_dimensions,
                    'indexed_at' => $index->indexed_at?->toISOString(),
                ] : null,
            ],
        ]);
    }

    public function store(StoreUserCvRequest $request): JsonResponse
    {
        $this->authorize('create', UserCv::class);

        try {
            $cv = $this->cvs->save($request->user(), $request->file('cv_file'));
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }
        $index = UserCvIndex::query()->where('user_cv_id', $cv->id)->first();
        return response()->json(['status' => 'success', 'message' => 'Notebook document processed.', 'data' => $this->metadata($cv, $index)], 201);
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
            'Content-Disposition' => (new ResponseHeaderBag())->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $cv['filename']), 'Cache-Control' => 'private, no-store']);
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

    private function metadata(UserCv $cv, ?UserCvIndex $index = null): array
    {
        return ['id' => $cv->id, 'filename' => $cv->filename, 'size_bytes' => $cv->size_bytes,
            'consented_at' => $cv->consented_at->toISOString(), 'uploaded_at' => $cv->created_at->toISOString(),
            'updated_at' => $cv->updated_at->toISOString(), 'title' => $cv->title, 'summary' => $cv->summary,
            'status' => $index?->status, 'chunk_count' => $index ? $index->chunks()->count() : 0,
            'created_at' => $cv->created_at->toISOString()];
    }

    private function error(RuntimeException $exception): JsonResponse
    {
        $status = in_array($exception->getCode(), [502, 503, 504], true) ? $exception->getCode() : 503;
        return response()->json(['status' => 'error', 'message' => 'CV service is temporarily unavailable. Please retry.', 'data' => null], $status);
    }
}
