<?php

namespace Tests\Feature\AI;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\Conversation;
use App\Models\LearningRoadmap;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanionRoadmapTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_and_foreign_user_cannot_generate_from_a_conversation(): void
    {
        $owner = $this->user();
        $conversation = $this->conversation($owner);
        $url = $this->previewUrl($conversation);
        $this->postJson($url)->assertUnauthorized();

        Sanctum::actingAs($this->user());
        $this->postJson($url)->assertNotFound();
        $this->postJson($this->confirmUrl($conversation), ['preview_token' => 'anything'])->assertNotFound();
    }

    public function test_missing_learning_details_are_asked_in_chat_before_generation(): void
    {
        $this->configureAi();
        Http::fake(['ai.example/v1/roadmaps/intent' => Http::response([
            'status' => 'needs_input', 'missing_fields' => ['level', 'weeks'],
            'question' => 'What is your level and how many weeks can you study?',
        ])]);
        $user = $this->user();
        $conversation = $this->conversation($user);
        $this->message($conversation, 'I want to learn SQL');
        Sanctum::actingAs($user);

        $this->postJson($this->previewUrl($conversation))->assertOk()
            ->assertJsonPath('data.state', 'needs_input')
            ->assertJsonPath('data.missing_fields.0', 'level');
        $this->postJson($this->previewUrl($conversation))->assertOk();
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id, 'role' => 'assistant',
            'content' => 'What is your level and how many weeks can you study?',
        ]);
        $this->assertDatabaseCount('messages', 2);
        $this->assertDatabaseCount('learning_roadmaps', 0);
    }

    public function test_preview_uses_real_published_courses_and_confirm_is_owner_scoped_and_idempotent(): void
    {
        $this->configureAi();
        $owner = $this->user();
        $conversation = $this->conversation($owner);
        $this->message($conversation, 'Become a data engineer. I know a little SQL and have 8 hours a week for 12 weeks.');
        $published = $this->article('published', 'SQL for Data Engineering', 'Learn SQL queries and joins.');
        $otherPublished = $this->article('published', 'Data Engineering Basics', 'Practice SQL queries.');
        $this->article('draft', 'Python for Data Engineering', 'Python programming.');
        $this->article('archived', 'Advanced Python', 'Python programming.');
        $deleted = $this->article('published', 'Python for Data Engineering', 'Python programming.');
        Article::query()->findOrFail($deleted)->delete();
        $this->fakeAi();
        Sanctum::actingAs($owner);

        $preview = $this->postJson($this->previewUrl($conversation))->assertOk()
            ->assertJsonPath('data.state', 'ready')
            ->assertJsonPath('data.draft.items.0.article_id', $published)
            ->assertJsonPath('data.draft.items.0.course.title', 'SQL for Data Engineering')
            ->assertJsonPath('data.draft.coverage.internal_percent', 50)
            ->assertJsonPath('data.draft.coverage.external_percent', 50)
            ->assertJsonPath('data.draft.coverage.overall_percent', 100);
        $token = $preview->json('data.preview_token');
        $this->assertNotEmpty($token);
        $this->assertNotSame($otherPublished, $preview->json('data.draft.items.0.article_id'));
        $this->assertSame(5760, array_sum(array_column($preview->json('data.draft.items'), 'estimated_minutes')));
        $courseIds = array_values(array_filter(array_column($preview->json('data.draft.items'), 'article_id')));
        $this->assertSame($courseIds, array_values(array_unique($courseIds)));
        $this->assertNull($preview->json('data.draft.items.1.article_id'));
        $this->assertCount(1, $preview->json('data.draft.items.1.external_resources'));

        $saved = $this->postJson($this->confirmUrl($conversation), ['preview_token' => $token])
            ->assertCreated()->assertJsonPath('data.origin', 'ai')->assertJsonPath('data.user_id', $owner->id);
        $id = $saved->json('data.id');
        $this->postJson($this->confirmUrl($conversation), ['preview_token' => $token])
            ->assertOk()->assertJsonPath('data.id', $id);
        $this->assertDatabaseCount('learning_roadmaps', 1);
        $this->assertDatabaseCount('roadmap_items', 4);
        $this->getJson('/api/learning/roadmaps?mine=1&origin=ai')->assertOk()
            ->assertJsonPath('data.0.id', $id)->assertJsonPath('data.0.coverage.internal_percent', 50);

        Article::query()->findOrFail($published)->update(['status' => 'archived']);
        $this->getJson("/api/learning/roadmaps/{$id}")->assertOk()
            ->assertJsonPath('data.items.0.ai_details.course', null);

        Sanctum::actingAs($this->user());
        $this->postJson($this->confirmUrl($conversation), ['preview_token' => $token])->assertNotFound();
        $this->getJson("/api/learning/roadmaps/{$id}")->assertNotFound();
    }

    public function test_invalid_external_url_is_excluded_and_unpublished_course_blocks_save(): void
    {
        $this->configureAi();
        $owner = $this->user();
        $conversation = $this->conversation($owner);
        $this->message($conversation, 'I want SQL and Python for data engineering in 12 weeks, 8 hours weekly.');
        $published = $this->article('published', 'SQL for Data Engineering', 'SQL queries.');
        $this->fakeAi(false);
        Sanctum::actingAs($owner);

        $preview = $this->postJson($this->previewUrl($conversation))->assertOk();
        $this->assertSame([], $preview->json('data.draft.items.1.external_resources'));
        Article::query()->findOrFail($published)->update(['status' => 'archived']);
        $this->postJson($this->confirmUrl($conversation), ['preview_token' => $preview->json('data.preview_token')])
            ->assertStatus(409);
        $this->assertDatabaseCount('learning_roadmaps', 0);
    }

    public function test_no_matching_course_remains_an_explicit_internal_gap(): void
    {
        $this->configureAi();
        $owner = $this->user();
        $conversation = $this->conversation($owner);
        $this->message($conversation, 'Data engineering with SQL and Python, 12 weeks at 8 hours weekly.');
        $this->fakeAi();
        Sanctum::actingAs($owner);

        $preview = $this->postJson($this->previewUrl($conversation))->assertOk()
            ->assertJsonPath('data.draft.coverage.internal_percent', 0)
            ->assertJsonPath('data.draft.coverage.external_percent', 50)
            ->assertJsonPath('data.draft.coverage.gaps.0', 'SQL');
        $this->assertNull($preview->json('data.draft.items.0.article_id'));
        $this->assertSame(0, count(array_filter(array_column($preview->json('data.draft.items'), 'article_id'))));
    }

    public function test_form_preview_saves_weekly_plan_and_replays_confirmation_without_a_conversation(): void
    {
        $this->configureAi();
        $owner = $this->user();
        $this->article('published', 'SQL for Data Engineering', 'SQL queries.');
        $this->fakeAi();
        Sanctum::actingAs($owner);

        $preview = $this->postJson('/api/ai/roadmaps/form-preview', $this->formInput())
            ->assertOk()->assertJsonPath('data.state', 'ready')
            ->assertJsonPath('data.draft.coverage.profile.level', 'beginner');
        $items = $preview->json('data.draft.items');
        $this->assertSame(5760, array_sum(array_column($items, 'estimated_minutes')));
        $this->assertSame(12, end($items)['week_end']);
        $token = $preview->json('data.preview_token');
        $saved = $this->postJson('/api/ai/roadmaps/form-confirm', ['preview_token' => $token])
            ->assertCreated()->assertJsonPath('data.origin', 'ai');
        $id = $saved->json('data.id');
        $this->postJson('/api/ai/roadmaps/form-confirm', ['preview_token' => $token])
            ->assertOk()->assertJsonPath('data.id', $id);
        $this->assertDatabaseCount('learning_roadmaps', 1);
        $this->assertDatabaseCount('roadmap_item_prerequisites', 3);
        $this->getJson("/api/learning/roadmaps/{$id}")->assertOk()->assertJsonPath('data.id', $id);
        Sanctum::actingAs($this->user());
        $this->postJson('/api/ai/roadmaps/form-confirm', ['preview_token' => $token])->assertUnprocessable();
        $this->getJson("/api/learning/roadmaps/{$id}")->assertNotFound();
    }

    public function test_form_requires_valid_fields_and_pdf(): void
    {
        $this->postJson('/api/ai/roadmaps/form-preview', $this->formInput())->assertUnauthorized();
        Sanctum::actingAs($this->user());
        $this->postJson('/api/ai/roadmaps/form-preview', array_merge($this->formInput(), ['weeks' => 0]))
            ->assertUnprocessable()->assertJsonValidationErrors('weeks');
        $this->post('/api/ai/roadmaps/form-preview', array_merge($this->formInput(), [
            'cv_file' => UploadedFile::fake()->createWithContent('cv.txt', 'not a PDF'),
        ]), ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('cv_file');
    }

    public function test_pdf_cv_is_forwarded_for_extraction_and_only_evidenced_analysis_is_saved(): void
    {
        $this->configureAi();
        $this->fakeAi();
        $user = $this->user();
        Sanctum::actingAs($user);
        $pdf = UploadedFile::fake()->createWithContent('cv.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
        $preview = $this->post('/api/ai/roadmaps/form-preview', array_merge($this->formInput(), [
            'cv_file' => $pdf,
        ]), ['Accept' => 'application/json'])->assertOk()
            ->assertJsonPath('data.draft.cv_analysis.cv_match_percent', 50)
            ->assertJsonPath('data.draft.cv_analysis.strengths.0.skill', 'Python');
        $this->assertStringNotContainsString('Built Python and SQL projects', json_encode($preview->json('data.draft.coverage')));
        $saved = $this->postJson('/api/ai/roadmaps/form-confirm', [
            'preview_token' => $preview->json('data.preview_token'),
        ])->assertCreated();
        $roadmap = LearningRoadmap::query()->findOrFail($saved->json('data.id'));
        $this->assertStringNotContainsString('Built Python and SQL projects', json_encode($roadmap->coverage));
    }

    private function formInput(): array
    {
        return [
            'career_goal' => 'Become a data engineer',
            'current_level' => 'I can write basic SQL but have not worked as a data engineer',
            'target_job_requirements' => 'The role requires SQL and Python',
            'weeks' => 12,
            'hours_per_week' => 8,
        ];
    }

    private function configureAi(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret', 'services.ai.chat_enabled' => true]);
    }

    private function fakeAi(bool $validExternal = true): void
    {
        Http::fake(function (Request $request) use ($validExternal) {
            if (str_ends_with($request->url(), '/v1/roadmaps/cv/extract')) {
                return Http::response(['text' => 'Built Python and SQL projects', 'page_count' => 1]);
            }
            if (str_ends_with($request->url(), '/v1/roadmaps/form-intent')) {
                return Http::response(['profile' => [
                    'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12,
                    'hours_per_week' => 8, 'constraints' => [], 'skills' => ['SQL', 'Python'],
                ], 'cv_analysis' => $request['cv_text'] ? [
                    'strengths' => [['skill' => 'Python', 'evidence' => 'Python and SQL projects']],
                    'gaps' => ['SQL'], 'recommendations' => ['Practice SQL queries'],
                ] : null]);
            }
            if (str_ends_with($request->url(), '/v1/roadmaps/intent')) {
                return Http::response(['status' => 'ready', 'profile' => [
                    'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12,
                    'hours_per_week' => 8, 'constraints' => [], 'skills' => ['SQL', 'Python'],
                ]]);
            }
            if (str_ends_with($request->url(), '/v1/roadmaps/compose')) {
                return Http::response(['title' => 'Data engineer path', 'summary' => 'A practical path.', 'items' => [
                    ['title' => 'Learn SQL', 'description' => 'Query databases.', 'stage_title' => 'Foundation', 'skills' => ['SQL'], 'article_id' => (string) Str::uuid()],
                    ['title' => 'Learn Python', 'description' => 'Write scripts.', 'stage_title' => 'Foundation', 'skills' => ['Python']],
                    ['title' => 'Practice SQL', 'description' => 'Build queries.', 'stage_title' => 'Practice', 'skills' => ['SQL']],
                    ['title' => 'Practice Python', 'description' => 'Build pipelines.', 'stage_title' => 'Practice', 'skills' => ['Python']],
                ]]);
            }
            if (str_ends_with($request->url(), '/v1/resources/search')) {
                return Http::response(['retrieval_status' => 'ok', 'resources' => [[
                    'skill' => 'Python', 'title' => 'Python Tutorial', 'topic' => 'Python',
                    'url' => $validExternal ? 'https://docs.python.org/3/tutorial/' : 'http://example.invalid/tutorial',
                    'reason' => 'Official Python documentation.', 'verified_at' => now()->toIso8601String(),
                ]]]);
            }
            if ($request->url() === 'https://docs.python.org/3/tutorial/') {
                return Http::response('', 200);
            }
            return Http::response(['detail' => ['code' => 'unexpected_request']], 500);
        });
    }

    private function user(): User
    {
        return User::query()->create(['name' => 'Roadmap user', 'email' => Str::uuid().'@example.test', 'password' => 'password']);
    }

    private function conversation(User $user): Conversation
    {
        return Conversation::query()->create(['user_id' => $user->id, 'title' => 'Career planning']);
    }

    private function message(Conversation $conversation, string $content): void
    {
        Message::query()->create(['conversation_id' => $conversation->id, 'role' => 'user', 'content' => $content, 'sequence' => 1, 'created_at' => now()]);
    }

    private function article(string $status, string $title, string $content): string
    {
        $author = $this->user();
        $article = Article::query()->create([
            'author_id' => $author->id, 'slug' => Str::slug($title).'-'.Str::random(8), 'status' => $status,
        ]);
        if ($status === 'published') {
            $version = ArticleVersion::query()->create([
                'article_id' => $article->id, 'version_no' => 1,
                'title' => $title, 'content' => $content, 'created_by' => $author->id,
            ]);
            $article->update(['published_version_id' => $version->id]);
        }
        return $article->id;
    }

    private function previewUrl(Conversation $conversation): string
    {
        return "/api/ai/conversations/{$conversation->id}/roadmaps/preview";
    }

    private function confirmUrl(Conversation $conversation): string
    {
        return "/api/ai/conversations/{$conversation->id}/roadmaps/confirm";
    }
}
