<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserCv;
use App\Services\AI\CvCleanupException;
use App\Services\AI\UserCvService;
use Illuminate\Console\Command;

class CleanupPendingUserCvs extends Command
{
    protected $signature = 'ai:cleanup-pending-cvs';
    protected $description = 'Retry deletion of pending private CV objects';

    public function handle(UserCvService $service): int
    {
        $failed = false;
        UserCv::query()->where('status', 'pending_delete')->select('user_id')->distinct()
            ->orderBy('user_id')->pluck('user_id')->each(function ($id) use ($service, &$failed): void {
                $user = User::withTrashed()->find($id);
                if ($user === null) {
                    return;
                }
                try {
                    $service->cleanupPending($user);
                } catch (CvCleanupException) {
                    $failed = true;
                }
            });
        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
