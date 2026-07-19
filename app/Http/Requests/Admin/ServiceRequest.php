<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $service = $this->route('service');
        $serviceId = $service instanceof Service ? $service->id : null;

        return [
            'unit_id' => ['required', 'ulid', Rule::exists('units', 'id')],
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'required', 'alpha_dash:ascii', 'max:120',
                Rule::unique('services')->where('unit_id', $this->string('unit_id')->toString())->ignore($serviceId),
            ],
            'standard_prefix' => ['required', 'string', 'max:8', 'regex:/^[A-Z0-9]+$/'],
            'priority_prefix' => ['required', 'string', 'max:8', 'regex:/^[A-Z0-9]+$/'],
            'priority_streak_limit' => ['required', 'integer', 'min:1', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
