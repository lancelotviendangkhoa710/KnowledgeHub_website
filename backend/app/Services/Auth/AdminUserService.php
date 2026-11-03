<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\DatabaseManager;
use Illuminate\Validation\ValidationException;

class AdminUserService
{
    public function __construct(private DatabaseManager $database) {}

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
}
