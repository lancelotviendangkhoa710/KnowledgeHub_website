<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessageHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_message_history(): void
    {
        $this->getJson('/api/ai/conversations/'.Str::uuid().'/messages')->assertUnauthorized();
    }

    public function test_missing_conversation_returns_generic_json_404(): void
    {
        Sanctum::actingAs($this->createUser());

        $response = $this->getJson('/api/ai/conversations/'.Str::uuid().'/messages')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 'not_found')
            ->assertJsonPath('message', 'Resource not found.');

        $this->assertStringNotContainsString('App\\Models', (string) $response->getContent());
        $this->assertStringNotContainsString('Conversation', (string) $response->getContent());
    }

    public function test_owner_reads_the_latest_messages_in_ascending_order(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);
        $messages = $this->appendMessages($conversation, 5);

        $response = $this->getJson($this->messagesUrl($conversation).'?limit=3')->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.has_more', true)
            ->assertJsonPath('meta.next_before_id', $messages[2]->id);

        $this->assertSame(
            [$messages[2]->id, $messages[3]->id, $messages[4]->id],
            array_column($response->json('data'), 'id'),
        );
    }

    public function test_before_id_paginates_older_messages(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);
        $messages = $this->appendMessages($conversation, 5);

        $first = $this->getJson($this->messagesUrl($conversation).'?limit=2')->assertOk()
            ->assertJsonPath('meta.has_more', true)
            ->assertJsonPath('meta.next_before_id', $messages[3]->id);
        $this->assertSame([$messages[3]->id, $messages[4]->id], array_column($first->json('data'), 'id'));

        $second = $this->getJson($this->messagesUrl($conversation).'?limit=2&before_id='.$messages[3]->id)->assertOk()
            ->assertJsonPath('meta.has_more', true)
            ->assertJsonPath('meta.next_before_id', $messages[1]->id);
        $this->assertSame([$messages[1]->id, $messages[2]->id], array_column($second->json('data'), 'id'));

        $third = $this->getJson($this->messagesUrl($conversation).'?limit=2&before_id='.$messages[1]->id)->assertOk()
            ->assertJsonPath('meta.has_more', false)
            ->assertJsonPath('meta.next_before_id', null);
        $this->assertSame([$messages[0]->id], array_column($third->json('data'), 'id'));
    }

    public function test_before_id_must_belong_to_the_conversation(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);
        $otherConversation = $this->createConversation($user);
        $this->appendMessages($conversation, 2);
        $foreignMessage = $this->appendMessages($otherConversation, 1)[0];

        $this->getJson($this->messagesUrl($conversation).'?before_id='.$foreignMessage->id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['before_id']);
    }

    public function test_foreign_conversation_is_not_found(): void
    {
        $owner = $this->createUser();
        $intruder = $this->createUser();
        $conversation = $this->createConversation($owner);
        $this->appendMessages($conversation, 2);
        Sanctum::actingAs($intruder);

        $this->getJson($this->messagesUrl($conversation))->assertNotFound();
    }

    public function test_admin_cannot_read_another_users_conversation(): void
    {
        $owner = $this->createUser();
        $conversation = $this->createConversation($owner);
        $this->appendMessages($conversation, 2);

        $admin = $this->createUser();
        $this->assignRole($admin, 'admin');
        Sanctum::actingAs($admin);

        $this->getJson($this->messagesUrl($conversation))->assertNotFound();
    }

    private function messagesUrl(Conversation $conversation): string
    {
        return '/api/ai/conversations/'.$conversation->id.'/messages';
    }

    private function createConversation(User $user): Conversation
    {
        return Conversation::query()->create([
            'user_id' => $user->id,
            'title' => 'Test conversation',
        ]);
    }

    /** @return list<Message> */
    private function appendMessages(Conversation $conversation, int $count): array
    {
        $messages = [];
        $start = now()->subMinutes($count);
        for ($index = 0; $index < $count; $index++) {
            $message = new Message([
                'conversation_id' => $conversation->id,
                'role' => $index % 2 === 0 ? 'user' : 'assistant',
                'content' => "Message {$index}",
            ]);
            $message->created_at = $start->copy()->addMinutes($index);
            $message->save();
            $messages[] = $message;
        }

        return $messages;
    }

    private function assignRole(User $user, string $name): void
    {
        $roleId = DB::table('roles')->where('name', $name)->value('id');
        if (! $roleId) {
            $roleId = (string) Str::uuid();
            DB::table('roles')->insert(['id' => $roleId, 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId, 'created_at' => now()]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'History user',
            'email' => 'history-'.Str::uuid().'@example.test',
            'password' => 'password',
        ]);
    }
}
