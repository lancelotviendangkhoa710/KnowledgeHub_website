<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PurgeAgentWorkflowState extends Command
{
    protected $signature = 'ai:purge-agent-workflow-state';
    protected $description = 'Remove expired AI agent confirmation claims and old approval records';

    public function handle(): int
    {
        // A confirmation claim has no CV data. Keep it one day past expiry to
        // reject immediate replays, then purge by an indexed expiry predicate.
        if (Schema::hasTable('ai_cv_confirmations')) {
            DB::table('ai_cv_confirmations')->where('expires_at', '<', now()->subDay())->delete();
        }
        // Retain completed Admin approval metadata for 90 days for incident review.
        if (Schema::hasTable('ai_agent_approvals')) {
            DB::table('ai_agent_approvals')->where('expires_at', '<', now()->subDays(90))->delete();
        }
        return self::SUCCESS;
    }
}
