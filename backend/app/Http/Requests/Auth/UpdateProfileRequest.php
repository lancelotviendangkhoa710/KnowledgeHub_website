<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    /** Fields a user may change on their own profile. */
    private const ALLOWED = ['name'];

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * Reject, rather than silently ignore, any attempt to send fields outside
     * the allowlist (role, status, email, id, timestamps, ...).
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), self::ALLOWED) as $field) {
                $validator->errors()->add($field, 'This field cannot be changed.');
            }
        }];
    }
}
