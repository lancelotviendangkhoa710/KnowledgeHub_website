<?php

namespace App\Policies;

use App\Models\RoadmapItem;
use App\Models\LearningRoadmap;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RoadmapPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, LearningRoadmap $roadmap): bool
    {
        return $roadmap->user_id === $user->id || $this->isAdmin($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, LearningRoadmap $roadmap): bool
    {
        return $this->view($user, $roadmap);
    }

    public function delete(User $user, LearningRoadmap $roadmap): bool
    {
        return $this->view($user, $roadmap);
    }

    public function manageItem(User $user, RoadmapItem $item): bool
    {
        return $this->view($user, $item->roadmap);
    }

    public function viewProgress(User $user, RoadmapItem $item): bool
    {
        return $item->roadmap->user_id === $user->id || $this->isAdmin($user);
    }

    public function updateProgress(User $user, RoadmapItem $item): bool
    {
        return $this->viewProgress($user, $item);
    }

    public function managePrerequisites(User $user, RoadmapItem $item): bool
    {
        return $this->viewProgress($user, $item);
    }

    public function isAdmin(User $user): bool
    {
        return DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $user->id)
            ->where('roles.name', 'admin')
            ->exists();
    }
}