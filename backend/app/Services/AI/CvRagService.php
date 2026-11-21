<?php

namespace App\Services\AI;

use App\Models\User;
use App\Models\UserCv;
use App\Models\UserCvChunk;
use App\Models\UserCvIndex;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/** Laravel owns owner selection, vector retrieval, and persisted citations. */
class CvRagService
{
    public const MODEL = 'intfloat/multilingual-e5-small';
    // Immutable Hugging Face revision; do not replace with a branch/tag.
    public const REVISION = 'fd1525a9fd15316a2d503bf26ab031a61d056e98';
    private const DIMENSIONS = 384;

    public function prepare(UserCv $cv): void
    {
        if ($cv->status !== 'active') {
            return;
        }
        UserCvIndex::query()->updateOrCreate(['user_cv_id' => $cv->id], [
            'status' => 'processing',
            'embedding_model' => self::MODEL,
            'embedding_revision' => self::REVISION,
            'embedding_dimensions' => self::DIMENSIONS,
            'content_hash' => hash('sha256', (string) $cv->extracted_text),
            'indexed_at' => null,
        ]);
    }

    public function index(UserCv $cv): void
    {
        if ($cv->status !== 'active' || ! is_string($cv->extracted_text) || trim($cv->extracted_text) === '') return;
        $hash = hash('sha256', $cv->extracted_text);
        $this->prepare($cv);
        $index = UserCvIndex::query()->where('user_cv_id', $cv->id)->firstOrFail();
        $index->update(['status' => 'processing', 'content_hash' => $hash, 'indexed_at' => null]);
        try {
            $payload = $this->post('/v1/cv-rag/index', ['pages' => $this->pages($cv->extracted_text)]);
            if (($payload['model'] ?? null) !== self::MODEL || ($payload['revision'] ?? null) !== self::REVISION
                || ($payload['dimensions'] ?? null) !== self::DIMENSIONS) {
                throw new RuntimeException('CV RAG returned an incompatible model.', 502);
            }
            $chunks = $this->validChunks($payload['chunks'] ?? null);
            DB::transaction(function () use ($index, $chunks): void {
                $locked = UserCvIndex::query()->lockForUpdate()->findOrFail($index->id);
                UserCvChunk::query()->where('user_cv_index_id', $locked->id)->delete();
                foreach ($chunks as $chunk) {
                    UserCvChunk::query()->create([
                        'id' => (string) Str::uuid(), 'user_cv_index_id' => $locked->id, 'position' => $chunk['position'],
                        'page' => $chunk['page'], 'content' => $chunk['content'],
                        'content_hash' => hash('sha256', $chunk['content']), 'embedding' => '['.implode(',', $chunk['embedding']).']',
                    ]);
                }
                $locked->update(['status' => 'ready', 'indexed_at' => now()]);
            });
        } catch (\Throwable $exception) {
            UserCvIndex::query()->whereKey($index->id)->update(['status' => 'failed', 'indexed_at' => null]);
            Log::warning('ai.cv_rag_index_failed', ['category' => 'indexing']);
            throw new RuntimeException('CV indexing is temporarily unavailable.', 503, $exception);
        }
    }

    public function summarize(UserCv $cv): void
    {
        if (! is_string($cv->extracted_text) || trim($cv->extracted_text) === '') {
            throw new RuntimeException('Notebook source text is invalid.', 422);
        }
        $payload = $this->post('/v1/cv-rag/summarize', ['text' => $cv->extracted_text]);
        $title = is_string($payload['title'] ?? null) ? trim($payload['title']) : '';
        $summary = is_string($payload['summary'] ?? null) ? trim($payload['summary']) : '';
        if ($title === '' || mb_strlen($title) > 255 || $summary === '' || mb_strlen($summary) > 5000) {
            throw new RuntimeException('Notebook summary is invalid.', 502);
        }
        $cv->update(['title' => $title, 'summary' => $summary]);
    }

