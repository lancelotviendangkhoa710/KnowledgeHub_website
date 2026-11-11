<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CreateArticleRequest;
use App\Http\Requests\Content\PublishArticleRequest;
use App\Http\Requests\Content\UpdateArticleRequest;
use App\Models\Article;
use App\Models\User;
use App\Services\Content\ArticleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function __construct(
        protected ArticleService $articleService
    ) {}

    /**
     * Resolve the current user on public routes too: those routes are outside
     * auth:sanctum and the default guard is web, so a Bearer token is only
     * identified through the sanctum guard. Returns null for guests.
     */
    protected function resolveUser(Request $request): ?User
    {
        $user = $request->user() ?? Auth::guard('sanctum')->user();

        return $user instanceof User ? $user : null;
    }

    /**
     * Author of the article (Contributor/Admin) or Admin: may see every version.
     */
    protected function canSeeAllVersions(?User $user, Article $article): bool
    {
        return $user !== null && Gate::forUser($user)->allows('update', $article);
    }

    protected function getUserId(?Request $request): ?string
    {
        $user = $request ? $this->resolveUser($request) : null;
        if (!$user) {
            return null;
        }

        return (string) ($user->getRawOriginal('id') ?: ($user->getAttributes()['id'] ?? $user->getKey()));
    }

    /**
     * List published articles (or author's articles if requested by authenticated user).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $userId = $this->getUserId($request);

        if ($request->boolean('my_articles') && $userId) {
            $articles = $this->articleService->listAuthorArticles(
                $userId,
                $request->only(['status']),
                $perPage
            );

            return response()->json($articles);
        }

        $filters = $request->only(['category_id', 'category_slug', 'tag_id', 'tag_slug', 'author_id', 'search', 'sort']);
        $articles = $this->articleService->listPublished($filters, $perPage);

        return response()->json($articles);
    }

    /**
     * Show a published article by slug or ID (or own draft/archived for authorized user).
     */
    public function show(Request $request, string $slugOrId): JsonResponse
    {
        $article = $this->articleService->getPublishedBySlug($slugOrId);
        // Only the UUID / non-published slug lookups expose a versions list.
        $includeVersions = false;

        if (!$article) {
            $includeVersions = true;
            if (Str::isUuid($slugOrId)) {
                $article = $this->articleService->getById($slugOrId);
            } else {
                $article = $this->articleService->getBySlug($slugOrId);
            }
        }

        if (!$article) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $user = $this->resolveUser($request);

        if (!$article->isPublished()) {
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This action is unauthorized.',
                ], Response::HTTP_FORBIDDEN);
            }

            Gate::forUser($user)->authorize('view', $article);
        }

        // Readers only get the published version; author/admin get the full history.
        if ($includeVersions) {
            $article->setRelation(
                'versions',
                $this->articleService->listVisibleVersions($article, $this->canSeeAllVersions($user, $article))
            );
        }

        return response()->json([
            'status' => 'success',
            'data' => $article,
        ]);
    }

    /**
     * Create a new article with initial version 1 (status: draft).
     */
    public function store(CreateArticleRequest $request): JsonResponse
    {
        $article = $this->articleService->create($request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Article draft created successfully.',
            'data' => $article,
        ], Response::HTTP_CREATED);
    }

    /**
     * Update an article by creating a new version snapshot.
     */
    public function update(UpdateArticleRequest $request, Article $article): JsonResponse
    {
        $version = $this->articleService->createVersion($article, $request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'New article version created successfully.',
            'data' => $version,
        ]);
    }

    /**
     * Publish an article (setting published_version_id and status=published).
     */
    public function publish(PublishArticleRequest $request, Article $article): JsonResponse
    {
        try {
            $published = $this->articleService->publish($article, $request->validated('version_id'));

            return response()->json([
                'status' => 'success',
                'message' => 'Article published successfully.',
                'data' => $published,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Archive an article.
     */
    public function archive(Request $request, Article $article): JsonResponse
    {
        Gate::authorize('archive', $article);

        $archived = $this->articleService->archive($article);

        return response()->json([
            'status' => 'success',
            'message' => 'Article archived successfully.',
            'data' => $archived,
        ]);
    }

    /**
     * Soft delete an article.
     */
    public function destroy(Request $request, Article $article): JsonResponse
    {
        Gate::authorize('delete', $article);

        $this->articleService->delete($article);

        return response()->json([
            'status' => 'success',
            'message' => 'Article deleted successfully.',
        ]);
    }

    /**
     * List versions of an article: all of them for the author or an admin,
     * otherwise only the currently published version.
     */
    public function versions(Request $request, Article $article): JsonResponse
    {
        $user = $this->resolveUser($request);

        Gate::forUser($user)->authorize('view', $article);

        return response()->json([
            'status' => 'success',
            'data' => $this->articleService->listVisibleVersions($article, $this->canSeeAllVersions($user, $article)),
        ]);
    }
}
