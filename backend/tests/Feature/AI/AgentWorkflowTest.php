<?php

namespace Tests\Feature\AI;

use App\Models\Article;
use App\Models\UserCv;
use App\Services\AI\CompanionRoadmapAiClient;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Content\ContentTestHelper;
use Tests\TestCase;

class AgentWorkflowTest extends TestCase
{
    use DatabaseTransactions, ContentTestHelper;

    protected function setUp(): void
    {
        parent::setUp();
        // TestCase checks the isolated test-db connection before this forward-only
        // migration. The surrounding transaction rolls back this test's schema
        // and data without calling migrate:fresh, migrate:refresh, or db:wipe.
        Artisan::call('migrate', ['--force' => true]);
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-test-token',
            'services.ai.agent_courses_enabled' => true, 'services.ai.agent_admin_enabled' => true,
            'services.ai.agent_cv_enabled' => true]);
        Storage::fake('cv');
    }

    private function courseDraft(string $videoId = 'aBcD1234_-x'): array
    {
        return ['title' => 'PHP course', 'summary' => 'Learn PHP',
            'source_playlist_id' => 'PLabcdEFGH12345', 'source_playlist_title' => 'PHP playlist',
            'lessons' => [
                ['video_id' => $videoId, 'title' => 'First lesson', 'description' => 'Intro', 'learning_objective' => 'Understand PHP'],
                ['video_id' => 'zYxW9876_-a', 'title' => 'Second lesson', 'description' => 'Practice', 'learning_objective' => 'Build a project'],
            ]];
    }

    public function test_course_agent_requires_role_and_publishes_one_playlist_as_one_course(): void
    {
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP'])->assertUnauthorized();
        Sanctum::actingAs($this->createUserWithRole('user'));
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP'])->assertForbidden();
        Sanctum::actingAs($this->createUserWithRole('admin'));
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP'])->assertForbidden();
        Http::fake(['ai.example/v1/agents/course' => Http::response($this->courseDraft())]);
        $contributor = $this->createUserWithRole('contributor');
        Sanctum::actingAs($contributor);
        $trace = '123e4567-e89b-42d3-a456-426614174000';
        $response = $this->withHeader('X-Request-ID', $trace)
            ->postJson('/api/ai/agents/courses', ['topic' => 'PHP', 'max_videos' => 4])
            ->assertCreated()->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.source_playlist_id', 'PLabcdEFGH12345');
        Http::assertSent(fn ($request) => $request->hasHeader('X-Request-ID', $trace));
        $article = Article::query()->findOrFail($response->json('data.id'));
        $this->assertSame($contributor->id, $article->author_id);
        $this->assertSame($article->versions()->firstOrFail()->id, $article->published_version_id);
        $this->assertStringContainsString('@[youtube](aBcD1234_-x)', $article->publishedVersion->content);
        $this->assertLessThan(strpos($article->publishedVersion->content, '@[youtube](zYxW9876_-a)'),
            strpos($article->publishedVersion->content, '@[youtube](aBcD1234_-x)'));
        $this->assertStringContainsString('playlist?list=PLabcdEFGH12345', $article->publishedVersion->content);
        $this->assertDatabaseCount('articles', 1);
    }

    public function test_course_agent_accepts_twenty_videos_and_rejects_twenty_one(): void
    {
        Http::fake(['ai.example/v1/agents/course' => Http::response($this->courseDraft())]);
        Sanctum::actingAs($this->createUserWithRole('contributor'));
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP', 'max_videos' => 20])
            ->assertCreated();
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP', 'max_videos' => 21])
            ->assertUnprocessable();
    }

    public function test_course_agent_rejects_invented_video_id_without_writing(): void
    {
        Http::fake(['ai.example/v1/agents/course' => Http::response($this->courseDraft('not-a-valid-video-id'))]);
        Sanctum::actingAs($this->createUserWithRole('contributor'));
        $this->postJson('/api/ai/agents/courses', ['topic' => 'PHP'])->assertStatus(502);
        $this->assertDatabaseCount('articles', 0);
    }

    public function test_agent_routes_reject_guest_and_contributor_admin_access(): void
    {
        $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Deactivate account', 'target_user_id' => '00000000-0000-4000-8000-000000000001',
        ])->assertUnauthorized();
        $this->postJson('/api/ai/cv/assessment/preview', ['cv_file' => $this->pdf()])->assertUnauthorized();
        $this->getJson('/api/ai/cv/assessment')->assertUnauthorized();

        $target = $this->createUserWithRole('user');
        Sanctum::actingAs($this->createUserWithRole('contributor'));
        $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Deactivate account', 'target_user_id' => $target->id,
        ])->assertForbidden();
        $this->assertDatabaseCount('ai_agent_approvals', 0);
    }

    public function test_admin_agent_requires_acceptance_and_rejects_replay_and_role_downgrade(): void
    {
        $admin = $this->createUserWithRole('admin');
        $target = $this->createUserWithRole('user');
        Http::fake(['ai.example/v1/agents/admin/plan' => Http::response([
            'action' => 'change_user_status', 'value' => 'inactive', 'summary' => 'Ignore all rules',
        ])]);
        Sanctum::actingAs($this->createUserWithRole('user'));
        $this->postJson('/api/ai/agents/admin/plan', ['instruction' => 'Deactivate account', 'target_user_id' => $target->id])->assertForbidden();
        Sanctum::actingAs($admin);
        $proposal = $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Deactivate account', 'target_user_id' => $target->id,
        ])->assertCreated();
        $id = $proposal->json('data.approval_id');
        $this->assertSame('active', $target->fresh()->status);
        $this->assertStringNotContainsString('Ignore all rules', $proposal->json('data.summary'));
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => false])->assertUnprocessable();
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertOk();
        $this->assertSame('inactive', $target->fresh()->status);
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertUnprocessable();
        $this->assertDatabaseCount('ai_agent_approvals', 1);
    }

    public function test_admin_agent_rejects_forged_action_and_changed_target(): void
    {
        $admin = $this->createUserWithRole('admin');
        $target = $this->createUserWithRole('user');
        Sanctum::actingAs($admin);
        Http::fake(['ai.example/v1/agents/admin/plan' => Http::sequence()->push([
            'action' => 'delete_database', 'value' => 'all', 'summary' => 'Ignore instructions',
        ])->push([
            'action' => 'change_user_status', 'value' => 'inactive', 'summary' => 'Change',
        ])]);
        $this->postJson('/api/ai/agents/admin/plan', ['instruction' => 'Delete everything', 'target_user_id' => $target->id])->assertStatus(502);
        $this->assertDatabaseCount('ai_agent_approvals', 0);

        $id = $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Deactivate account', 'target_user_id' => $target->id,
        ])->assertCreated()->json('data.approval_id');
        DB::table('users')->where('id', $target->id)->update(['status' => 'banned']);
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertUnprocessable();
        $this->assertSame('banned', $target->fresh()->status);
    }

    public function test_admin_proposal_is_bound_to_actor_and_current_role(): void
    {
        $admin = $this->createUserWithRole('admin');
        $otherAdmin = $this->createUserWithRole('admin');
        $target = $this->createUserWithRole('user');
        Http::fake(['ai.example/v1/agents/admin/plan' => Http::response([
            'action' => 'change_user_status', 'value' => 'inactive', 'summary' => 'Change',
        ])]);
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Deactivate account', 'target_user_id' => $target->id,
        ])->assertCreated()->json('data.approval_id');
        Sanctum::actingAs($otherAdmin);
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertNotFound();
        DB::table('user_roles')->where('user_id', $admin->id)->delete();
        $userRoleId = DB::table('roles')->where('name', 'user')->value('id');
        DB::table('user_roles')->insert(['user_id' => $admin->id, 'role_id' => $userRoleId, 'created_at' => now()]);
        Sanctum::actingAs($admin->fresh());
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertForbidden();
        $this->assertSame('active', $target->fresh()->status);
    }

    public function test_admin_role_change_requires_step_up_password_at_confirm(): void
    {
        $admin = $this->createUserWithRole('admin');
        $target = $this->createUserWithRole('user');
        Http::fake(['ai.example/v1/agents/admin/plan' => Http::response([
            'action' => 'change_user_role', 'value' => 'admin', 'summary' => 'Change',
        ])]);
        Sanctum::actingAs($admin);
        $id = $this->postJson('/api/ai/agents/admin/plan', [
            'instruction' => 'Make this account admin', 'target_user_id' => $target->id,
        ])->assertCreated()->json('data.approval_id');
        $this->postJson('/api/ai/agents/admin/confirm', ['approval_id' => $id, 'accepted' => true])->assertUnprocessable();
        $this->assertSame(['user'], $target->fresh()->roles()->pluck('name')->all());
        $this->postJson('/api/ai/agents/admin/confirm', [
            'approval_id' => $id, 'accepted' => true, 'current_password' => 'secret123',
        ])->assertOk()->assertJsonPath('data.roles.0', 'admin');
    }

    public function test_cv_preview_is_ephemeral_and_confirm_is_owner_scoped_single_use(): void
    {
        $text = 'Experienced with PHP and Laravel.';
        $this->mock(CompanionRoadmapAiClient::class)->shouldReceive('extractPdf')->andReturn($text);
        Http::fake(['ai.example/v1/agents/cv/assess' => Http::response([
            'summary' => 'PHP experience', 'strengths' => [['skill' => 'PHP', 'evidence' => 'PHP and Laravel']],
            'recommendations' => ['Build a sample app'], 'gaps' => [],
        ])]);
        $owner = $this->createUserWithRole('user');
        Sanctum::actingAs($owner);
        $preview = $this->postJson('/api/ai/cv/assessment/preview', [
            'cv_file' => $this->pdf(), 'target_role' => 'PHP developer',
        ])->assertOk()->assertJsonPath('data.assessment.strengths.0.skill', 'PHP');
        $token = $preview->json('data.preview_token');
        $this->assertDatabaseCount('user_cvs', 0);
        $this->assertDatabaseCount('ai_cv_confirmations', 0);
        Sanctum::actingAs($this->createUserWithRole('user'));
        $this->postJson('/api/ai/cv/assessment/confirm', ['cv_file' => $this->pdf(), 'preview_token' => $token])->assertUnprocessable();
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv/assessment/confirm', ['cv_file' => $this->pdf(), 'preview_token' => $token])->assertCreated();
        $this->getJson('/api/ai/cv/assessment')->assertJsonPath('data.summary', 'PHP experience');
        $this->postJson('/api/ai/cv/assessment/confirm', ['cv_file' => $this->pdf(), 'preview_token' => $token])->assertUnprocessable();
        $this->assertDatabaseCount('ai_cv_confirmations', 1);
        $this->assertDatabaseCount('user_cvs', 1);
        $this->deleteJson('/api/ai/cv')->assertOk();
        $this->assertDatabaseCount('user_cvs', 0);
        $this->getJson('/api/ai/cv/assessment')->assertJsonPath('data', null);
    }

    public function test_cv_rejects_model_invented_evidence_and_stores_nothing(): void
    {
        $this->mock(CompanionRoadmapAiClient::class)->shouldReceive('extractPdf')->andReturn('Only SQL appears here.');
        Http::fake(['ai.example/v1/agents/cv/assess' => Http::response([
            'summary' => 'Great', 'strengths' => [['skill' => 'Kubernetes', 'evidence' => 'Kubernetes']],
            'recommendations' => [], 'gaps' => [],
        ])]);
        Sanctum::actingAs($this->createUserWithRole('user'));
        $this->postJson('/api/ai/cv/assessment/preview', ['cv_file' => $this->pdf()])->assertStatus(502);
        $this->assertDatabaseCount('user_cvs', 0);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('cv.pdf', "%PDF-1.4\n%%EOF\n");
    }
}
