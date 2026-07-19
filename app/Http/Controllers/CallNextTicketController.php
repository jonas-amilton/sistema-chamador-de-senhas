<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CallNextTicketAction;
use App\Http\Requests\CallNextTicketRequest;
use App\Models\Counter;
use App\Models\Service;
use App\Support\TicketData;
use Illuminate\Http\JsonResponse;

final class CallNextTicketController extends Controller
{
    public function __invoke(CallNextTicketRequest $request, CallNextTicketAction $action): JsonResponse
    {
        /** @var Counter $counter */
        $counter = Counter::query()->findOrFail((string) $request->validated('counter_id'));
        /** @var Service $service */
        $service = Service::query()->findOrFail((string) $request->validated('service_id'));

        $ticket = $action->execute(
            $request->user(),
            $counter,
            $service,
            (string) $request->validated('request_id'),
        );

        return response()->json([
            'message' => $ticket === null ? 'Não há senhas aguardando neste serviço.' : 'Senha chamada com sucesso.',
            'ticket' => $ticket === null ? null : TicketData::make($ticket),
        ]);
    }
}
