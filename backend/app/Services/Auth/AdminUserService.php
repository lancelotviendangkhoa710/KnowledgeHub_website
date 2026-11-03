<?php

namespace App\Services\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminUserService
{
    public function __construct(private DatabaseManager $database, private ProfileService $profiles) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return User::query()
            ->with('roles')
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->whereHas('roles', fn ($r) => $r->where('name', $role)))
            ->when($filters['search'] ?? null, function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereRaw('LOWER(name) LIKE LOWER(?)', [$like])->orWhereRaw('LOWER(email) LIKE LOWER(?)', [$like]));
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 20))
            ->withQueryString();
    }

    /**
     * Change a user's account status. Moving a user out of `active` also
     * revokes every token so access stops immediately.
     */
    public function changeStatus(User $target, string $status): User
    {
        $this->database->transaction(function () use ($target, $status): void {
            // Admin-count checks serialize on the admin role row (taken before any
            // user row in every flow, to avoid deadlocks).
            $this->database->table('roles')->where('name', 'admin')->lockForUpdate()->value('id');
            $locked = User::query()->whereKey($target->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status === 'pending' && $status !== 'active') {
                throw ValidationException::withMessages([
                    'status' => ['A pending account can only be activated.'],
                ]);
            }

            if ($status !== 'active' && $locked->status === 'active' && $locked->roles()->where('name', 'admin')->exists()
                && ! User::query()->where('status', 'active')->whereKeyNot($locked->getKey())
                    ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))->exists()) {
                throw ValidationException::withMessages([
                    'status' => ['The last active administrator cannot be deactivated.'],
                ]);
            }

            $locked->status = $status;
            $locked->save();

            if ($status !== 'active') {
                $locked->tokens()->delete();
            }
        });

        return $target->refresh()->load('roles');
    }

    /**
     * Replace the target's single role (AUTH-03). Granting or revoking `admin`
     * needs the acting admin's password; the platform always keeps one active
     * admin; the target's tokens are revoked so the old role stops working.
     */
    public function changeRole(User $actor, User $target, string $role, ?string $password): User
    {
        $this->database->transaction(function () use ($actor, $target, $role, $password): void {
            // Same lock order as changeStatus/deleteAccount: admin role row first, then the user row.
            $this->database->table('roles')->where('name', 'admin')->lockForUpdate()->value('id');
            // Lock actor and target together in id order so two admins acting on each other cannot deadlock.
            $rows = User::query()->whereIn('id', [$actor->getKey(), $target->getKey()])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $lockedActor = $rows->get($actor->getKey());
            $locked = $rows->get($target->getKey());

            // The policy ran before this transaction; the actor may have been demoted since.
            if ($locked === null) {
                throw (new ModelNotFoundException)->setModel(User::class, [$target->getKey()]);
            }
            if ($lockedActor === null || $lockedActor->status !== 'active' || ! $lockedActor->roles()->where('name', 'admin')->exists()) {
                throw new AuthorizationException;
            }

            if (! in_array($locked->status, ['active', 'inactive'], true)) {
                throw ValidationException::withMessages(['role' => ['Only active or inactive accounts can change role.']]);
            }

            // user_roles can hold several rows for legacy accounts, so read them all.
            $current = $locked->roles()->pluck('name')->all();
            if ($current === [$role]) {
                return;
            }
            $hadAdmin = in_array('admin', $current, true);

            $roleId = Role::where('name', $role)->value('id');
            if ($roleId === null) {
                throw ValidationException::withMessages(['role' => ['The selected role is not available.']]);
            }

            if ($hadAdmin || $role === 'admin') {
                $this->profiles->assertPassword($lockedActor, (string) $password);
            }

            if ($hadAdmin && $role !== 'admin' && ! User::query()->where('status', 'active')->whereKeyNot($locked->getKey())
                ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))->exists()) {
                throw ValidationException::withMessages(['role' => ['The last administrator cannot lose the admin role.']]);
            }

            $locked->roles()->sync([$roleId]);
            $locked->tokens()->delete();

            // shortcut: app log instead of an audit table, until the team approves one.
            $this->database->afterCommit(fn () => Log::info('user role changed', ['actor' => $actor->id, 'target' => $locked->id, 'from' => $current, 'to' => $role]));
        });

        return $target->refresh()->load('roles');
    }
}
