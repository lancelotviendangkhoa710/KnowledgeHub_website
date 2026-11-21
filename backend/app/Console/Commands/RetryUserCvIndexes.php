<?php

namespace App\Console\Commands;

use App\Models\UserCv;
use App\Models\UserCvIndex;
use App\Services\AI\CvRagService;
use Illuminate\Console\Command;

class RetryUserCvIndexes extends Command
{
    protected $signature = 'ai:retry-cv-indexes';
    protected $description = 'Synchronously retry pending or failed active CV indexes';

    public function handle(CvRagService $rag): int
    {
        $failed = false;
        UserCv::query()->where('status', 'active')->orderBy('id')->each(function (UserCv $cv) use ($rag, &$failed): void {
            $index = UserCvIndex::query()->where('user_cv_id', $cv->id)->first();
            if ($index === null || in_array($index->status, ['pending', 'failed'], true)) {
                try { $rag->index($cv); } catch (\RuntimeException) { $failed = true; }
            }
        });
        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
