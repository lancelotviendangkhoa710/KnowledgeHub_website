<?php

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class CreateTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Tags can be created by Contributors or Admins
        $user = $this->user();
        if (!$user) {
            return false;
        }

        if (isset($user->role) && in_array($user->role, ['contributor', 'admin'], true)) {
            return true;
        }

        if (method_exists($user, 'hasRole') && ($user->hasRole('contributor') || $user->hasRole('admin'))) {
            return true;
        }

        return \Illuminate\Support\Facades\DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $user->id)
            ->whereIn('roles.name', ['contributor', 'admin'])
            ->exists();
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:100|unique:tags,slug',
        ];
    }
}

