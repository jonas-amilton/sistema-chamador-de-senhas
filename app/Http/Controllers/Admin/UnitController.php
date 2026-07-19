<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UnitRequest;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;

final class UnitController extends Controller
{
    public function store(UnitRequest $request): RedirectResponse
    {
        Unit::query()->create([...$request->validated(), 'is_active' => $request->boolean('is_active', true)]);

        return back()->with('success', 'Unidade criada com sucesso.');
    }

    public function update(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        return back()->with('success', 'Unidade atualizada com sucesso.');
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        $unit->update(['is_active' => false]);

        return back()->with('success', 'Unidade desativada.');
    }
}
