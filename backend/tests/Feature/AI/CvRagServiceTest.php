<?php

namespace Tests\Feature\AI;

use App\Models\User;
use App\Models\UserCv;
use App\Models\UserCvChunk;
use App\Models\UserCvIndex;
use App\Services\AI\CvRagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class CvRagServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_scoped_exact_vector_retrieval_and_cv_delete_cascade(): void
    {
        config()->set('services.ai.cv_rag_enabled', true);
        config()->set('services.ai.url', 'http://ai-service:8000');
        config()->set('services.ai.token', 'test-token');

        $owner = $this->user();
        $other = $this->user();
        $ownerIndex = $this->readyIndex($this->cv($owner));
        $otherIndex = $this->readyIndex($this->cv($other));
        $vector = array_fill(0, 384, 0.1);
        $this->chunk($ownerIndex, 'Owner CV fact.', $vector);
        $this->chunk($otherIndex, 'Other user secret.', $vector);

        Http::fake([
            'http://ai-service:8000/v1/cv-rag/embed-query' => Http::response([
                'model' => CvRagService::MODEL, 'revision' => CvRagService::REVISION, 'embedding' => $vector,
            ]),
            'http://ai-service:8000/v1/cv-rag/answer' => Http::response(['answer' => 'Grounded answer.']),
        ]);

        $result = app(CvRagService::class)->answer($owner, 'What is my experience?');

        $this->assertSame('Grounded answer.', $result['content']);
        $this->assertSame('Owner CV fact.', $result['meta']['citations'][0]['excerpt']);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v1/cv-rag/embed-query'));

        $ownerIndex->cv->delete();
        $this->assertDatabaseMissing('user_cv_indexes', ['id' => $ownerIndex->id]);
        $this->assertDatabaseMissing('user_cv_chunks', ['user_cv_index_id' => $ownerIndex->id]);
        $this->assertDatabaseHas('user_cv_chunks', ['user_cv_index_id' => $otherIndex->id]);
    }

    private function user(): User
    {
        return User::query()->create(['name' => 'CV RAG user', 'email' => Str::uuid().'@example.test', 'password' => 'password']);
    }

    private function cv(User $user): UserCv
    {
        return UserCv::query()->create([
            'user_id' => $user->id, 'object_key' => 'cvs/'.Str::uuid().'.pdf', 'filename' => 'cv.pdf',
            'size_bytes' => 1, 'consented_at' => now(), 'status' => 'active', 'extracted_text' => 'CV text',
        ]);
    }

    private function readyIndex(UserCv $cv): UserCvIndex
    {
        return UserCvIndex::query()->create([
            'user_cv_id' => $cv->id, 'status' => 'ready', 'embedding_model' => CvRagService::MODEL,
            'embedding_revision' => CvRagService::REVISION, 'embedding_dimensions' => 384,
            'content_hash' => hash('sha256', $cv->extracted_text), 'indexed_at' => now(),
        ]);
    }

    /** @param list<float> $vector */
    private function chunk(UserCvIndex $index, string $content, array $vector): void
    {
        UserCvChunk::query()->create([
            'user_cv_index_id' => $index->id, 'position' => 0, 'page' => 1, 'content_hash' => hash('sha256', $content),
            'content' => $content, 'embedding' => '['.implode(',', $vector).']',
        ]);
    }
}
