<?php

namespace App\Services\AI;

use App\Models\{Conversation, Message, NotebookDocument, NotebookDocumentChunk, User};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\{DB, Http, Storage};
use Illuminate\Support\Str;
use RuntimeException;

class NotebookService
{
    private const RETRIEVAL_LIMIT = 5;

    public function list(User $user, string $conversationId): Collection
    {
        $this->notebook($user, $conversationId);

        return NotebookDocument::query()->where('conversation_id', $conversationId)->latest()->get()
            ->map(fn (NotebookDocument $document) => $this->data($document));
    }

    public function data(NotebookDocument $document): array
    {
        return [
            'id' => $document->id, 'conversation_id' => $document->conversation_id,
            'original_filename' => $document->original_filename, 'size_bytes' => $document->size_bytes,
            'status' => $document->status, 'error_message' => $document->status === 'failed' ? $document->error_message : null,
            'title' => $document->title, 'summary' => $document->summary, 'chunk_count' => $document->chunk_count,
            'notebook_title' => $document->conversation?->title,
            'created_at' => $document->created_at?->toISOString(), 'updated_at' => $document->updated_at?->toISOString(),
        ];
    }

    public function ingest(User $user, string $conversationId, UploadedFile $file): NotebookDocument
    {
        $notebook = $this->notebook($user, $conversationId);
        $isFirst = ! $notebook->notebookDocuments()->exists();
        $documentId = (string) Str::uuid();
        $document = NotebookDocument::query()->create([
            'id' => $documentId, 'user_id' => $user->id, 'conversation_id' => $notebook->id,
            'original_filename' => $file->getClientOriginalName() ?: 'document.pdf',
            'storage_path' => "notebook/{$user->id}/{$documentId}/source.pdf",
            'size_bytes' => $file->getSize(), 'status' => 'processing', 'chunk_count' => 0,
        ]);

        try {
            Storage::disk('notebook')->putFileAs(dirname($document->storage_path), $file, basename($document->storage_path));
            $stream = fopen($file->getRealPath(), 'rb');
            $response = Http::withHeader('X-Service-Token', (string) config('services.ai.token'))->timeout(90)
                ->attach('file', $stream, $document->original_filename, ['Content-Type' => 'application/pdf'])
                ->post(rtrim(AiServiceUrl::configured(), '/').'/v1/notebook/ingest');
            fclose($stream);
            if ($response->failed()) throw new RuntimeException('Không thể xử lý PDF.');
            $payload = $response->json();
            if (($payload['dimensions'] ?? 0) !== 384 || ! is_array($payload['chunks'] ?? null)) {
                throw new RuntimeException('Phản hồi xử lý tài liệu không hợp lệ.');
            }

            DB::transaction(function () use ($document, $payload, $notebook, $isFirst): void {
                foreach ($payload['chunks'] as $chunk) {
                    NotebookDocumentChunk::query()->create([
                        'id' => (string) Str::uuid(), 'document_id' => $document->id, 'position' => $chunk['position'],
                        'page' => $chunk['page'], 'content' => $chunk['content'],
                        'content_hash' => hash('sha256', $chunk['content']), 'embedding' => '['.implode(',', $chunk['embedding']).']',
                    ]);
                }
                $document->update(['status' => 'ready', 'title' => $payload['title'], 'summary' => $payload['summary'],
                    'chunk_count' => count($payload['chunks']), 'error_message' => null]);
                if ($isFirst && ! empty($payload['title'])) {
                    Conversation::query()->whereKey($notebook->id)->whereNull('title')->update([
                        'title' => Str::limit(trim((string) $payload['title']), 120, ''),
                    ]);
                }
            });
        } catch (\Throwable) {
            $document->update(['status' => 'failed', 'error_message' => 'Không thể xử lý tài liệu.']);
        }

        return $document->fresh()->load('conversation');
    }

    public function delete(User $user, NotebookDocument $document): void
    {
        abort_unless($document->user_id === $user->id, 404);
        try {
            if (! Storage::disk('notebook')->delete($document->storage_path)) throw new RuntimeException;
        } catch (\Throwable) {
            throw new RuntimeException('Không thể xóa tệp.');
        }
        $document->delete();
    }

