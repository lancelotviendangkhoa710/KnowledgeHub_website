<?php

namespace Tests\Feature\AI;

use App\Models\User;
use App\Models\UserCv;
use App\Services\AI\CompanionRoadmapAiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class UserCvTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('cv');
        $this->mock(CompanionRoadmapAiClient::class)->shouldReceive('extractPdf')->andReturn('private extracted text');
    }

    private function user(): User
    {
        return User::query()->create(['name' => 'CV user', 'email' => \Illuminate\Support\Str::uuid().'@example.test', 'password' => 'password']);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('resume.pdf', "%PDF-1.4\n%%EOF\n");
    }

    public function test_consent_ownership_replacement_and_deletion(): void
    {
        $this->getJson('/api/ai/cv')->assertUnauthorized();
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf()])->assertUnprocessable();
        $first = $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])
            ->assertCreated()->assertJsonMissing(['extracted_text' => 'private extracted text']);
        $this->assertArrayNotHasKey('object_key', $first->json('data'));
        $old = UserCv::query()->where('user_id', $owner->id)->firstOrFail();
        Storage::disk('cv')->assertExists($old->object_key);
        Sanctum::actingAs($this->user());
        $this->getJson('/api/ai/cv')->assertOk()->assertJsonPath('data', null);
        $this->get('/api/ai/cv/download')->assertNotFound();
        $this->deleteJson('/api/ai/cv')->assertOk();
        Storage::disk('cv')->assertExists($old->object_key);
        Sanctum::actingAs($owner);
        $this->get('/api/ai/cv/download')->assertOk();
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertCreated();
        Storage::disk('cv')->assertMissing($old->object_key);
        $this->assertDatabaseCount('user_cvs', 1);
        $new = UserCv::query()->firstOrFail();
        $this->deleteJson('/api/ai/cv')->assertOk();
        Storage::disk('cv')->assertMissing($new->object_key);
        $this->assertDatabaseCount('user_cvs', 0);
    }

    public function test_roles_cannot_manage_another_users_cv(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertCreated();
        $key = UserCv::query()->firstOrFail()->object_key;
        foreach (['user', 'contributor', 'admin'] as $role) {
            $actor = $this->user();
            $roleId = (string) \Illuminate\Support\Str::uuid();
            \Illuminate\Support\Facades\DB::table('roles')->insert(['id' => $roleId, 'name' => $role]);
            \Illuminate\Support\Facades\DB::table('user_roles')->insert(['user_id' => $actor->id, 'role_id' => $roleId]);
            Sanctum::actingAs($actor);
            $this->getJson('/api/ai/cv')->assertJsonPath('data', null);
            $this->get('/api/ai/cv/download')->assertNotFound();
            $this->deleteJson('/api/ai/cv')->assertOk();
            Storage::disk('cv')->assertExists($key);
        }
    }

    public function test_invalid_and_oversized_files_are_rejected(): void
    {
        Sanctum::actingAs($this->user());
        $this->postJson('/api/ai/cv', ['cv_file' => UploadedFile::fake()->createWithContent('bad.txt', 'text'), 'consent' => '1'])->assertUnprocessable();
        $this->postJson('/api/ai/cv', ['cv_file' => UploadedFile::fake()->create('big.pdf', 2049, 'application/pdf'), 'consent' => '1'])->assertUnprocessable();
        $this->assertDatabaseCount('user_cvs', 0);
    }

    public function test_upload_failure_keeps_only_a_pending_cleanup_record(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $disk = Mockery::mock();
        $disk->shouldReceive('put')->once()->andThrow(new \RuntimeException('private storage failure'));
        Storage::shouldReceive('disk')->with('cv')->once()->andReturn($disk);

        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])
            ->assertStatus(503)->assertDontSee('private storage failure');

        $this->assertDatabaseHas('user_cvs', [
            'user_id' => $owner->id, 'status' => 'pending_delete', 'extracted_text' => null,
        ]);
        $this->assertSame(0, UserCv::query()->where('user_id', $owner->id)->where('status', 'active')->count());
        $this->getJson('/api/ai/cv')->assertJsonPath('data', null);
        $this->get('/api/ai/cv/download')->assertNotFound();
    }

    public function test_replacement_cleanup_failure_hides_old_text_and_retries(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertCreated();
        $old = UserCv::query()->firstOrFail();
        $disk = Mockery::mock();
        $disk->shouldReceive('put')->once()->andReturn(true);
        $disk->shouldReceive('exists')->once()->andReturn(true);
        $disk->shouldReceive('delete')->once()->andThrow(new \RuntimeException('failed'));
        $disk->shouldReceive('delete')->once()->andReturn(true);
        $disk->shouldReceive('exists')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('cv')->andReturn($disk);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertStatus(503);
        $this->assertDatabaseHas('user_cvs', ['id' => $old->id, 'status' => 'pending_delete', 'extracted_text' => null]);
        $this->assertSame(1, UserCv::query()->where('status', 'active')->count());
        $this->travel(6)->minutes();
        $this->artisan('ai:cleanup-pending-cvs')->assertSuccessful();
        $this->assertDatabaseMissing('user_cvs', ['id' => $old->id]);
    }
    public function test_scheduled_cleanup_preserves_recent_staging_for_same_owner(): void
    {
        $owner = $this->user();
        $createPending = fn (string $key) => UserCv::create([
            'user_id' => $owner->id, 'object_key' => $key, 'filename' => 'cv.pdf',
            'size_bytes' => 12, 'consented_at' => now(), 'status' => 'pending_delete',
            'extracted_text' => null,
        ]);
        $old = $createPending('cvs/old.pdf');
        $fresh = $createPending('cvs/staging.pdf');
        Storage::disk('cv')->put($old->object_key, 'old');
        Storage::disk('cv')->put($fresh->object_key, 'staging');
        \Illuminate\Support\Facades\DB::table('user_cvs')->where('id', $old->id)
            ->update(['updated_at' => now()->subMinutes(6)]);

        $this->artisan('ai:cleanup-pending-cvs')->assertSuccessful();
        $this->assertDatabaseMissing('user_cvs', ['id' => $old->id]);
        $this->assertDatabaseHas('user_cvs', ['id' => $fresh->id]);
        Storage::disk('cv')->assertMissing($old->object_key);
        Storage::disk('cv')->assertExists($fresh->object_key);
    }

    public function test_save_does_not_clean_another_recent_staging_record(): void
    {
        $owner = $this->user();
        $staging = UserCv::create([
            'user_id' => $owner->id, 'object_key' => 'cvs/staging.pdf', 'filename' => 'cv.pdf',
            'size_bytes' => 12, 'consented_at' => now(), 'status' => 'pending_delete',
            'extracted_text' => null,
        ]);
        Storage::disk('cv')->put($staging->object_key, 'staging');
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertCreated();
        $this->assertDatabaseHas('user_cvs', ['id' => $staging->id, 'status' => 'pending_delete']);
        Storage::disk('cv')->assertExists($staging->object_key);
    }
    public function test_failed_cleanup_clears_text_and_can_be_retried(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/cv', ['cv_file' => $this->pdf(), 'consent' => '1'])->assertCreated();
        $cv = UserCv::query()->firstOrFail();
        $disk = Mockery::mock();
        $disk->shouldReceive('delete')->once()->andThrow(new \RuntimeException('private backend failure'));
        $disk->shouldReceive('delete')->once()->andReturn(true);
        $disk->shouldReceive('exists')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('cv')->andReturn($disk);
        $response = $this->deleteJson('/api/ai/cv')->assertStatus(503);
        $response->assertDontSee('private backend failure');
        $this->assertDatabaseHas('user_cvs', ['id' => $cv->id, 'status' => 'pending_delete', 'extracted_text' => null]);
        $this->getJson('/api/ai/cv')->assertJsonPath('data', null);
        $this->get('/api/ai/cv/download')->assertNotFound();
        $this->travel(6)->minutes();
        $this->artisan('ai:cleanup-pending-cvs')->assertSuccessful();
        $this->assertDatabaseMissing('user_cvs', ['id' => $cv->id]);
    }
}
