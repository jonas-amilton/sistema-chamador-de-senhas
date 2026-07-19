<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Unit;
use Inertia\Inertia;
use Inertia\Response;

final class KioskController extends Controller
{
    public function __invoke(Unit $unit): Response
    {
        abort_unless($unit->is_active, 404);

        return Inertia::render('kiosk/index', [
            'unit' => $unit->only(['id', 'name', 'slug', 'timezone']),
            'services' => $unit->services()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }
}
