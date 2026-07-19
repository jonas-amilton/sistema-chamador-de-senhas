<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Unit;
use App\Support\TicketData;
use Inertia\Inertia;
use Inertia\Response;

final class TicketReceiptController extends Controller
{
    public function __invoke(Unit $unit, Ticket $ticket): Response
    {
        abort_unless($ticket->unit_id === $unit->id, 404);

        return Inertia::render('kiosk/receipt', [
            'unit' => $unit->only(['id', 'name', 'slug', 'timezone']),
            'ticket' => TicketData::make($ticket),
        ]);
    }
}
