<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('updateStatus', $this->route('user')) ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['active', 'inactive', 'banned'])],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['status']) as $field) {
                $validator->errors()->add($field, 'This field cannot be changed.');
            }
        }];
    }
}
