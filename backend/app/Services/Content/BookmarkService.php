<?php

namespace App\Services\Content;

use App\Models\Article;
use App\Models\Bookmark;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class BookmarkService
{
    /**
     * Get paginated articles bookmarked by the user.
     */
    public function getUserBookmarks(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return Article::query()
            ->whereHas('bookmarks', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['author:id,name', 'category:id,name,slug', 'publishedVersion', 'tags:id,name,slug'])
            ->published()
            ->latest('created_at')
            ->paginate($perPage);
    }

    /**
     * Toggle bookmark state for a given user and article.
     *
     * @return array{bookmarked: bool}
     */
    public function toggleBookmark(User $user, string $articleId): array
    {
        $existing = Bookmark::where('user_id', $user->id)
            ->where('article_id', $articleId)
            ->first();

        if ($existing) {
            $existing->delete();
            return ['bookmarked' => false];
        }

        Bookmark::create([
            'user_id' => $user->id,
            'article_id' => $articleId,
            'created_at' => now(),
        ]);

        return ['bookmarked' => true];
    }

    /**
     * Check if user has bookmarked a specific article.
     */
    public function isBookmarked(User $user, string $articleId): bool
    {
        return Bookmark::where('user_id', $user->id)
            ->where('article_id', $articleId)
            ->exists();
    }
}
