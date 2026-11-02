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
                $like = '%'.addcslashes(strtolower($term), '%_\\').'%';
                $q->where(fn ($w) => $w->whereRaw('LOWER(name) LIKE ?', [$like])->orWhereRaw('LOWER(email) LIKE ?', [$like]));
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
            // Lock the row so concurrent admin actions apply in a defined order.
            $locked = User::query()->whereKey($target->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status === 'pending' && $status !== 'active') {
                throw ValidationException::withMessages([
                    'status' => ['A pending account can only be activated.'],
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
