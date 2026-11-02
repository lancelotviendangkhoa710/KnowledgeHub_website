<?php

namespace App\Services\Content;

use App\Models\Article;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class TagService
{
    /**
     * Get paginated tags or list of popular tags.
     */
    public function getAll(int $perPage = 50): LengthAwarePaginator
    {
        return Tag::withCount('articles')
            ->orderBy('name')
            ->paginate($perPage);
    }

    /**
     * Find tag by slug.
     */
    public function findBySlug(string $slug): ?Tag
    {
        return Tag::where('slug', $slug)
            ->withCount('articles')
            ->first();
    }

    /**
     * Create a new tag.
     */
    public function create(array $data): Tag
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $baseSlug = $data['slug'];
        $counter = 1;
        while (Tag::where('slug', $data['slug'])->exists()) {
            $data['slug'] = "{$baseSlug}-{$counter}";
            $counter++;
        }

        return Tag::create([
            'name' => $data['name'],
            'slug' => $data['slug'],
        ]);
    }

    /**
     * Resolve tag identifiers (UUIDs or tag names) to tag IDs, creating new tags if names are passed.
     */
    public function resolveTagIds(array $tagNamesOrIds): array
    {
        $ids = [];

        foreach ($tagNamesOrIds as $item) {
            $item = trim((string) $item);
            if (empty($item)) {
                continue;
            }

            // Check if it's already a valid UUID of an existing tag
            if (Str::isUuid($item)) {
                $tag = Tag::find($item);
                if ($tag) {
                    $ids[] = $tag->id;
                    continue;
                }
            }

            // Check by slug or name
            $slug = Str::slug($item);
            $tag = Tag::where('slug', $slug)->orWhere('name', $item)->first();

            if (!$tag) {
                $tag = Tag::create([
                    'name' => $item,
                    'slug' => $slug,
                ]);
            }

            $ids[] = $tag->id;
        }

        return array_unique($ids);
    }

    /**
     * Sync tags with an article.
     */
    public function syncArticleTags(Article $article, array $tagNamesOrIds): void
    {
        $tagIds = $this->resolveTagIds($tagNamesOrIds);
        $article->tags()->sync($tagIds);
    }
}

