<?php

namespace App\Services\Content;

use App\Models\Article;
use App\Models\Bookmark;
use Illuminate\Pagination\LengthAwarePaginator;

class BookmarkService
{
    /**
     * Get paginated published articles bookmarked by user.
     */
    public function getUserBookmarks(string $userId, int $perPage = 15): LengthAwarePaginator
    {
        return Article::published()
            ->whereHas('bookmarks', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->with([ArticleService::SAFE_AUTHOR, 'category', 'publishedVersion', 'tags'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Bookmark an article for a user.
     */
    public function bookmark(string $userId, string $articleId): Bookmark
    {
        $article = Article::published()->find($articleId);
        if (!$article) {
            throw new \InvalidArgumentException('Article not found or not published.');
        }

        $bookmark = Bookmark::where('user_id', $userId)
            ->where('article_id', $articleId)
            ->first();

        if ($bookmark) {
            return $bookmark;
        }

        return Bookmark::create([
            'user_id' => $userId,
            'article_id' => $articleId,
            'created_at' => now(),
        ]);
    }

    /**
     * Remove a bookmark.
     */
    public function unbookmark(string $userId, string $articleId): bool
    {
        return Bookmark::where('user_id', $userId)
            ->where('article_id', $articleId)
            ->delete() > 0;
    }

    /**
     * Check if an article is bookmarked by a user.
     */
    public function isBookmarked(string $userId, string $articleId): bool
    {
        return Bookmark::where('user_id', $userId)
            ->where('article_id', $articleId)
            ->exists();
    }
}

