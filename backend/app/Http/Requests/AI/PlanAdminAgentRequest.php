<?php

namespace App\Http\Requests\AI;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class PlanAdminAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->status === 'active' && $this->user()->can('viewAny', User::class);
    }

    public function rules(): array
    {
        return ['instruction' => ['required', 'string', 'min:3', 'max:500'],
            'target_user_id' => ['required', 'uuid', 'exists:users,id']];
    }
}