    public function query(User $user, string $conversationId, string $question, array $documentIds): array
    {
        $notebook = $this->notebook($user, $conversationId);
        $documents = NotebookDocument::query()->where('conversation_id', $notebook->id)->where('status', 'ready')
            ->when($documentIds, fn ($query) => $query->whereIn('id', $documentIds))->get();
        $answer = 'Không tìm thấy thông tin trong tài liệu đã chọn.';
        $citations = [];

        if ($documents->isNotEmpty()) {
            $embeddingResponse = Http::withHeader('X-Service-Token', (string) config('services.ai.token'))
                ->post(rtrim(AiServiceUrl::configured(), '/').'/v1/cv-rag/embed-query', ['query' => $question]);
            $vector = $embeddingResponse->json('embedding');
            if ($embeddingResponse->failed() || ! is_array($vector) || count($vector) !== 384) {
                throw new RuntimeException('Dịch vụ tìm kiếm tài liệu tạm thời không khả dụng.', 503);
            }
            $value = '['.implode(',', $vector).']';
            $candidates = $documents->flatMap(fn (NotebookDocument $document) => NotebookDocumentChunk::query()
                ->where('document_id', $document->id)->select('*')
                ->selectRaw('1 - (embedding OPERATOR(extensions.<=>) ?::extensions.vector) AS similarity', [$value])
                ->orderByRaw('embedding OPERATOR(extensions.<=>) ?::extensions.vector', [$value])
                ->limit(self::RETRIEVAL_LIMIT)->get());
            $chunks = $this->fairChunks($candidates);
            if ($chunks->isNotEmpty()) {
                $names = $documents->keyBy('id');
                $chunkPayload = $chunks->map(fn (NotebookDocumentChunk $chunk) => [
                    'content' => $chunk->content, 'page' => $chunk->page,
                    'filename' => $names[$chunk->document_id]->original_filename,
                ])->values()->all();
                $metadata = $chunks->pluck('document_id')->unique()->map(fn (string $documentId) => [
                    'id' => $documentId, 'filename' => $names[$documentId]->original_filename,
                    'title' => $names[$documentId]->title,
                ])->values()->all();
                $answerResponse = Http::withHeader('X-Service-Token', (string) config('services.ai.token'))
                    ->post(rtrim(AiServiceUrl::configured(), '/').'/v1/notebook/answer', [
                        'question' => $question, 'documents' => $metadata, 'chunks' => $chunkPayload,
                    ]);
                $reply = $answerResponse->json('answer');
                if ($answerResponse->failed() || ! is_string($reply) || trim($reply) === '') {
                    throw new RuntimeException('Dịch vụ trả lời tài liệu tạm thời không khả dụng.', 503);
                }
                $answer = $reply;
                $citations = $chunks->map(fn (NotebookDocumentChunk $chunk) => [
                    'document_id' => $chunk->document_id, 'filename' => $names[$chunk->document_id]->original_filename,
                    'page' => $chunk->page,
                ])->unique(fn (array $citation) => $citation['document_id'].'|'.$citation['page'])->values()->all();
            }
        }

        return DB::transaction(function () use ($notebook, $question, $answer, $citations): array {
            $notebook = Conversation::query()->whereKey($notebook->id)->lockForUpdate()->firstOrFail();
            $created = now()->startOfSecond();
            $next = ((int) Message::query()->where('conversation_id', $notebook->id)->max('sequence')) + 1;
            $userMessage = Message::query()->create(['conversation_id' => $notebook->id, 'role' => 'user', 'content' => $question, 'sequence' => $next, 'created_at' => $created]);
            $assistantMessage = Message::query()->create(['conversation_id' => $notebook->id, 'role' => 'assistant', 'content' => $answer, 'metadata' => ['citations' => $citations], 'sequence' => $next + 1, 'created_at' => $created->copy()->addSecond()]);
            $notebook->updated_at = $assistantMessage->created_at;
            $notebook->save();
            return ['answer' => $answer, 'citations' => $citations, 'chat_history' => [$userMessage, $assistantMessage], 'conversation_title' => $notebook->title];
        });
    }

    private function notebook(User $user, string $id): Conversation
    {
        return Conversation::query()->whereKey($id)->where('user_id', $user->id)->where('mode', 'notebook')->firstOrFail();
    }

    private function fairChunks(Collection $candidates): Collection
    {
        $best = $candidates->groupBy('document_id')->map(fn (Collection $chunks) => $chunks->sortByDesc('similarity')->first())
            ->values()->sortByDesc('similarity')->values();
        return $best->concat($candidates->sortByDesc('similarity')->reject(fn (NotebookDocumentChunk $chunk) => $best->contains('id', $chunk->id)))
            ->take(self::RETRIEVAL_LIMIT)->values();
    }
}
