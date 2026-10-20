<?php

namespace App\Policies;

use App\Models\Article;
use App\Models\User;

class ArticlePolicy
{
    /**
     * Determine if user has any of the specified roles.
     */
    protected function hasRole(User $user, array|string $roles): bool
    {
        $roles = (array) $roles;

        // Check relation if available
        if (method_exists($user, 'roles')) {
            return $user->roles()->whereIn('name', $roles)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can view any published articles.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the specific article.
     */
    public function view(?User $user, Article $article): bool
    {
        // Anyone can view published articles
        if ($article->status === Article::STATUS_PUBLISHED) {
            return true;
        }

        // Guests cannot view unpublished articles
        if (! $user) {
            return false;
        }

        // Admins can view any article
        if ($this->hasRole($user, 'admin')) {
            return true;
        }

        // Contributors can view their own articles
        return $article->author_id === $user->id;
    }

    /**
     * Determine whether the user can create articles.
     * Only Contributors and Admins can create courses/articles.
     */
    public function create(User $user): bool
    {
        return $this->hasRole($user, ['contributor', 'admin']);
    }

    /**
     * Determine whether the user can update the article.
     * Contributors can only update their own articles; Admins can update all.
     */
    public function update(User $user, Article $article): bool
    {
        if ($this->hasRole($user, 'admin')) {
            return true;
        }

        return $this->hasRole($user, 'contributor') && $article->author_id === $user->id;
    }

    /**
     * Determine whether the user can publish the article.
     * Approved workflow: Contributor publishes own content directly; Admin can publish any.
     */
    public function publish(User $user, Article $article): bool
    {
        if ($this->hasRole($user, 'admin')) {
            return true;
        }

        return $this->hasRole($user, 'contributor') && $article->author_id === $user->id;
    }

    /**
     * Determine whether the user can archive the article.
     */
    public function archive(User $user, Article $article): bool
    {
        if ($this->hasRole($user, 'admin')) {
            return true;
        }

        return $this->hasRole($user, 'contributor') && $article->author_id === $user->id;
    }

    /**
     * Determine whether the user can delete (soft-delete) the article.
     */
    public function delete(User $user, Article $article): bool
    {
        if ($this->hasRole($user, 'admin')) {
            return true;
        }

        return $this->hasRole($user, 'contributor') && $article->author_id === $user->id;
    }
}
