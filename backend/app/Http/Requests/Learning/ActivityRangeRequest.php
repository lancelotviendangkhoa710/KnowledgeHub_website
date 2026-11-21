<?php

namespace App\Http\Requests\Learning;

use App\Models\LearningRoadmap;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

/** PRF-06: `from` and `to` are calendar days in Vietnam time, at most 366 days inclusive. */
class ActivityRangeRequest extends FormRequest
{
    public const MAX_DAYS = 366;

    public function authorize(): bool
    {
        return $this->user()?->can('viewOwnActivity', LearningRoadmap::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }
                $from = Carbon::createFromFormat('!Y-m-d', (string) $this->input('from'));
                $to = Carbon::createFromFormat('!Y-m-d', (string) $this->input('to'));
                if ((int) round(abs($from->diffInDays($to))) + 1 > self::MAX_DAYS) {
                    $validator->errors()->add('to', 'The range may not be longer than '.self::MAX_DAYS.' days.');
                }
            },
        ];
    }
}
