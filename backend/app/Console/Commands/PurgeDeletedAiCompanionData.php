<?php

namespace App\Console\Commands;

use App\Models\Conversation;
use App\Models\User;
use App\Models\UserMemory;
use Illuminate\Console\Command;

class PurgeDeletedAiCompanionData extends Command
{
    /**
     * Purge AI Companion rows for accounts that have been soft-deleted for N days.
     *
     * This command owns AI Companion data only. Hard-deleting the user row itself
     * (and the other domains' rows) remains Identity/Auth's decision and is
     * coordinated via the cross-domain protocol.
     */
    protected $signature = 'ai:purge-deleted-users {--days=30 : Days after soft deletion before AI data is purged}';

    protected $description = 'Purge AI Companion conversations, messages, and memories for users deleted more than N days ago';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $cutoff = now()->subDays($days);

        $conversations = 0;
        $memories = 0;
        $users = 0;

        User::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->orderBy('id')
            ->chunkById(100, function ($deletedUsers) use (&$conversations, &$memories, &$users): void {
                foreach ($deletedUsers as $user) {
                    $users++;
                    // Conversations cascade messages at the database level.
                    $conversations += Conversation::query()->where('user_id', $user->id)->delete();
                    $memories += UserMemory::query()->where('user_id', $user->id)->delete();
                }
            });

        $this->info(sprintf(
            'Purged AI Companion data for %d user(s) deleted before %s: %d conversation(s), %d memory row(s).',
            $users,
            $cutoff->toDateTimeString(),
            $conversations,
            $memories,
        ));

        return self::SUCCESS;
    }
}
