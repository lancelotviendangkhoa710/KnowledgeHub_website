<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\StoreAttachmentRequest;
use App\Models\ArticleAttachment;
use App\Models\ArticleVersion;
use App\Services\Content\ArticleAttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ArticleAttachmentController extends Controller
{
    public function __construct(
        protected ArticleAttachmentService $attachmentService
    ) {}

    /**
     * List all attachments for a specific article version snapshot.
     */
    public function index(string $versionId): JsonResponse
    {
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
