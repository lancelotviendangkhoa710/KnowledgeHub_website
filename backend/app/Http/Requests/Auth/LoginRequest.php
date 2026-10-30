<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('login', User::class);
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
        ];
    }
}
