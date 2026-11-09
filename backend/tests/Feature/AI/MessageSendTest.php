<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessageSendTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_disabled_returns_503_and_persists_nothing(): void
    {
        $this->configureAi(['services.ai.chat_enabled' => false]);
        Http::fake();
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Hello companion'])
            ->assertStatus(503)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('code', 'chat_disabled')
            ->assertJsonPath('message', 'AI Companion chat is not enabled yet.');

        $this->assertDatabaseCount('messages', 0);
        $this->assertNull($conversation->fresh()->title);
        Http::assertNothingSent();
    }

    public function test_successful_reply_persists_the_pair_and_sets_the_title(): void
    {
        $this->configureAi();
        $this->fakeChatReply('Start with SQL basics.');
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);
        $clientMessageId = (string) Str::uuid();

        $this->postJson($this->messagesUrl($conversation), [
            'content' => 'How do I start learning SQL?',
            'client_message_id' => $clientMessageId,
        ])->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user_message.role', 'user')
            ->assertJsonPath('data.user_message.content', 'How do I start learning SQL?')
            ->assertJsonPath('data.user_message.metadata.client_message_id', $clientMessageId)
            ->assertJsonPath('data.assistant_message.role', 'assistant')
            ->assertJsonPath('data.assistant_message.content', 'Start with SQL basics.')
            ->assertJsonPath('data.assistant_message.metadata.provider', 'deepseek');

        $this->assertDatabaseCount('messages', 2);
        $rows = Message::query()->where('conversation_id', $conversation->id)->orderBy('created_at')->orderBy('id')->get();
        $this->assertSame(['user', 'assistant'], $rows->pluck('role')->all());
        $this->assertTrue($rows[0]->created_at->lt($rows[1]->created_at));
        $this->assertSame(Str::limit('How do I start learning SQL?', 120), $conversation->fresh()->title);

        Http::assertSent(static function (Request $request): bool {
            return $request->url() === 'https://ai.example/v1/chat'
                && $request->hasHeader('X-Service-Token', 'internal-secret')
                && $request['messages'] === [['role' => 'user', 'content' => 'How do I start learning SQL?']]
                && $request['memory'] === [];
        });
    }

    public function test_active_memory_is_forwarded_as_data(): void
    {
        $this->configureAi();
        $this->fakeChatReply();
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $conversation = $this->createConversation($user);
        $this->insertMemory($user, 'Prefers short answers', 'active', null);
        $this->insertMemory($user, 'Expired preference', 'active', now()->subDay());
        $this->insertMemory($user, 'Superseded fact', 'superseded', null);

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Recommend a next step'])->assertCreated();

        Http::assertSent(static fn (Request $request): bool => $request['memory'] === ['Prefers short answers']);
    }

    public function test_provider_failure_returns_502_without_persisting_rows(): void
    {
        $this->configureAi();
        Http::fake([
            'ai.example/*' => Http::response(['detail' => ['code' => 'invalid_provider_response', 'request_id' => 'abc']], 502),
        ]);
        Sanctum::actingAs($user = $this->createUser());
        $conversation = $this->createConversation($user);

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Hello companion'])
            ->assertStatus(502)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'AI Companion failed to reply. Please retry.');

        $this->assertDatabaseCount('messages', 0);
        $this->assertNull($conversation->fresh()->title);
    }

    public function test_provider_timeout_returns_504_without_persisting_rows(): void
    {
        $this->configureAi();
        Http::fake(['ai.example/*' => Http::response(['detail' => ['code' => 'timeout']], 504)]);
        Sanctum::actingAs($user = $this->createUser());
        $conversation = $this->createConversation($user);

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Hello companion'])
            ->assertStatus(504)
            ->assertJsonPath('message', 'AI Companion timed out. Please retry.');

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_guest_cannot_send_a_message(): void
    {
        $this->configureAi();
        $this->fakeChatReply();
        $conversation = $this->createConversation($this->createUser());

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Hello'])->assertUnauthorized();
        $this->assertDatabaseCount('messages', 0);
    }

    public function test_foreign_conversation_is_not_found(): void
    {
        $this->configureAi();
        $this->fakeChatReply();
        $owner = $this->createUser();
        $conversation = $this->createConversation($owner);
        Sanctum::actingAs($this->createUser());

        $this->postJson($this->messagesUrl($conversation), ['content' => 'Hello'])->assertNotFound();
        $this->assertDatabaseCount('messages', 0);
    }

    public function test_invalid_content_and_client_message_id_are_rejected(): void
    {
        $this->configureAi();
        Sanctum::actingAs($user = $this->createUser());
        $conversation = $this->createConversation($user);

        $this->postJson($this->messagesUrl($conversation), ['content' => '   ', 'client_message_id' => 'not-a-uuid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['content', 'client_message_id']);
        $this->assertDatabaseCount('messages', 0);
    }

    public function test_sends_are_limited_after_twenty_messages(): void
    {
        $this->configureAi();
        $this->fakeChatReply();
        Sanctum::actingAs($user = $this->createUser());
        $conversation = $this->createConversation($user);

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->postJson($this->messagesUrl($conversation), ['content' => "Message {$attempt}"])->assertCreated();
        }

        $this->postJson($this->messagesUrl($conversation), ['content' => 'One too many'])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After');
        $this->assertDatabaseCount('messages', 40);
    }

    public function test_duplicate_client_message_id_replays_the_stored_pair(): void
    {
        $this->configureAi();
        $this->fakeChatReply();
        Sanctum::actingAs($user = $this->createUser());
        $conversation = $this->createConversation($user);
        $clientMessageId = (string) Str::uuid();

        $first = $this->postJson($this->messagesUrl($conversation), [
            'content' => 'First wording', 'client_message_id' => $clientMessageId,
        ])->assertCreated();
        $second = $this->postJson($this->messagesUrl($conversation), [
            'content' => 'Retried wording', 'client_message_id' => $clientMessageId,
        ])->assertCreated();

        $this->assertSame($first->json('data.user_message.id'), $second->json('data.user_message.id'));
        $this->assertSame($first->json('data.assistant_message.id'), $second->json('data.assistant_message.id'));
        $this->assertDatabaseCount('messages', 2);
        $this->assertSame(1, Message::query()->where('role', 'user')->count());
        Http::assertSentCount(1);
    }

    private function messagesUrl(Conversation $conversation): string
    {
        return '/api/ai/conversations/'.$conversation->id.'/messages';
    }

    private function configureAi(array $overrides = []): void
    {
        config(array_merge([
            'services.ai.url' => 'https://ai.example',
            'services.ai.token' => 'internal-secret',
            'services.ai.chat_enabled' => true,
            'services.ai.chat_timeout' => 40,
            'services.ai.chat_history_limit' => 20,
            'services.ai.chat_memory_limit' => 10,
        ], $overrides));
    }

    private function fakeChatReply(string $content = 'A helpful answer.'): void
    {
        Http::fake([
            'ai.example/*' => Http::response([
                'reply' => ['content' => $content],
                'meta' => ['provider' => 'deepseek', 'configured_model' => 'deepseek-flash', 'model_version' => 'deepseek-flash'],
            ]),
        ]);
    }

    private function createConversation(User $user): Conversation
    {
        return Conversation::query()->create([
            'user_id' => $user->id,
            'title' => null,
        ]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'Chat user',
            'email' => 'chat-'.Str::uuid().'@example.test',
            'password' => 'password',
        ]);
    }

    private function insertMemory(User $user, string $content, string $status, mixed $expiresAt): void
    {
        DB::table('user_memories')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'memory_type' => 'preference',
            'content' => $content,
            'status' => $status,
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
