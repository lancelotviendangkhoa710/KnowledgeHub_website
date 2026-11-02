<?php

namespace App\Services\Content;

use App\Models\ArticleAttachment;
use App\Models\ArticleVersion;
use Illuminate\Database\Eloquent\Collection;

class ArticleAttachmentService
{
    /**
     * Add S3 attachment metadata for an article version.
     */
    public function addAttachment(ArticleVersion $version, array $data): ArticleAttachment
    {
        return ArticleAttachment::create([
            'article_version_id' => $version->id,
            'object_key' => $data['object_key'],
            'file_name' => $data['file_name'],
            'mime_type' => $data['mime_type'],
            'size_bytes' => $data['size_bytes'],
            'created_at' => now(),
        ]);
    }

    /**
     * List all attachments for a specific article version snapshot.
     */
    public function getAttachmentsForVersion(string $versionId): Collection
    {
        return ArticleAttachment::where('article_version_id', $versionId)
            ->orderBy('created_at', 'asc')
            ->get();
    }

    /**
     * Delete attachment metadata.
     */
    public function deleteAttachment(string $attachmentId): bool
    {
        $attachment = ArticleAttachment::find($attachmentId);
        if (!$attachment) {
            return false;
        }

        return (bool) $attachment->delete();
    }
}

