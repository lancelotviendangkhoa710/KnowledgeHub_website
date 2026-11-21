<?php

namespace App\Http\Requests\AI;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmAdminAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->status === 'active' && $this->user()->can('viewAny', User::class);
    }

    public function rules(): array
    {
        return ['approval_id' => ['required', 'uuid'], 'accepted' => ['required', 'accepted'],
            'current_password' => ['sometimes', 'nullable', 'string', 'max:255']];
    }
}
