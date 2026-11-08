<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class RetentionPurgeEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-retention-token-0123456789';

    private function configureToken(): void
    {
        config(['services.ai.retention_token' => self::TOKEN]);
    }

    public function test_endpoint_is_disabled_when_token_is_not_configured(): void
    {
        config(['services.ai.retention_token' => null]);

        $this->postJson('/api/internal/ai/purge-deleted-users')
            ->assertStatus(503)
            ->assertJsonPath('status', 'error');
    }

    public function test_missing_or_wrong_token_is_rejected(): void
    {
        $this->configureToken();

        $this->postJson('/api/internal/ai/purge-deleted-users')->assertUnauthorized();
        $this->postJson('/api/internal/ai/purge-deleted-users', [], ['X-Retention-Token' => 'wrong'])
            ->assertUnauthorized();
    }

    public function test_valid_token_purges_only_accounts_deleted_more_than_thirty_days_ago(): void
    {
        $this->configureToken();

        $old = $this->createUser('old');
        $oldConversation = Conversation::query()->create(['user_id' => $old->id, 'title' => 'Old']);
        $old->delete();
        User::withTrashed()->whereKey($old->id)->update(['deleted_at' => now()->subDays(31)]);

        $recent = $this->createUser('recent');
        $recentConversation = Conversation::query()->create(['user_id' => $recent->id, 'title' => 'Recent']);
        $recent->delete();
        User::withTrashed()->whereKey($recent->id)->update(['deleted_at' => now()->subDays(2)]);

        $active = $this->createUser('active');
        $activeConversation = Conversation::query()->create(['user_id' => $active->id, 'title' => 'Active']);

        $this->postJson('/api/internal/ai/purge-deleted-users', [], ['X-Retention-Token' => self::TOKEN])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.exit_code', 0);

        $this->assertDatabaseMissing('conversations', ['id' => $oldConversation->id]);
        $this->assertDatabaseHas('conversations', ['id' => $recentConversation->id]);
        $this->assertDatabaseHas('conversations', ['id' => $activeConversation->id]);
    }

    public function test_get_method_is_not_allowed(): void
    {
        $this->configureToken();

        $this->getJson('/api/internal/ai/purge-deleted-users')->assertStatus(405);
    }

    private function createUser(string $suffix): User
    {
        return User::query()->create([
            'name' => 'Retention '.$suffix,
            'email' => 'retention-'.$suffix.'-'.Str::uuid().'@example.test',
            'password' => 'password',
            'status' => 'active',
        ]);
    }
}
