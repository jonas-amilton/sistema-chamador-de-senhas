<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CounterRequest;
use App\Models\Counter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final class CounterController extends Controller
{
    public function store(CounterRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $data = $request->validated();
            $counter = Counter::query()->create([
                ...Arr::except($data, 'service_ids'),
                'is_active' => $request->boolean('is_active', true),
            ]);
            $counter->services()->sync($data['service_ids']);
        });

        return back()->with('success', 'Guichê criado com sucesso.');
    }

    public function update(CounterRequest $request, Counter $counter): RedirectResponse
    {
        $data = $request->validated();

        if ($counter->unit_id !== $data['unit_id'] && $counter->tickets()->exists()) {
            throw new DomainConflictException('Não é possível mover um guichê que possui histórico.');
        }

        DB::transaction(function () use ($counter, $data): void {
            $counter->update(Arr::except($data, 'service_ids'));
            $counter->services()->sync($data['service_ids']);
        });

        return back()->with('success', 'Guichê atualizado com sucesso.');
    }

    public function destroy(Counter $counter): RedirectResponse
    {
        $counter->update(['is_active' => false]);

        return back()->with('success', 'Guichê desativado.');
    }
}
