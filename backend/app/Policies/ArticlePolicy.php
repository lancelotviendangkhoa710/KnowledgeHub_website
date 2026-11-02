<?php

namespace App\Policies;

use App\Models\Article;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Support\Facades\DB;

class ArticlePolicy
{
    use HandlesAuthorization;

    /**
     * Safely resolve the UUID string of a user model instance.
     */
    protected function getUserId(?User $user): ?string
    {
        if (!$user) {
            return null;
        }

        return (string) ($user->getRawOriginal('id') ?: ($user->getAttributes()['id'] ?? $user->getKey()));
    }

    /**
     * Admin bypass - Admins can perform any action on articles platform-wide.
     */
    public function before(?User $user, string $ability): ?bool
    {
        if ($user && $this->userHasRole($user, 'admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether any user (including guest) can view list of published articles.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the given article.
     * - Published: visible to all (Guest, User, Contributor, Admin)
     * - Draft / Archived: visible only to the author (Contributor/Admin) or Admin
     */
    public function view(?User $user, Article $article): bool
    {
        if ($article->isPublished()) {
            return true;
        }

        $userId = $this->getUserId($user);

        if ($userId && $userId === $article->author_id && $this->userHasRole($user, 'contributor', 'admin')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create articles.
     * Contributor or Admin only.
     */
    public function create(User $user): bool
    {
        return $this->userHasRole($user, 'contributor', 'admin');
    }

    /**
     * Determine whether the user can update the article (edit draft / create new version).
     * Author (Contributor) or Admin.
     */
    public function update(User $user, Article $article): bool
    {
        $userId = $this->getUserId($user);

        return $userId === $article->author_id && $this->userHasRole($user, 'contributor', 'admin');
    }

    /**
     * Determine whether the user can publish the article.
     * Author (Contributor) or Admin.
     */
    public function publish(User $user, Article $article): bool
    {
        $userId = $this->getUserId($user);

        return $userId === $article->author_id && $this->userHasRole($user, 'contributor', 'admin');
    }

    /**
     * Determine whether the user can archive the article.
     * Author (Contributor) or Admin.
     */
    public function archive(User $user, Article $article): bool
    {
        $userId = $this->getUserId($user);

        return $userId === $article->author_id && $this->userHasRole($user, 'contributor', 'admin');
    }

    /**
     * Determine whether the user can soft delete the article.
     * Author (Contributor) or Admin.
     */
    public function delete(User $user, Article $article): bool
    {
        $userId = $this->getUserId($user);

        return $userId === $article->author_id && $this->userHasRole($user, 'contributor', 'admin');
    }

    /**
     * Check if a user possesses any of the given roles.
     * Supports:
     * 1. Dynamic User->role attribute / in-memory role
     * 2. User->hasRole() method if implemented by Identity domain
     * 3. DB query on user_roles and roles tables
     */
    public function userHasRole(?User $user, string ...$roles): bool
    {
        if (!$user) {
            return false;
        }

        if (isset($user->role) && in_array($user->role, $roles, true)) {
            return true;
        }

        if (method_exists($user, 'hasRole')) {
            foreach ($roles as $role) {
                if ($user->hasRole($role)) {
                    return true;
                }
            }
        }

        $userId = $this->getUserId($user);

        return DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $userId)
            ->whereIn('roles.name', $roles)
            ->exists();
    }
}
