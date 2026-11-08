<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * AI-01 conversation authorization.
 *
 * Conversations are private to their owner. There is deliberately no admin
 * bypass in V1: reading another user's chats is a privacy decision (review
 * OQ-03 / P9) that Product, Privacy and Security must approve before any role
 * gets access. The owner-scoped service query returns 404 for foreign
 * resources, so this policy is a second, defence-in-depth check.
 */
class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->user_id === $user->id;
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }

    public function delete(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }
}
