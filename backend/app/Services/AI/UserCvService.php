<?php

namespace App\Services\AI;

use App\Models\User;
use App\Models\UserCv;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class UserCvService
{
    public function __construct(private readonly CompanionRoadmapAiClient $extractor) {}

    public function current(User $user): ?UserCv
    {
        return UserCv::query()->where('user_id', $user->id)->where('status', 'active')->first();
    }

    public function download(User $user): ?array
    {
        try {
            return DB::transaction(function () use ($user): ?array {
                $this->lockOwner($user);
                $cv = $this->current($user);
                if ($cv === null) {
                    return null;
                }
                $bytes = Storage::disk('cv')->get($cv->object_key);
                if (! is_string($bytes)) {
                    throw new RuntimeException('CV download failed.');
                }
                return ['filename' => $cv->filename, 'bytes' => $bytes];
            });
        } catch (Throwable $exception) {
            throw new RuntimeException('CV storage is temporarily unavailable. Please retry.', 503, $exception);
        }
    }
    public function save(User $user, UploadedFile $file): UserCv
    {
        $text = $this->extractor->extractPdf($file);
        // Persist the cleanup marker before attempting the non-transactional upload.
        $cv = DB::transaction(function () use ($user, $file): UserCv {
            $this->lockOwner($user);
            return UserCv::create([
                'user_id' => $user->id,
                'object_key' => 'cvs/'.Str::uuid().'.pdf',
                'filename' => 'cv.pdf',
                'size_bytes' => $file->getSize(),
                'consented_at' => now(),
                'status' => 'pending_delete',
                'extracted_text' => null,
            ]);
        });
        try {
            DB::transaction(function () use ($user, $file, $cv, $text): void {
                $this->lockOwner($user);
                $row = UserCv::query()->whereKey($cv->id)->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
                $stream = fopen($file->getRealPath(), 'rb');
                if ($stream === false) {
                    throw new RuntimeException('CV storage is temporarily unavailable.');
                }
                try {
                    if (! Storage::disk('cv')->put($row->object_key, $stream) || ! Storage::disk('cv')->exists($row->object_key)) {
                        throw new RuntimeException('CV storage is temporarily unavailable.');
                    }
                } finally {
                    fclose($stream);
                }
                UserCv::query()->where('user_id', $user->id)->where('status', 'active')
                    ->update(['status' => 'pending_delete', 'extracted_text' => null, 'updated_at' => now()]);
                $row->update(['status' => 'active', 'extracted_text' => $text]);
            });
            $this->cleanupPending($user);
        } catch (Throwable $exception) {
            throw new RuntimeException('CV storage or cleanup is temporarily unavailable. Please retry.', 503, $exception);
        }
        return $cv->refresh();
    }

    public function markAllPendingForUser(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $this->lockOwner($user);
            UserCv::query()->where('user_id', $user->id)->where('status', 'active')
                ->update(['status' => 'pending_delete', 'extracted_text' => null, 'updated_at' => now()]);
        });
    }

    public function deleteAllForUser(User $user): void
    {
        $this->markAllPendingForUser($user);
        $this->cleanupPendingForUser($user);
    }

    public function cleanupPendingForUser(User $user): void
    {
        $this->cleanupPending($user, true);
    }

    public function cleanupPending(User $user, bool $rejectActive = false): void
    {
        try {
            DB::transaction(function () use ($user, $rejectActive): void {
                $this->lockOwner($user, true);
                if ($rejectActive && UserCv::query()->where('user_id', $user->id)->where('status', 'active')->exists()) {
                    throw new RuntimeException('CV cleanup must be retried.');
                }
                $rows = UserCv::query()->where('user_id', $user->id)->where('status', 'pending_delete')->lockForUpdate()->get();
                foreach ($rows as $row) {
                    $disk = Storage::disk('cv');
                    if (! $disk->delete($row->object_key) || $disk->exists($row->object_key)) {
                        throw new RuntimeException('CV cleanup failed.');
                    }
                    $row->delete();
                }
            });
        } catch (Throwable $exception) {
            throw new CvCleanupException($exception);
        }
    }

    private function lockOwner(User $user, bool $withDeleted = false): void
    {
        $query = User::query();
        if ($withDeleted) {
            $query->withTrashed();
        }
        $query->whereKey($user->id)->lockForUpdate()->firstOrFail();
    }
}
