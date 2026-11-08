<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * AI-01 Conversations API contract and privacy gate.
 *
 * Admin is intentionally table-tested as a regular non-owner: reading another
 * user's conversation must be 404 in V1 until Product/Privacy approve P9.
 */
class ConversationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_unauthorized_on_every_conversation_endpoint(): void
    {
        $conversation = $this->conversationFor($this->createUser());

        $this->getJson('/api/ai/conversations')->assertUnauthorized();
        $this->postJson('/api/ai/conversations', ['title' => 'Guest chat'])->assertUnauthorized();
        $this->getJson("/api/ai/conversations/{$conversation->id}")->assertUnauthorized();
        $this->patchJson("/api/ai/conversations/{$conversation->id}", ['title' => 'Guest rename'])->assertUnauthorized();
        $this->deleteJson("/api/ai/conversations/{$conversation->id}")->assertUnauthorized();

        $this->assertDatabaseHas('conversations', [
            'id' => $conversation->id,
            'title' => 'Conversation',
        ]);
    }

    public function test_user_lists_only_own_conversations_with_pagination_meta(): void
    {
        $owner = $this->createUser();
        foreach (range(1, 21) as $index) {
            $this->conversationFor($owner, "Own {$index}");
        }
        $this->conversationFor($this->createUser(), 'Foreign conversation');
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 21)
            ->assertJsonPath('meta.last_page', 2);

        $this->assertSame(
            [$owner->id],
            array_values(array_unique(array_column($response->json('data'), 'user_id'))),
        );
        $this->assertSame(0, $response->json('data.0.messages_count'));

        $this->getJson('/api/ai/conversations?page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.current_page', 2);
    }

    public function test_list_orders_conversations_newest_first(): void
    {
        $owner = $this->createUser();
        $oldest = $this->conversationFor($owner, 'Oldest');
        $newest = $this->conversationFor($owner, 'Newest');
        DB::table('conversations')->where('id', $oldest->id)->update(['created_at' => now()->subDay()]);
        DB::table('conversations')->where('id', $newest->id)->update(['created_at' => now()]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.1.id', $oldest->id);
    }

    public function test_create_derives_owner_from_authenticated_user_and_ignores_client_user_id(): void
    {
        $owner = $this->createUser();
        $other = $this->createUser();
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/ai/conversations', [
            'title' => '  SQL study plan  ',
            'user_id' => $other->id,
        ])
            ->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user_id', $owner->id)
            ->assertJsonPath('data.title', 'SQL study plan')
            ->assertJsonPath('data.messages_count', 0);

        $this->assertDatabaseHas('conversations', [
            'id' => $response->json('data.id'),
            'user_id' => $owner->id,
            'title' => 'SQL study plan',
        ]);
        $this->assertDatabaseMissing('conversations', ['user_id' => $other->id]);
    }

    public function test_create_accepts_missing_or_blank_title_as_null(): void
    {
        Sanctum::actingAs($this->createUser());

        $this->postJson('/api/ai/conversations')
            ->assertCreated()
            ->assertJsonPath('data.title', null);

        $this->postJson('/api/ai/conversations', ['title' => '   '])
            ->assertCreated()
            ->assertJsonPath('data.title', null);

        $this->assertDatabaseCount('conversations', 2);
    }

    public function test_show_returns_own_conversation_with_message_count_and_no_messages_array(): void
    {
        $owner = $this->createUser();
        $conversation = $this->conversationFor($owner, 'Private chat');
        $this->messageFor($conversation, 'user', 'Hello');
        $this->messageFor($conversation, 'assistant', 'Hi');
        Sanctum::actingAs($owner);

        $this->getJson("/api/ai/conversations/{$conversation->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $conversation->id)
            ->assertJsonPath('data.messages_count', 2)
            ->assertJsonMissingPath('data.messages');

        $foreign = $this->conversationFor($this->createUser(), 'Foreign chat');
        $this->getJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();
        $this->getJson('/api/ai/conversations/'.Str::uuid())->assertNotFound();
        $this->getJson('/api/ai/conversations/not-a-uuid')->assertNotFound();
    }

    public function test_owner_can_rename_but_foreign_conversation_is_not_found(): void
    {
        $owner = $this->createUser();
        $other = $this->createUser();
        $conversation = $this->conversationFor($owner, 'Original title');
        Sanctum::actingAs($owner);

        $this->patchJson("/api/ai/conversations/{$conversation->id}", [
            'title' => 'Renamed title',
            'user_id' => $other->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Renamed title')
            ->assertJsonPath('data.user_id', $owner->id)
            ->assertJsonPath('data.messages_count', 0);

        $this->assertDatabaseHas('conversations', [
            'id' => $conversation->id,
            'user_id' => $owner->id,
            'title' => 'Renamed title',
        ]);

        $foreign = $this->conversationFor($other, 'Foreign title');
        $this->patchJson("/api/ai/conversations/{$foreign->id}", ['title' => 'Hijacked'])
            ->assertNotFound();
        $this->assertDatabaseHas('conversations', [
            'id' => $foreign->id,
            'title' => 'Foreign title',
        ]);
    }

    public function test_owner_delete_cascades_messages_and_foreign_delete_is_not_found(): void
    {
        $owner = $this->createUser();
        $conversation = $this->conversationFor($owner, 'Delete me');
        $first = $this->messageFor($conversation, 'user', 'First message');
        $second = $this->messageFor($conversation, 'assistant', 'Second message');
        Sanctum::actingAs($owner);

        $this->deleteJson("/api/ai/conversations/{$conversation->id}")
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseMissing('conversations', ['id' => $conversation->id]);
        $this->assertDatabaseMissing('messages', ['id' => $first]);
        $this->assertDatabaseMissing('messages', ['id' => $second]);

        $foreign = $this->conversationFor($this->createUser(), 'Foreign chat');
        $foreignMessage = $this->messageFor($foreign, 'user', 'Private message');
        $this->deleteJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();
        $this->assertDatabaseHas('conversations', ['id' => $foreign->id]);
        $this->assertDatabaseHas('messages', ['id' => $foreignMessage]);
    }

    public function test_validation_rejects_invalid_titles(): void
    {
        $owner = $this->createUser();
        $conversation = $this->conversationFor($owner);
        Sanctum::actingAs($owner);

        $this->postJson('/api/ai/conversations', ['title' => str_repeat('x', 121)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->postJson('/api/ai/conversations', ['title' => ['not', 'a', 'string']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');

        $this->patchJson("/api/ai/conversations/{$conversation->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->patchJson("/api/ai/conversations/{$conversation->id}", ['title' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->patchJson("/api/ai/conversations/{$conversation->id}", ['title' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->patchJson("/api/ai/conversations/{$conversation->id}", ['title' => str_repeat('x', 121)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversation->id,
            'title' => 'Conversation',
        ]);
    }

    public function test_contributor_is_treated_like_a_regular_owner(): void
    {
        $contributor = $this->createUser();
        $this->assignRole($contributor, 'contributor');
        $own = $this->conversationFor($contributor, 'Contributor chat');
        $foreign = $this->conversationFor($this->createUser(), 'Foreign chat');
        Sanctum::actingAs($contributor);

        $this->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);

        $this->postJson('/api/ai/conversations', ['title' => 'New chat'])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $contributor->id);
        $this->patchJson("/api/ai/conversations/{$own->id}", ['title' => 'Renamed'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Renamed');

        $this->getJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();
        $this->patchJson("/api/ai/conversations/{$foreign->id}", ['title' => 'Hijacked'])->assertNotFound();
        $this->deleteJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();
    }

    public function test_admin_cannot_read_or_modify_another_users_conversation(): void
    {
        $admin = $this->createUser();
        $this->assignRole($admin, 'admin');
        $foreign = $this->conversationFor($this->createUser(), 'User private chat');
        $message = $this->messageFor($foreign, 'user', 'Private content');
        Sanctum::actingAs($admin);

        $this->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);

        $this->getJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();
        $this->patchJson("/api/ai/conversations/{$foreign->id}", ['title' => 'Admin edit'])
            ->assertNotFound();
        $this->deleteJson("/api/ai/conversations/{$foreign->id}")->assertNotFound();

        $this->assertDatabaseHas('conversations', [
            'id' => $foreign->id,
            'title' => 'User private chat',
        ]);
        $this->assertDatabaseHas('messages', ['id' => $message]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'Conversation user',
            'email' => 'conversation-'.Str::uuid().'@example.test',
            'password' => 'password',
        ]);
    }

    private function conversationFor(User $user, string $title = 'Conversation'): Conversation
    {
        return Conversation::query()->create([
            'user_id' => $user->id,
            'title' => $title,
        ]);
    }

    private function messageFor(Conversation $conversation, string $role, string $content): string
    {
        $id = (string) Str::uuid();
        DB::table('messages')->insert([
            'id' => $id,
            'conversation_id' => $conversation->id,
            'role' => $role,
            'content' => $content,
            'created_at' => now(),
        ]);

        return $id;
    }

    private function assignRole(User $user, string $name): void
    {
        $roleId = DB::table('roles')->where('name', $name)->value('id');
        if (! $roleId) {
            $roleId = (string) Str::uuid();
            DB::table('roles')->insert([
                'id' => $roleId,
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        DB::table('user_roles')->insert([
            'user_id' => $user->id,
            'role_id' => $roleId,
            'created_at' => now(),
        ]);
    }
}
