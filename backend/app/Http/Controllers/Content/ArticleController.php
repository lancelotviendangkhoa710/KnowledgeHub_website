<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CreateArticleRequest;
use App\Http\Requests\Content\UpdateArticleRequest;
use App\Models\Article;
use App\Services\Content\ArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function __construct(
        protected ArticleService $articleService
    ) {}

    /**
     * Display a listing of articles/courses.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['category_id', 'tag_slug', 'search', 'status']);
        $perPage = (int) $request->query('per_page', 15);

        $articles = $this->articleService->getArticles($filters, $request->user(), $perPage);

        return response()->json([
            'status' => 'success',
            'data' => $articles->items(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
                'last_page' => $articles->lastPage(),
            ],
        ]);
    }

    /**
     * Display a single article/course by ID or slug.
     */
    public function show(Request $request, string $identifier): JsonResponse
    {
        $article = $this->articleService->getArticleBySlugOrId($identifier, $request->user());

        if (! $article) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article not found.',
            ], 404);
        }

        // Authorize access according to ArticlePolicy
        if ($request->user()) {
            if (! $request->user()->can('view', $article)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized to view this draft or archived article.',
                ], 403);
            }
        } elseif ($article->status !== Article::STATUS_PUBLISHED) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to view unpublished article.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'data' => $article,
        ]);
    }

    /**
     * Store a newly created course / article with initial version (v1).
     */
    public function store(CreateArticleRequest $request): JsonResponse
    {
        $article = $this->articleService->createArticle(
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Course draft created successfully with Version 1.',
            'data' => $article,
        ], 201);
    }

    /**
     * Update an article, creating a new immutable version.
     */
    public function update(UpdateArticleRequest $request, Article $article): JsonResponse
    {
        $updatedArticle = $this->articleService->updateArticle(
            $article,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'New version created and saved successfully.',
            'data' => $updatedArticle,
        ]);
    }

    /**
     * Publish an article directly (Contributor or Admin).
     */
    public function publish(Request $request, Article $article): JsonResponse
    {
        if (! $request->user() || ! $request->user()->can('publish', $article)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to publish this article.',
            ], 403);
        }

        try {
            $publishedArticle = $this->articleService->publishArticle($article);

            return response()->json([
                'status' => 'success',
                'message' => 'Article published successfully.',
                'data' => $publishedArticle,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Archive an article.
     */
    public function archive(Request $request, Article $article): JsonResponse
    {
        if (! $request->user() || ! $request->user()->can('archive', $article)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to archive this article.',
            ], 403);
        }

        $archivedArticle = $this->articleService->archiveArticle($article);

        return response()->json([
            'status' => 'success',
            'message' => 'Article archived successfully.',
            'data' => $archivedArticle,
        ]);
    }

    /**
     * Soft-delete an article.
     */
    public function destroy(Request $request, Article $article): JsonResponse
    {
        if (! $request->user() || ! $request->user()->can('delete', $article)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to delete this article.',
            ], 403);
        }

        $this->articleService->deleteArticle($article);

        return response()->json([
            'status' => 'success',
            'message' => 'Article deleted successfully.',
        ]);
    }
}
