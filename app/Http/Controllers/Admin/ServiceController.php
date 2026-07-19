<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Models\QueueState;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

final class ServiceController extends Controller
{
    public function store(ServiceRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $service = Service::query()->create([...$request->validated(), 'is_active' => $request->boolean('is_active', true)]);
            QueueState::query()->create(['service_id' => $service->id]);
        });

        return back()->with('success', 'Serviço criado com sucesso.');
    }

    public function update(ServiceRequest $request, Service $service): RedirectResponse
    {
        if ($service->unit_id !== $request->validated('unit_id') && $service->tickets()->exists()) {
            throw new DomainConflictException('Não é possível mover um serviço que possui histórico.');
        }

        $service->update($request->validated());

        return back()->with('success', 'Serviço atualizado com sucesso.');
    }

    public function destroy(Service $service): RedirectResponse
    {
        $service->update(['is_active' => false]);

        return back()->with('success', 'Serviço desativado.');
    }
}
