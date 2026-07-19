<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\IssueTicketAction;
use App\Enums\TicketPriority;
use App\Http\Requests\IssueTicketRequest;
use App\Models\Service;
use App\Models\Unit;
use App\Support\TicketData;
use Illuminate\Http\JsonResponse;

final class TicketIssueController extends Controller
{
    public function __invoke(IssueTicketRequest $request, Unit $unit, IssueTicketAction $action): JsonResponse
    {
        /** @var Service $service */
        $service = Service::query()->findOrFail((string) $request->validated('service_id'));
        $ticket = $action->execute(
            $unit,
            $service,
            TicketPriority::from($request->validated('priority')),
            $request->validated('client_request_id'),
        );

        return response()->json([
            'message' => 'Senha emitida com sucesso.',
            'ticket' => TicketData::make($ticket),
            'receipt_url' => route('kiosk.receipt', [$unit, $ticket]),
        ], 201);
    }
}
