<?php

namespace App\Services\AI;

use App\Models\AiAgentApproval;
use App\Models\User;
use App\Services\Auth\AdminUserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AdminAgentService
{
    public function __construct(private readonly AgentAiClient $ai, private readonly AdminUserService $users) {}

    public function plan(User $actor, array $input): array
    {
        $target = User::query()->findOrFail($input['target_user_id']);
        Gate::forUser($actor)->authorize('view', $target);
        $proposal = $this->ai->post('/v1/agents/admin/plan', ['instruction' => $input['instruction']]);
        $action = $proposal['action'] ?? null;
        $value = $proposal['value'] ?? null;
        $allowed = ['change_user_role' => ['user', 'contributor', 'admin'],
            'change_user_status' => ['active', 'inactive', 'banned']];
        if (! is_string($action) || ! is_string($value)
            || ! isset($allowed[$action]) || ! in_array($value, $allowed[$action], true)) {
            throw new RuntimeException('AI agent returned an unsupported action.', 502);
        }
        $actor = User::query()->findOrFail($actor->id);
        $target = User::query()->findOrFail($target->id);
        abort_unless($actor->status === 'active', 403);
        $ability = $action === 'change_user_role' ? 'updateRole' : 'updateStatus';
        Gate::forUser($actor)->authorize($ability, $target);
        $roles = $this->rolesHash($target);
        // Compose the preview from validated operands. LLM text is untrusted.
        $summary = $action === 'change_user_role'
            ? "Change role of {$target->name} ({$target->id}) to {$value}."
            : "Change status of {$target->name} ({$target->id}) to {$value}.";
        $approval = AiAgentApproval::create(['actor_id' => $actor->id,
            'target_user_id' => $target->id, 'action' => $action, 'value' => $value,
            'summary' => $summary, 'target_status' => $target->status,
            'target_roles_hash' => $roles, 'expires_at' => now()->addMinutes(5)]);
        try {
            Log::info('ai.admin_proposal_created', ['actor_id' => $actor->id,
                'target_user_id' => $target->id, 'action' => $action, 'approval_id' => $approval->id]);
        } catch (\Throwable) {
        }
        return ['approval_id' => $approval->id, 'action' => $action, 'value' => $value,
            'summary' => $summary, 'target_user_id' => $target->id,
            'target_name' => $target->name, 'expires_at' => $approval->expires_at->toISOString()];
    }

    public function confirm(User $actor, array $input): array
    {
        return DB::transaction(function () use ($actor, $input): array {
            // Use the same lock order as AdminUserService to avoid cross-flow deadlocks.
            DB::table('roles')->where('name', 'admin')->lockForUpdate()->value('id');
            $approval = AiAgentApproval::query()->whereKey($input['approval_id'])
                ->where('actor_id', $actor->id)->lockForUpdate()->firstOrFail();
            if ($approval->consumed_at !== null) {
                throw ValidationException::withMessages(['approval_id' => ['This approval has already been used.']]);
            }
            if ($approval->expires_at->isPast()) {
                throw ValidationException::withMessages(['approval_id' => ['This approval has expired.']]);
            }
            $freshActor = User::query()->findOrFail($actor->id);
            $target = User::query()->findOrFail($approval->target_user_id);
            abort_unless($freshActor->status === 'active', 403);
            $ability = $approval->action === 'change_user_role' ? 'updateRole' : 'updateStatus';
            Gate::forUser($freshActor)->authorize($ability, $target);
            if ($target->status !== $approval->target_status || $this->rolesHash($target) !== $approval->target_roles_hash) {
                throw ValidationException::withMessages(['approval_id' => ['The target changed. Create a new proposal.']]);
            }
            if ($approval->action === 'change_user_role' && in_array($approval->value, ['user', 'contributor', 'admin'], true)) {
                $updated = $this->users->changeRole($freshActor, $target, $approval->value, $input['current_password'] ?? null);
            } elseif ($approval->action === 'change_user_status' && in_array($approval->value, ['active', 'inactive', 'banned'], true)) {
                $updated = $this->users->changeStatus($target, $approval->value);
            } else {
                throw new RuntimeException('Unsupported approval action.', 422);
            }
            $approval->update(['consumed_at' => now()]);
            DB::afterCommit(static function () use ($approval): void {
                try {
                    Log::info('ai.admin_action_executed', ['actor_id' => $approval->actor_id,
                        'target_user_id' => $approval->target_user_id,
                        'action' => $approval->action, 'approval_id' => $approval->id]);
                } catch (\Throwable) {
                }
            });
            return ['id' => $updated->id, 'status' => $updated->status,
                'roles' => $updated->roles->pluck('name')->sort()->values()->all()];
        });
    }

    private function rolesHash(User $user): string
    {
        return hash('sha256', json_encode($user->roles()->pluck('name')->sort()->values()->all(), JSON_THROW_ON_ERROR));
    }
}
