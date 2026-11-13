<?php

namespace App\Services\AI;

use App\Models\Article;

/** Read-only published catalog retrieval and reproducible skill relevance. */
class RoadmapCatalogService
{
    /** @return array<string, list<array{id: string, title: string, url: string, score: float, evidence: string}>> */
    public function rank(array $skills, string $goal): array
    {
        $ranked = [];
        foreach ($skills as $skill) {
            $terms = $this->terms($skill);
            $query = Article::query()->published()
                ->with(['publishedVersion:id,article_id,title,content', 'tags:id,name', 'category:id,name']);
            $query->where(function ($query) use ($terms): void {
                foreach ($terms as $term) {
                    $query->orWhereHas('publishedVersion', function ($version) use ($term): void {
                        $version->whereRaw('POSITION(? IN LOWER(title)) > 0 OR POSITION(? IN LOWER(content)) > 0', [$term, $term]);
                    })->orWhereHas('tags', fn ($tags) => $tags->whereRaw('POSITION(? IN LOWER(name)) > 0', [$term]))
                        ->orWhereHas('category', fn ($category) => $category->whereRaw('POSITION(? IN LOWER(name)) > 0', [$term]));
                }
            });

            $candidates = [];
            foreach ($query->orderByDesc('published_at')->limit(60)->get() as $article) {
                $title = (string) $article->publishedVersion?->title;
                if ($title === '') {
                    continue;
                }
                [$score, $evidence] = $this->relevance($skill, $article);
                if ($score < 0.5) {
                    continue;
                }
                $candidates[] = [
                    'id' => (string) $article->id,
                    'title' => $title,
                    'url' => '/courses/'.rawurlencode((string) $article->slug),
                    'score' => $score,
                    'evidence' => $evidence,
                    'goal_tiebreak' => $this->overlap($goal, $title.' '.(string) $article->publishedVersion?->content),
                ];
            }
            usort($candidates, static fn (array $a, array $b): int => ($b['score'] <=> $a['score'])
                ?: ($b['goal_tiebreak'] <=> $a['goal_tiebreak']) ?: strcmp($a['id'], $b['id']));
            $ranked[$skill] = array_map(static function (array $candidate): array {
                unset($candidate['goal_tiebreak']);
                return $candidate;
            }, array_slice($candidates, 0, 8));
        }

        return $ranked;
    }

    public function isCurrentlyPublished(string $articleId): bool
    {
        return Article::query()->published()->whereKey($articleId)->exists();
    }

    private function relevance(string $skill, Article $article): array
    {
        $title = (string) $article->publishedVersion?->title;
        $tags = $article->tags->pluck('name')->implode(' ');
        $category = (string) $article->category?->name;
        $content = mb_substr((string) $article->publishedVersion?->content, 0, 10000);
        if ($this->containsPhrase($title.' '.$tags, $skill)) {
            return [1.0, 'Published course title or tag'];
        }
        if ($this->containsPhrase($category.' '.$content, $skill)) {
            return [0.75, 'Published course category or content'];
        }
        if ($this->overlap($skill, $title.' '.$tags.' '.$category.' '.$content) >= 0.6) {
            return [0.5, 'Related published course terms'];
        }
        return [0.0, 'No matching evidence'];
    }

    private function containsPhrase(string $text, string $phrase): bool
    {
        return preg_match('/(?<![\pL\pN])'.preg_quote(trim($phrase), '/').'(?![\pL\pN])/iu', $text) === 1;
    }

    private function overlap(string $needle, string $haystack): float
    {
        $terms = $this->terms($needle);
        if ($terms === []) {
            return 0.0;
        }
        $haystack = mb_strtolower($haystack);
        $hits = 0;
        foreach ($terms as $term) {
            if (preg_match('/(?<![\pL\pN])'.preg_quote($term, '/').'(?![\pL\pN])/u', $haystack) === 1) {
                $hits++;
            }
        }
        return $hits / count($terms);
    }

    private function terms(string $text): array
    {
        $parts = preg_split('/[^\pL\pN]+/u', mb_strtolower($text)) ?: [];
        return array_slice(array_values(array_unique(array_filter($parts, static fn (string $part): bool => mb_strlen($part) >= 2))), 0, 6);
    }
}
