<?php

namespace App\Services\AI;

use App\Exceptions\AI\AgentServiceException;
use App\Models\Article;
use App\Models\User;
use App\Services\Content\ArticleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class AgentCourseService
{
    public function __construct(private readonly AgentAiClient $ai, private readonly ArticleService $articles) {}

    public function create(User $actor, array $input): array
    {
        $max = $input['max_videos'] ?? 4;
        $draft = $this->ai->post('/v1/agents/course', ['topic' => $input['topic'], 'max_videos' => $max]);
        $title = $this->safeText($draft['title'] ?? null, 255);
        $summary = $this->safeText($draft['summary'] ?? null, 2000);
        $playlistId = $draft['source_playlist_id'] ?? null;
        $playlistTitle = $this->safeText($draft['source_playlist_title'] ?? null, 255);
        $lessons = $draft['lessons'] ?? null;
        if ($title === null || $summary === null || ! is_string($playlistId)
            || ! preg_match('/^[A-Za-z0-9_-]{2,100}$/D', $playlistId)
            || $playlistTitle === null || ! is_array($lessons) || count($lessons) < 2 || count($lessons) > $max) {
            throw new AgentServiceException('AI agent returned an invalid course.', 502);
        }

        $seen = [];
        $validated = [];
        foreach ($lessons as $lesson) {
            if (! is_array($lesson) || ! is_string($lesson['video_id'] ?? null)
                || ! preg_match('/^[A-Za-z0-9_-]{11}$/D', $lesson['video_id'])) {
                throw new AgentServiceException('AI agent returned an invalid course.', 502);
            }
            $id = $lesson['video_id'];
            $videoTitle = $this->safeText($lesson['title'] ?? null, 255);
            $description = $this->safeText($lesson['description'] ?? null, 1000);
            $objective = $this->safeText($lesson['learning_objective'] ?? null, 500);
            if (isset($seen[$id]) || $videoTitle === null || $description === null || $objective === null) {
                throw new AgentServiceException('AI agent returned an invalid course.', 502);
            }
            $seen[$id] = true;
            $validated[] = ['video_id' => $id, 'title' => $videoTitle,
                'description' => $description, 'learning_objective' => $objective];
        }

        $content = $summary."\n\nNguồn playlist: [{$playlistTitle}](https://www.youtube.com/playlist?list={$playlistId})";
        foreach ($validated as $index => $lesson) {
            $content .= "\n\n## ".($index + 1).'. '.$lesson['title']
                ."\n\nMục tiêu: ".$lesson['learning_objective']
                ."\n\n@[youtube](".$lesson['video_id'].")"
                ."\n\n".$lesson['description'];
        }

        return DB::transaction(function () use ($actor, $input, $title, $content, $validated, $playlistId, $playlistTitle): array {
            $actor->refresh();
            // A Contributor deleted while the draft was generated must not publish.
            abort_unless(! $actor->trashed() && $actor->status === 'active', 403);
            abort_unless($actor->roles()->where('name', 'contributor')->exists()
                && ! $actor->roles()->where('name', 'admin')->exists(), 403);
            Gate::forUser($actor)->authorize('create', Article::class);
            $article = $this->articles->create(['title' => $title, 'content' => $content,
                'slug' => Str::slug($title) ?: 'course-'.Str::uuid(),
                'category_id' => $input['category_id'] ?? null], $actor);
            Gate::forUser($actor)->authorize('publish', $article);
            $published = $this->articles->publish($article);
            return ['id' => $published->id, 'slug' => $published->slug, 'status' => $published->status,
                'title' => $title, 'source_playlist_id' => $playlistId,
                'source_playlist_title' => $playlistTitle, 'lessons' => $validated];
        });
    }

    private function safeText(mixed $value, int $max): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $text = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', strip_tags($value)) ?? '');
        // Keep source/model text as plain Markdown text; never let it define
        // additional embeds, links, HTML, or instructions in the course body.
        $text = preg_replace('~https?://\S+~iu', '', $text) ?? '';
        $text = str_replace(['\\', '[', ']', '(', ')', '<', '>', '@', '#', '*', '_', '`'], ' ', $text);
        return $text !== '' && mb_strlen($text) <= $max ? $text : null;
    }
}
