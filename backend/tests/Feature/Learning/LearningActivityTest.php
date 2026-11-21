<?php

namespace Tests\Feature\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** PRF-06, PRF-07, PRF-10: GET /api/learning/activity and /api/learning/activity/recent. */
class LearningActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_rejected(): void
    {
        $this->getJson('/api/learning/activity?from=2026-01-01&to=2026-01-31')->assertUnauthorized();
        $this->getJson('/api/learning/activity/recent')->assertUnauthorized();
    }

    public function test_days_are_counted_in_vietnam_time_utc_plus_7(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner, 'Mine');
        // 16:59:59 UTC = 23:59:59 on the 9th in Vietnam; 17:00:00 UTC = 00:00 on the 10th.
        $this->completed($roadmap, 1, '2026-11-09 16:59:59+00');
        $this->completed($roadmap, 2, '2026-11-09 17:00:00+00');
        $this->completed($roadmap, 3, '2026-11-10 03:00:00+00');
        // 2026-10-31 17:30 UTC is already 1 November in Vietnam: outside a range ending 31 October.
        $this->completed($roadmap, 4, '2026-10-31 17:30:00+00');
        Sanctum::actingAs($owner);

        $this->getJson('/api/learning/activity?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertExactJson([
                'status' => 'success',
                'message' => 'Learning activity retrieved successfully.',
                'data' => [
                    ['date' => '2026-11-01', 'count' => 1],
                    ['date' => '2026-11-09', 'count' => 1],
                    ['date' => '2026-11-10', 'count' => 2],
                ],
            ]);

        $this->getJson('/api/learning/activity?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data', []);

        // The `to` day is included up to 23:59:59 Vietnam time.
        $this->getJson('/api/learning/activity?from=2026-11-09&to=2026-11-09')
            ->assertOk()
            ->assertJsonPath('data', [['date' => '2026-11-09', 'count' => 1]]);
    }

    public function test_only_the_callers_own_completed_steps_are_counted_even_for_admin(): void
    {
        $owner = $this->user();
        $other = $this->user();
        $mine = $this->roadmapFor($owner, 'Mine');
        $theirs = $this->roadmapFor($other, 'Theirs');
        $this->completed($mine, 1, '2026-11-05 02:00:00+00');
        $this->completed($theirs, 1, '2026-11-05 02:00:00+00');
        $this->completed($theirs, 2, '2026-11-06 02:00:00+00');
        // Started but not completed: not an activity.
        $pending = RoadmapItem::query()->create(['roadmap_id' => $mine->id, 'title' => 'Pending', 'position' => 9, 'status' => 'in_progress']);
        DB::table('learning_progress')->insert(['id' => (string) Str::uuid(), 'roadmap_item_id' => $pending->id, 'status' => 'in_progress', 'started_at' => '2026-11-05 03:00:00+00', 'updated_at' => '2026-11-05 03:00:00+00']);

        Sanctum::actingAs($owner);
        $this->getJson('/api/learning/activity?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertJsonPath('data', [['date' => '2026-11-05', 'count' => 1]]);
        $this->getJson('/api/learning/activity/recent')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.roadmap_title', 'Mine')
            ->assertJsonPath('meta.total', 1);

        $this->makeAdmin($other);
        Sanctum::actingAs($other);
        $this->getJson('/api/learning/activity?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->assertJsonPath('data', [['date' => '2026-11-05', 'count' => 1], ['date' => '2026-11-06', 'count' => 1]]);
        $this->getJson('/api/learning/activity/recent')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonMissing(['roadmap_title' => 'Mine']);
    }

    public function test_range_is_validated(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/learning/activity')->assertUnprocessable()->assertJsonValidationErrors(['from', 'to']);
        $this->getJson('/api/learning/activity?from=2026-13-01&to=2026-12-31')->assertUnprocessable()->assertJsonValidationErrors('from');
        $this->getJson('/api/learning/activity?from=01/11/2026&to=2026-11-30')->assertUnprocessable()->assertJsonValidationErrors('from');
        $this->getJson('/api/learning/activity?from=2026-11-30&to=2026-11-01')->assertUnprocessable()->assertJsonValidationErrors('to');
        // 2024 is a leap year: 2024-01-01..2024-12-31 is exactly 366 days, one more day is too long.
        $this->getJson('/api/learning/activity?from=2024-01-01&to=2024-12-31')->assertOk();
        $this->getJson('/api/learning/activity?from=2024-01-01&to=2025-01-01')->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/learning/activity?from=2026-11-21&to=2026-11-21')->assertOk();

        $this->getJson('/api/learning/activity/recent?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
        $this->getJson('/api/learning/activity/recent?date=21-11-2026')->assertUnprocessable()->assertJsonValidationErrors('date');
    }

    public function test_recent_is_newest_first_paginated_and_can_be_limited_to_one_day(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner, 'Paged');
        for ($i = 1; $i <= 12; $i++) {
            $this->completed($roadmap, $i, sprintf('2026-11-%02d 02:00:00+00', $i));
        }
        // 2026-11-12 18:00 UTC is 13 November in Vietnam.
        $this->completed($roadmap, 13, '2026-11-12 18:00:00+00');
        Sanctum::actingAs($owner);

        $first = $this->getJson('/api/learning/activity/recent')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 13)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.item_title', 'Step 13')
            ->assertJsonPath('data.1.item_title', 'Step 12')
            ->assertJsonPath('data.0.roadmap_id', $roadmap->id);
        $this->assertSame('2026-11-12T18:00:00+00:00', $first->json('data.0.completed_at'));

        $this->getJson('/api/learning/activity/recent?page=2')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.2.item_title', 'Step 1');

        $this->getJson('/api/learning/activity/recent?date=2026-11-13')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.item_title', 'Step 13');
        $this->getJson('/api/learning/activity/recent?date=2026-11-12')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.item_title', 'Step 12');
    }

    public function test_recent_shows_only_published_lesson_titles(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner, 'Lessons');
        $published = $this->article($owner, 'Published lesson', true);
        $draft = $this->article($owner, 'Draft lesson', false);
        $this->completed($roadmap, 1, '2026-11-02 02:00:00+00', $published);
        $this->completed($roadmap, 2, '2026-11-03 02:00:00+00', $draft);
        Sanctum::actingAs($owner);

        $this->getJson('/api/learning/activity/recent')
            ->assertOk()
            ->assertJsonPath('data.0.item_title', 'Step 2')
            ->assertJsonPath('data.0.article_title', null)
            ->assertJsonPath('data.0.article_id', null)
            ->assertJsonPath('data.1.article_title', 'Published lesson')
            ->assertJsonPath('data.1.article_id', $published);
    }

    private function completed(LearningRoadmap $roadmap, int $position, string $completedAt, ?string $articleId = null): RoadmapItem
    {
        $item = RoadmapItem::query()->create(['roadmap_id' => $roadmap->id, 'title' => "Step {$position}", 'position' => $position, 'status' => 'completed', 'article_id' => $articleId]);
        DB::table('learning_progress')->insert([
            'id' => (string) Str::uuid(), 'roadmap_item_id' => $item->id, 'status' => 'completed',
            'started_at' => $completedAt, 'completed_at' => $completedAt, 'updated_at' => $completedAt,
        ]);

        return $item;
    }

    private function article(User $author, string $title, bool $published): string
    {
        $id = (string) Str::uuid();
        DB::table('articles')->insert(['id' => $id, 'author_id' => $author->id, 'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)), 'status' => 'draft', 'created_at' => now(), 'updated_at' => now()]);
        $versionId = (string) Str::uuid();
        DB::table('article_versions')->insert(['id' => $versionId, 'article_id' => $id, 'version_no' => 1, 'title' => $title, 'content' => 'Body', 'created_by' => $author->id, 'created_at' => now()]);
        if ($published) {
            DB::table('articles')->where('id', $id)->update(['status' => 'published', 'published_version_id' => $versionId, 'published_at' => now()]);
        }

        return $id;
    }

    private function makeAdmin(User $user): void
    {
        $roleId = DB::table('roles')->where('name', 'admin')->value('id');
        if ($roleId === null) {
            $roleId = (string) Str::uuid();
            DB::table('roles')->insert(['id' => $roleId, 'name' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId, 'created_at' => now()]);
    }

    private function user(): User
    {
        $user = new User(['name' => 'Activity User', 'email' => fake()->unique()->safeEmail(), 'password' => 'password', 'status' => 'active']);
        $user->id = (string) Str::uuid();
        $user->save();

        return $user;
    }

    private function roadmapFor(User $user, string $title): LearningRoadmap
    {
        return LearningRoadmap::query()->create(['user_id' => $user->id, 'title' => $title, 'goal' => 'Learn', 'status' => 'active']);
    }
}
