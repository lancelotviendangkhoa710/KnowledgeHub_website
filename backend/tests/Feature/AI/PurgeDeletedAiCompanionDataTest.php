<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\UserMemory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PurgeDeletedAiCompanionDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_purges_ai_data_for_accounts_deleted_more_than_thirty_days_ago(): void
    {
        $old = $this->createUser('old');
        $recent = $this->createUser('recent');
        $active = $this->createUser('active');

        $oldConversation = $this->createConversation($old);
        $oldMessage = Message::query()->create([
            'conversation_id' => $oldConversation->id,
            'role' => 'user',
            'content' => 'old private message',
        ]);
        $oldMemory = $this->createMemory($old);

        $recentConversation = $this->createConversation($recent);
        $recentMessage = Message::query()->create([
            'conversation_id' => $recentConversation->id,
            'role' => 'user',
            'content' => 'recent private message',
        ]);
        $recentMemory = $this->createMemory($recent);

        $activeConversation = $this->createConversation($active);
        $activeMessage = Message::query()->create([
            'conversation_id' => $activeConversation->id,
            'role' => 'user',
            'content' => 'active message',
        ]);
        $activeMemory = $this->createMemory($active);

        $old->delete();
        $recent->delete();
        User::withTrashed()->whereKey($old->id)->update(['deleted_at' => now()->subDays(31)]);
        User::withTrashed()->whereKey($recent->id)->update(['deleted_at' => now()->subDays(5)]);

        $this->artisan('ai:purge-deleted-users')->assertSuccessful();

        // Old deleted account: AI rows gone.
        $this->assertDatabaseMissing('conversations', ['id' => $oldConversation->id]);
        $this->assertDatabaseMissing('messages', ['id' => $oldMessage->id]);
        $this->assertDatabaseMissing('user_memories', ['id' => $oldMemory->id]);

        // Recently deleted account: retained until the window passes.
        $this->assertDatabaseHas('conversations', ['id' => $recentConversation->id]);
        $this->assertDatabaseHas('messages', ['id' => $recentMessage->id]);
        $this->assertDatabaseHas('user_memories', ['id' => $recentMemory->id]);

        // Active account: untouched.
        $this->assertDatabaseHas('conversations', ['id' => $activeConversation->id]);
        $this->assertDatabaseHas('messages', ['id' => $activeMessage->id]);
        $this->assertDatabaseHas('user_memories', ['id' => $activeMemory->id]);

        // This command owns AI data, not the Auth-owned user row.
        $this->assertDatabaseHas('users', ['id' => $old->id]);
    }

    public function test_days_option_controls_the_cutoff(): void
    {
        $user = $this->createUser('one-day');
        $conversation = $this->createConversation($user);
        $user->delete();
        User::withTrashed()->whereKey($user->id)->update(['deleted_at' => now()->subDays(2)]);

        $this->artisan('ai:purge-deleted-users', ['--days' => 3])->assertSuccessful();
        $this->assertDatabaseHas('conversations', ['id' => $conversation->id]);

        $this->artisan('ai:purge-deleted-users', ['--days' => 1])->assertSuccessful();
        $this->assertDatabaseMissing('conversations', ['id' => $conversation->id]);
    }

    private function createUser(string $suffix): User
    {
        return User::query()->create([
            'name' => 'Purge '.$suffix,
            'email' => 'purge-'.$suffix.'-'.Str::uuid().'@example.test',
            'password' => 'password',
            'status' => 'active',
        ]);
    }

    private function createConversation(User $user): Conversation
    {
        return Conversation::query()->create([
            'user_id' => $user->id,
            'title' => 'Private conversation',
        ]);
    }

    private function createMemory(User $user): UserMemory
    {
        return UserMemory::query()->create([
            'user_id' => $user->id,
            'memory_type' => 'preference',
            'content' => 'Private preference',
            'status' => 'active',
        ]);
    }
}
