<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Services\Content\BookmarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BookmarkController extends Controller
{
    public function __construct(
        protected BookmarkService $bookmarkService
    ) {}

    /**
     * List bookmarked articles for the current user.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $bookmarks = $this->bookmarkService->getUserBookmarks($request->user()->id, $perPage);

        return response()->json($bookmarks);
    }

    /**
     * Bookmark an article.
     */
    public function store(Request $request, string $articleId): JsonResponse
    {
        try {
            $bookmark = $this->bookmarkService->bookmark($request->user()->id, $articleId);

            return response()->json([
                'status' => 'success',
                'message' => 'Article bookmarked successfully.',
                'data' => $bookmark,
            ], Response::HTTP_CREATED);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], Response::HTTP_NOT_FOUND);
        }
    }

    /**
     * Remove a bookmark.
     */
    public function destroy(Request $request, string $articleId): JsonResponse
    {
        $removed = $this->bookmarkService->unbookmark($request->user()->id, $articleId);

        if (!$removed) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bookmark not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Bookmark removed successfully.',
        ]);
    }
}

