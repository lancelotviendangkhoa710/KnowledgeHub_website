<?php

namespace Tests\Feature\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use App\Services\Learning\RoadmapProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** RMR-01: summary fields on GET /api/learning/roadmaps and GET /api/learning/roadmaps/{id}. */
class RoadmapSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_list_returns_counts_topics_rolled_up_to_root_category_and_last_activity(): void
    {
        $owner = $this->user();
        $system = $this->category('System Design', 'system-design');
        $micro = $this->category('Microservices', 'microservices', $system);
        $programming = $this->category('Programming', 'programming');

        Carbon::setTestNow('2026-11-01 08:00:00');
        $roadmap = $this->roadmapFor($owner, 'Distributed');
        $a = $this->itemFor($roadmap, 1, 'Network basics', $this->article($owner, $micro, 'Network course'));
        $this->itemFor($roadmap, 2, 'Load balancing', $this->article($owner, $system, 'LB course'));
        $c = $this->itemFor($roadmap, 3, 'Code', $this->article($owner, $programming, 'Code course'));
        $this->itemFor($roadmap, 4, 'No article');

        Carbon::setTestNow('2026-11-10 09:30:00');
        app(RoadmapProgressService::class)->update($a, 'completed');
        Carbon::setTestNow('2026-11-12 10:00:00');
        app(RoadmapProgressService::class)->update($c, 'completed');
        Carbon::setTestNow();

        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/learning/roadmaps?mine=1')->assertOk();

        $response->assertJsonPath('data.0.id', $roadmap->id)
            ->assertJsonPath('data.0.items_count', 4)
            ->assertJsonPath('data.0.completed_count', 2)
            ->assertJsonPath('data.0.topics.0.category_slug', 'system-design')
            ->assertJsonPath('data.0.topics.0.name', 'System Design')
            ->assertJsonPath('data.0.topics.0.count', 2)
            ->assertJsonPath('data.0.topics.1.category_slug', 'programming')
            ->assertJsonPath('data.0.topics.1.count', 1)
            ->assertJsonCount(2, 'data.0.topics')
            // Backward compatible: the existing fields and nested items stay.
            ->assertJsonPath('data.0.title', 'Distributed')
            ->assertJsonPath('data.0.items.0.title', 'Network basics')
            ->assertJsonPath('data.0.items.0.article_title', 'Network course')
            ->assertJsonPath('data.0.items.3.completed_at', null)
            ->assertJsonPath('data.0.items.1.status', 'pending');

        $this->assertSame('2026-11-10', substr((string) $response->json('data.0.items.0.completed_at'), 0, 10));
        $this->assertSame('2026-11-12T10:00:00', substr((string) $response->json('data.0.last_activity_at'), 0, 19));
    }

    public function test_last_activity_falls_back_to_roadmap_updated_at_when_newer_or_nothing_completed(): void
    {
        $owner = $this->user();
        Carbon::setTestNow('2026-10-01 08:00:00');
        $roadmap = $this->roadmapFor($owner, 'Quiet');
        $this->itemFor($roadmap, 1, 'Untouched');
        Carbon::setTestNow();

        Sanctum::actingAs($owner);
        $this->getJson('/api/learning/roadmaps')
            ->assertOk()
            ->assertJsonPath('data.0.items_count', 1)
            ->assertJsonPath('data.0.completed_count', 0)
            ->assertJsonPath('data.0.topics', []);

        $this->assertSame('2026-10-01T08:00:00', substr((string) $this->getJson('/api/learning/roadmaps')->json('data.0.last_activity_at'), 0, 19));
    }

    public function test_unpublished_article_title_is_hidden_but_topic_still_counted(): void
    {
        $owner = $this->user();
        $programming = $this->category('Programming', 'programming');
        $roadmap = $this->roadmapFor($owner, 'Drafts');
        $draftId = $this->article($owner, $programming, 'Secret draft', 'draft');
        $this->itemFor($roadmap, 1, 'Draft-linked', $draftId);

        Sanctum::actingAs($owner);
        $this->getJson("/api/learning/roadmaps/{$roadmap->id}")
            ->assertOk()
            ->assertJsonPath('data.items.0.article_title', null)
            ->assertJsonPath('data.topics.0.category_slug', 'programming')
            ->assertJsonPath('data.items_count', 1);
    }

    public function test_show_includes_summary_and_foreign_roadmap_is_not_visible(): void
    {
        $owner = $this->user();
        $mine = $this->roadmapFor($owner, 'Mine');
        $this->itemFor($mine, 1, 'Step');
        $other = $this->user();
        $foreign = $this->roadmapFor($other, 'Foreign');
        $this->itemFor($foreign, 1, 'Hidden step');

        Sanctum::actingAs($owner);
        $this->getJson("/api/learning/roadmaps/{$mine->id}")
            ->assertOk()
            ->assertJsonPath('data.items_count', 1)
            ->assertJsonPath('data.completed_count', 0);

        $this->getJson("/api/learning/roadmaps/{$foreign->id}")->assertNotFound();
        $this->getJson('/api/learning/roadmaps')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['title' => 'Foreign']);
    }

    public function test_listing_uses_a_constant_number_of_queries(): void
    {
        $owner = $this->user();
        $category = $this->category('Programming', 'programming');
        $seed = function (int $count) use ($owner, $category): void {
            for ($i = 0; $i < $count; $i++) {
                $roadmap = $this->roadmapFor($owner, "Roadmap {$i}");
                for ($p = 1; $p <= 3; $p++) {
                    $item = $this->itemFor($roadmap, $p, "Step {$p}", $this->article($owner, $category, "Course {$i}-{$p}"));
                    app(RoadmapProgressService::class)->update($item, 'completed');
                }
            }
        };

        Sanctum::actingAs($owner);
        $seed(1);
        $few = $this->countQueries(fn () => $this->getJson('/api/learning/roadmaps')->assertOk());
        $seed(6);
        $many = $this->countQueries(fn () => $this->getJson('/api/learning/roadmaps')->assertOk()->assertJsonCount(7, 'data'));

        $this->assertSame($few, $many, "Query count grew from {$few} to {$many} with more roadmaps (N+1).");
    }

    private function countQueries(callable $callback): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $callback();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    }

    private function user(): User
    {
        $user = new User(['name' => 'Summary User', 'email' => fake()->unique()->safeEmail(), 'password' => 'password', 'status' => 'active']);
        $user->id = (string) Str::uuid();
        $user->save();

        return $user;
    }

    private function category(string $name, string $slug, ?string $parentId = null): string
    {
        $id = (string) Str::uuid();
        DB::table('categories')->insert(['id' => $id, 'name' => $name, 'slug' => $slug, 'parent_id' => $parentId, 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    private function article(User $author, string $categoryId, string $title, string $status = 'published'): string
    {
        $id = (string) Str::uuid();
        DB::table('articles')->insert([
            'id' => $id, 'author_id' => $author->id, 'category_id' => $categoryId,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)), 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $versionId = (string) Str::uuid();
        DB::table('article_versions')->insert([
            'id' => $versionId, 'article_id' => $id, 'version_no' => 1, 'title' => $title,
            'content' => 'Body', 'created_by' => $author->id, 'created_at' => now(),
        ]);
        if ($status === 'published') {
            DB::table('articles')->where('id', $id)->update(['status' => 'published', 'published_version_id' => $versionId, 'published_at' => now()]);
        }

        return $id;
    }

    private function roadmapFor(User $user, string $title): LearningRoadmap
    {
        return LearningRoadmap::query()->create(['user_id' => $user->id, 'title' => $title, 'goal' => 'Learn', 'status' => 'active']);
    }

    private function itemFor(LearningRoadmap $roadmap, int $position, string $title, ?string $articleId = null): RoadmapItem
    {
        return RoadmapItem::query()->create(['roadmap_id' => $roadmap->id, 'title' => $title, 'position' => $position, 'status' => 'pending', 'article_id' => $articleId]);
    }
}
