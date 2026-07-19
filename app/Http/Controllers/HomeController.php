<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Unit;
use Inertia\Inertia;
use Inertia\Response;

final class HomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'units' => Unit::query()->active()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }
}
