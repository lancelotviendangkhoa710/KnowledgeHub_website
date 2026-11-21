<?php

namespace App\Services\Learning;

use App\Models\Article;
use App\Models\Category;
use App\Models\LearningProgress;
use App\Models\LearningRoadmap;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * RMR-01: read-only summary fields for roadmap responses.
 *
 * Adds `items_count`, `completed_count`, `topics` and `last_activity_at` to each roadmap,
 * and `completed_at` / `article_title` to each item. Uses a fixed number of queries for
 * any number of roadmaps (progress, articles, published titles, categories), so listing
 * does not grow into N+1. Returns arrays so the models used for writes stay untouched.
 */
class RoadmapSummaryService
{
    /**
     * @param  Collection<int, LearningRoadmap>  $roadmaps  roadmaps with `items` loaded
     * @return list<array<string, mixed>>
     */
    public function summarize(Collection $roadmaps): array
    {
        $items = $roadmaps->flatMap(static fn (LearningRoadmap $roadmap) => $roadmap->items);
        $itemIds = $items->pluck('id')->all();
        $articleIds = $items->pluck('article_id')->filter()->unique()->values()->all();

        $completedAt = $itemIds === [] ? collect() : LearningProgress::query()
            ->whereIn('roadmap_item_id', $itemIds)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->pluck('completed_at', 'roadmap_item_id');

        $articles = $articleIds === [] ? collect() : Article::query()
            ->whereIn('id', $articleIds)
            ->with('publishedVersion:id,article_id,title')
            ->get(['id', 'category_id', 'status', 'published_version_id'])
            ->keyBy('id');

        $roots = $this->rootCategories($articles->pluck('category_id')->filter()->unique()->values()->all());

        return $roadmaps->map(function (LearningRoadmap $roadmap) use ($completedAt, $articles, $roots): array {
            $topics = [];
            $lastCompletion = null;
            $itemRows = [];

            foreach ($roadmap->items as $item) {
                $done = $completedAt->get($item->id);
                $doneAt = $done === null ? null : Carbon::parse($done);
                if ($doneAt !== null && ($lastCompletion === null || $doneAt->greaterThan($lastCompletion))) {
                    $lastCompletion = $doneAt;
                }

                $article = $item->article_id === null ? null : $articles->get($item->article_id);
                $published = $article !== null && $article->status === Article::STATUS_PUBLISHED && $article->published_version_id !== null;
                $root = $article?->category_id === null ? null : ($roots[$article->category_id] ?? null);
                if ($root !== null) {
                    $topics[$root['slug']] ??= ['category_slug' => $root['slug'], 'name' => $root['name'], 'count' => 0];
                    $topics[$root['slug']]['count']++;
                }

                $itemRows[] = [
                    ...$item->toArray(),
                    'completed_at' => $doneAt?->toIso8601String(),
                    'article_title' => $published ? $article->publishedVersion?->title : null,
                ];
            }

            $topicList = array_values($topics);
            usort($topicList, static fn (array $a, array $b): int => [$b['count'], $a['name']] <=> [$a['count'], $b['name']]);

            $updatedAt = $roadmap->updated_at === null ? null : Carbon::parse($roadmap->updated_at);
            $lastActivity = $lastCompletion === null ? $updatedAt
                : ($updatedAt === null || $lastCompletion->greaterThan($updatedAt) ? $lastCompletion : $updatedAt);

            return [
                ...$roadmap->toArray(),
                'items' => $itemRows,
                'items_count' => count($itemRows),
                'completed_count' => count(array_filter($itemRows, static fn (array $row): bool => $row['status'] === 'completed')),
                'topics' => $topicList,
                'last_activity_at' => $lastActivity?->toIso8601String(),
            ];
        })->values()->all();
    }

    /**
     * Maps each category id to its top-level ancestor. One query: the category tree is small.
     *
     * @param  list<string>  $categoryIds
     * @return array<string, array{slug: string, name: string}>
     */
    private function rootCategories(array $categoryIds): array
    {
        if ($categoryIds === []) {
            return [];
        }

        $all = Category::query()->get(['id', 'parent_id', 'name', 'slug'])->keyBy('id');
        $result = [];
        foreach ($categoryIds as $id) {
            $current = $all->get($id);
            $seen = [];
            while ($current !== null && $current->parent_id !== null && ! isset($seen[$current->id])) {
                $seen[$current->id] = true; // guards against a malformed cycle
                $parent = $all->get($current->parent_id);
                if ($parent === null) {
                    break;
                }
                $current = $parent;
            }
            if ($current !== null) {
                $result[$id] = ['slug' => (string) $current->slug, 'name' => (string) $current->name];
            }
        }

        return $result;
    }
}
