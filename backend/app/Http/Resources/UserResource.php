<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Approved projection of a user. Never exposes the password hash or tokens.
 *
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'roles' => $this->roles->pluck('name')->values()->all(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