    /** @return array{content:string,meta:array<string,mixed>} */
    public function answer(User $user, string $question, array $history = []): array
    {
        if (! (bool) config('services.ai.cv_rag_enabled', false)) throw new RuntimeException('CV RAG is not enabled yet.', 503);
        $cv = UserCv::query()->where('user_id', $user->id)->where('status', 'active')->first();
        if ($cv === null) $this->conflict('No active CV is available.');
        $index = UserCvIndex::query()->where('user_cv_id', $cv->id)->where('status', 'ready')
            ->where('embedding_model', self::MODEL)->where('embedding_revision', self::REVISION)->first();
        if ($index === null) $this->conflict('CV index is not ready.');
        $embedding = $this->queryEmbedding($question);
        $threshold = max(0, min(1, (float) config('services.ai.cv_rag_similarity_threshold', .72)));
        $vector = '['.implode(',', $embedding).']';
        $chunks = UserCvChunk::query()->where('user_cv_index_id', $index->id)
            ->select('*')->selectRaw('1 - (embedding OPERATOR(extensions.<=>) ?::extensions.vector) AS similarity', [$vector])
            ->orderByRaw('embedding OPERATOR(extensions.<=>) ?::extensions.vector', [$vector])->limit(3)->get()
            ->filter(fn (UserCvChunk $chunk): bool => (float) $chunk->similarity >= $threshold)->values();
        if ($chunks->isEmpty()) return ['content' => 'Không tìm thấy thông tin trong CV.', 'meta' => ['citations' => []]];
        $reply = $this->post('/v1/cv-rag/answer', ['question' => $question, 'history' => array_slice($history, -19), 'chunks' => $chunks->map(fn ($chunk) => ['content' => $chunk->content, 'page' => $chunk->page])->all()]);
        $content = is_string($reply['answer'] ?? null) ? trim($reply['answer']) : '';
        if ($content === '' || mb_strlen($content) > 16000) throw new RuntimeException('AI Companion returned an invalid response.', 502);
        return ['content' => $content, 'meta' => ['provider' => 'deepseek', 'citations' => $chunks->map(fn ($chunk) => [
            'cv_id' => $cv->id, 'cv_version' => $index->content_hash, 'page' => $chunk->page,
            'excerpt' => Str::limit($chunk->content, 300, ''), 'chunk_id' => $chunk->id,
            'embedding_model' => self::MODEL, 'embedding_revision' => self::REVISION, 'similarity' => round((float) $chunk->similarity, 6),
        ])->all()]];
    }

    /** @return list<float> */
    private function queryEmbedding(string $question): array
    {
        $payload = $this->post('/v1/cv-rag/embed-query', ['query' => $question]);
        if (($payload['model'] ?? null) !== self::MODEL || ($payload['revision'] ?? null) !== self::REVISION) {
            throw new RuntimeException('CV RAG returned an incompatible model.', 502);
        }
        return $this->validVector($payload['embedding'] ?? null);
    }

    /** @return list<array{page:int,text:string}> */
    private function pages(string $text): array
    {
        $pages = array_values(array_filter(array_map('trim', explode("\f", $text)), static fn (string $page): bool => $page !== ''));
        if ($pages === [] || count($pages) > 30) {
            throw new RuntimeException('CV source text is invalid for indexing.', 422);
        }
        return array_map(static fn (string $page, int $offset): array => ['page' => $offset + 1, 'text' => $page], $pages, array_keys($pages));
    }
    /** @return array<string,mixed> */
    private function post(string $path, array $payload): array
    {
        $url = AiServiceUrl::configured(); $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') throw new RuntimeException('CV RAG is temporarily unavailable.', 503);
        try { $response = Http::withHeader('X-Service-Token', $token)->timeout(45)->post(rtrim($url, '/').$path, $payload); }
        catch (ConnectionException $e) { throw new RuntimeException('CV RAG is temporarily unavailable.', 503, $e); }
        if ($response->failed()) { Log::warning('ai.cv_rag_failed', ['status' => $response->status()]); throw new RuntimeException('CV RAG is temporarily unavailable.', $response->status() === 504 ? 504 : 502); }
        $data = $response->json(); if (! is_array($data)) throw new RuntimeException('CV RAG returned an invalid response.', 502); return $data;
    }
    /** @return list<array{position:int,page:int,content:string,embedding:list<float>}> */
    private function validChunks(mixed $chunks): array
    {
        if (! is_array($chunks) || count($chunks) < 1 || count($chunks) > 100) throw new RuntimeException('CV RAG returned invalid chunks.', 502);
        $result = []; foreach ($chunks as $position => $chunk) {
            if (! is_array($chunk) || ($chunk['position'] ?? null) !== $position || ! is_int($chunk['page'] ?? null)
                || $chunk['page'] < 1 || $chunk['page'] > 30 || ! is_string($chunk['content'] ?? null)
                || trim($chunk['content']) === '' || mb_strlen($chunk['content']) > 2000) {
                throw new RuntimeException('CV RAG returned invalid chunks.', 502);
            }
            $result[] = ['position' => $position, 'page' => $chunk['page'], 'content' => trim($chunk['content']), 'embedding' => $this->validVector($chunk['embedding'] ?? null)];
        } return $result;
    }
    /** @return list<float> */
    private function validVector(mixed $vector): array
    {
        if (! is_array($vector) || count($vector) !== self::DIMENSIONS || array_filter($vector, fn ($v) => ! is_int($v) && ! is_float($v))) throw new RuntimeException('CV RAG returned an invalid embedding.', 502);
        return array_map('floatval', $vector);
    }

    private function conflict(string $message): never
    {
        throw new RuntimeException($message, 409);
    }
}
