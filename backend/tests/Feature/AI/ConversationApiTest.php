<?php

namespace Tests\Feature\AI;

use App\Models\Conversation;
use App\Models\NotebookDocument;
use App\Models\NotebookDocumentChunk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
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

    public function test_list_filters_chat_and_notebook_modes(): void
    {
        $owner = $this->createUser();
        $chat = $this->conversationFor($owner, 'Chat', 'chat');
        $notebook = $this->conversationFor($owner, 'Notebook', 'notebook');
        Sanctum::actingAs($owner);

        $this->getJson('/api/ai/conversations')->assertOk()->assertJsonPath('data.0.id', $chat->id)->assertJsonPath('data.0.mode', 'chat');
        $this->getJson('/api/ai/conversations?mode=notebook')->assertOk()->assertJsonPath('data.0.id', $notebook->id)->assertJsonPath('data.0.mode', 'notebook');
        $this->getJson('/api/ai/conversations?mode=invalid')->assertUnprocessable()->assertJsonValidationErrors('mode');
    }

    public function test_first_notebook_document_sets_notebook_title(): void
    {
        config()->set('services.ai.url', 'http://ai-service:8000');
        config()->set('services.ai.token', 'test-token');
        Storage::fake('notebook');
        Http::fake(['http://ai-service:8000/v1/notebook/ingest' => Http::response(['dimensions' => 384, 'title' => 'Kiến thức PostgreSQL', 'summary' => 'Summary', 'chunks' => [['position' => 0, 'page' => 1, 'content' => 'PostgreSQL basics.', 'embedding' => array_fill(0, 384, 0.1)]]])]);
        $owner = $this->createUser();
        $notebook = $this->conversationFor($owner, null, 'notebook');
        Sanctum::actingAs($owner);

        $this->post('/api/ai/notebook/documents', ['conversation_id' => $notebook->id, 'documents' => [UploadedFile::fake()->create('postgres.pdf', 10, 'application/pdf')]])
            ->assertCreated()
            ->assertJsonPath('data.0.conversation_id', $notebook->id)
            ->assertJsonPath('data.0.notebook_title', 'Kiến thức PostgreSQL');

        $this->assertDatabaseHas('conversations', ['id' => $notebook->id, 'mode' => 'notebook', 'title' => 'Kiến thức PostgreSQL']);
    }

    public function test_notebook_query_balances_two_documents_and_deduplicates_citations(): void
    {
        config()->set('services.ai.url', 'http://ai-service:8000');
        config()->set('services.ai.token', 'test-token');
        $owner = $this->createUser();
        $notebook = $this->conversationFor($owner, 'Sources', 'notebook');
        $vector = array_fill(0, 384, 0.1);
        $first = $this->readyDocument($owner, $notebook, 'copy.pdf', 'First source', $vector);
        $second = $this->readyDocument($owner, $notebook, 'copy.pdf', 'Second source', $vector);
        Http::fake([
            'http://ai-service:8000/v1/cv-rag/embed-query' => Http::response(['embedding' => $vector]),
            'http://ai-service:8000/v1/notebook/answer' => Http::response(['answer' => 'Grounded synthesis.']),
        ]);

        Sanctum::actingAs($owner);
        $this->postJson('/api/ai/notebook/query', ['conversation_id' => $notebook->id, 'question' => 'Compare sources', 'document_ids' => [$first->id, $second->id]])
            ->assertOk()
            ->assertJsonPath('data.answer', 'Grounded synthesis.')
            ->assertJsonCount(1, 'data.citations')
            ->assertJsonCount(2, 'data.chat_history')
            ->assertJsonPath('data.chat_history.0.role', 'user')
            ->assertJsonPath('data.chat_history.1.role', 'assistant')
            ->assertJsonPath('data.chat_history.1.metadata.citations.0.filename', 'copy.pdf');
        $this->assertDatabaseHas('messages', ['conversation_id' => $notebook->id, 'role' => 'user', 'content' => 'Compare sources']);
        $this->assertDatabaseHas('messages', ['conversation_id' => $notebook->id, 'role' => 'assistant', 'content' => 'Grounded synthesis.']);
        Http::assertSent(function ($request): bool {
            if (! str_ends_with($request->url(), '/v1/notebook/answer')) {
                return false;
            }
            $body = $request->data();
            return count($body['documents']) === 2
                && ! array_key_exists('chunk_count', $body['documents'][0])
                && count(array_unique(array_column($body['chunks'], 'content'))) === 2;
        });
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

    private function conversationFor(User $user, ?string $title = 'Conversation', string $mode = 'chat'): Conversation
    {
        return Conversation::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'mode' => $mode,
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

    private function readyDocument(User $user, Conversation $notebook, string $filename, string $content, array $vector): NotebookDocument
    {
        $document = NotebookDocument::query()->create(['user_id' => $user->id, 'conversation_id' => $notebook->id, 'original_filename' => $filename, 'storage_path' => 'notebook/'.Str::uuid().'.pdf', 'size_bytes' => 1, 'status' => 'ready', 'chunk_count' => 1]);
        NotebookDocumentChunk::query()->create(['document_id' => $document->id, 'position' => 0, 'page' => 1, 'content_hash' => hash('sha256', $content), 'content' => $content, 'embedding' => '['.implode(',', $vector).']']);
        return $document;
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
