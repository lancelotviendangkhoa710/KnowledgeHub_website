<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', 'string', Rule::in(['user', 'contributor', 'admin'])],
            // Required by the service only when admin is granted or revoked.
            'current_password' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['role', 'current_password']) as $field) {
                $validator->errors()->add($field, 'This field cannot be changed.');
            }
        }];
    }
}
