<?php

namespace App\Services\Learning;

use App\Models\Article;
use App\Models\LearningProgress;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * PRF-06, PRF-07: learning activity of one user, read from `learning_progress.completed_at`.
 *
 * One activity = one roadmap step completed. Days are Vietnam calendar days (UTC+7). Only the
 * caller's own roadmaps are read, whatever their role: activity is never shown for someone else.
 * No new table: watching a video or handing in an exercise is not tracked yet (needs PRF-12).
 */
class LearningActivityService
{
    public const TIMEZONE = 'Asia/Ho_Chi_Minh';

    public const PER_PAGE = 10;

    /**
     * Completed steps per day between two Vietnam calendar days (inclusive), days without activity omitted.
     *
     * @return list<array{date: string, count: int}>
     */
    public function daily(User $user, string $from, string $to): array
    {
        [$start, $end] = $this->bounds($from, $to);

        $counts = [];
        $this->completedBy($user)
            ->where('learning_progress.completed_at', '>=', $start)
            ->where('learning_progress.completed_at', '<', $end)
            ->orderBy('learning_progress.completed_at')
            ->pluck('learning_progress.completed_at')
            ->each(function ($completedAt) use (&$counts): void {
                $day = Carbon::parse($completedAt)->setTimezone(self::TIMEZONE)->toDateString();
                $counts[$day] = ($counts[$day] ?? 0) + 1;
            });

        $result = [];
        foreach ($counts as $date => $count) {
            $result[] = ['date' => $date, 'count' => $count];
        }

        return $result;
    }

    /** Most recently completed steps, newest first, optionally limited to one Vietnam calendar day. */
    public function recent(User $user, int $page, ?string $date = null): LengthAwarePaginator
    {
        $query = $this->completedBy($user)
            ->leftJoin('articles', function ($join): void {
                $join->on('articles.id', '=', 'roadmap_items.article_id')
                    ->where('articles.status', '=', Article::STATUS_PUBLISHED)
                    ->whereNull('articles.deleted_at');
            })
            ->leftJoin('article_versions', 'article_versions.id', '=', 'articles.published_version_id')
            ->select([
                'roadmap_items.id as item_id',
                'roadmap_items.title as item_title',
                'articles.id as article_id',
                'article_versions.title as article_title',
                'learning_roadmaps.id as roadmap_id',
                'learning_roadmaps.title as roadmap_title',
                'learning_progress.completed_at',
            ])
            ->orderByDesc('learning_progress.completed_at')
            ->orderBy('roadmap_items.id');

        if ($date !== null) {
            [$start, $end] = $this->bounds($date, $date);
            $query->where('learning_progress.completed_at', '>=', $start)
                ->where('learning_progress.completed_at', '<', $end);
        }

        $paginator = $query->paginate(self::PER_PAGE, ['*'], 'page', $page);
        $paginator->getCollection()->transform(fn (LearningProgress $row): array => [
            'item_id' => $row->item_id,
            'item_title' => $row->item_title,
            'article_id' => $row->article_title === null ? null : $row->article_id,
            'article_title' => $row->article_title,
            'roadmap_id' => $row->roadmap_id,
            'roadmap_title' => $row->roadmap_title,
            'completed_at' => $row->completed_at?->toIso8601String(),
        ]);

        return $paginator;
    }

    /** Completed progress rows of the user's own roadmaps. */
    private function completedBy(User $user): Builder
    {
        return LearningProgress::query()
            ->join('roadmap_items', 'roadmap_items.id', '=', 'learning_progress.roadmap_item_id')
            ->join('learning_roadmaps', 'learning_roadmaps.id', '=', 'roadmap_items.roadmap_id')
            ->where('learning_roadmaps.user_id', $user->id)
            ->where('learning_progress.status', 'completed')
            ->whereNotNull('learning_progress.completed_at');
    }

    /**
     * Instants for [start of `from`, start of the day after `to`) in Vietnam time, written with an
     * explicit offset so the comparison does not depend on the database session time zone.
     *
     * @return array{0: string, 1: string}
     */
    private function bounds(string $from, string $to): array
    {
        $start = Carbon::createFromFormat('!Y-m-d', $from, self::TIMEZONE)->utc();
        $end = Carbon::createFromFormat('!Y-m-d', $to, self::TIMEZONE)->addDay()->utc();

        return [$start->format('Y-m-d H:i:sP'), $end->format('Y-m-d H:i:sP')];
    }
}
