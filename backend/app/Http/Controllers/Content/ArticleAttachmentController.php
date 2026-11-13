<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\StoreAttachmentRequest;
use App\Models\ArticleAttachment;
use App\Models\ArticleVersion;
use App\Models\User;
use App\Services\Content\ArticleAttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ArticleAttachmentController extends Controller
{
    public function __construct(
        protected ArticleAttachmentService $attachmentService
    ) {}

    /**
     * Resolve the caller on this public route (outside auth:sanctum, default
     * guard web): a Bearer token is only identified via the sanctum guard.
     */
    protected function resolveUser(Request $request): ?User
    {
        $user = $request->user() ?? Auth::guard('sanctum')->user();

        return $user instanceof User ? $user : null;
    }

    /**
     * List attachments of an article version snapshot.
     * Readers may only list the currently published version of a viewable
     * article; any other version requires the author or an admin.
     */
    public function index(Request $request, string $versionId): JsonResponse
    {
        $version = ArticleVersion::with('article')->find($versionId);
        $article = $version?->article;

        if (!$article) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article version not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $gate = Gate::forUser($this->resolveUser($request));
        $isPublishedVersion = $version->id === $article->published_version_id;

        if (!($isPublishedVersion && $gate->allows('view', $article)) && !$gate->allows('update', $article)) {
            return response()->json([
                'status' => 'error',
                'message' => 'This action is unauthorized.',
            ], Response::HTTP_FORBIDDEN);
        }

        $attachments = $this->attachmentService->getAttachmentsForVersion($versionId);

        return response()->json([
            'status' => 'success',
            'data' => $attachments,
        ]);
    }

    /**
     * Add S3 attachment metadata to an article version snapshot.
     */
    public function store(StoreAttachmentRequest $request, ArticleVersion $version): JsonResponse
    {
        $attachment = $this->attachmentService->addAttachment($version, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment metadata recorded successfully.',
            'data' => $attachment,
        ], Response::HTTP_CREATED);
    }

    /**
     * Delete attachment metadata.
     */
    public function destroy(Request $request, string $attachmentId): JsonResponse
    {
        $attachment = ArticleAttachment::with('version.article')->find($attachmentId);

        if (!$attachment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Attachment not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($attachment->version && $attachment->version->article) {
            Gate::authorize('update', $attachment->version->article);
        }

        $this->attachmentService->deleteAttachment($attachmentId);

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment deleted successfully.',
        ]);
    }
}
