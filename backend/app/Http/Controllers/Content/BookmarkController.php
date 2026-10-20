<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Services\Content\BookmarkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    public function __construct(
        protected BookmarkService $bookmarkService
    ) {}

    /**
     * Display a listing of bookmarked articles for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $perPage = (int) $request->query('per_page', 15);
        $bookmarks = $this->bookmarkService->getUserBookmarks($user, $perPage);

        return response()->json([
            'status' => 'success',
            'data' => $bookmarks->items(),
            'meta' => [
                'current_page' => $bookmarks->currentPage(),
                'per_page' => $bookmarks->perPage(),
                'total' => $bookmarks->total(),
                'last_page' => $bookmarks->lastPage(),
            ],
        ]);
    }

    /**
     * Toggle bookmark status for an article.
     */
    public function toggle(Request $request, string $articleId): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $article = Article::find($articleId);
        if (! $article) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article not found.',
            ], 404);
        }

        $result = $this->bookmarkService->toggleBookmark($user, $articleId);

        return response()->json([
            'status' => 'success',
            'message' => $result['bookmarked'] ? 'Article bookmarked.' : 'Bookmark removed.',
            'data' => $result,
        ]);
    }
}
