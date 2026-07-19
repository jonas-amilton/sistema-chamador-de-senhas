<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Counter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CounterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $counter = $this->route('counter');
        $counterId = $counter instanceof Counter ? $counter->id : null;
        $unitId = $this->string('unit_id')->toString();

        return [
            'unit_id' => ['required', 'ulid', Rule::exists('units', 'id')],
            'name' => ['required', 'string', 'max:120'],
            'code' => [
                'required', 'string', 'max:24',
                Rule::unique('counters')->where('unit_id', $unitId)->ignore($counterId),
            ],
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => [
                'ulid',
                Rule::exists('services', 'id')->where('unit_id', $unitId),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
