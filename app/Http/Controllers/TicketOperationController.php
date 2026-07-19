<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CancelTicketAction;
use App\Actions\CompleteTicketAction;
use App\Actions\MarkTicketNoShowAction;
use App\Actions\RecallTicketAction;
use App\Actions\RequeueTicketAction;
use App\Actions\StartTicketServiceAction;
use App\Http\Requests\TicketOperationRequest;
use App\Models\Counter;
use App\Models\Ticket;
use App\Support\TicketData;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

final class TicketOperationController extends Controller
{
    public function recall(TicketOperationRequest $request, Ticket $ticket, RecallTicketAction $action): JsonResponse
    {
        return $this->response($action->execute($request->user(), $ticket, $this->counter($request), $request->validated('request_id')), 'Chamada repetida.');
    }

    public function start(TicketOperationRequest $request, Ticket $ticket, StartTicketServiceAction $action): JsonResponse
    {
        return $this->response($action->execute($request->user(), $ticket, $this->counter($request), $request->validated('request_id')), 'Atendimento iniciado.');
    }

    public function complete(TicketOperationRequest $request, Ticket $ticket, CompleteTicketAction $action): JsonResponse
    {
        return $this->response($action->execute($request->user(), $ticket, $this->counter($request), $request->validated('request_id')), 'Atendimento finalizado.');
    }

    public function noShow(TicketOperationRequest $request, Ticket $ticket, MarkTicketNoShowAction $action): JsonResponse
    {
        return $this->response($action->execute($request->user(), $ticket, $this->counter($request), $request->validated('request_id')), 'Ausência registrada.');
    }

    public function requeue(TicketOperationRequest $request, Ticket $ticket, RequeueTicketAction $action): JsonResponse
    {
        return $this->response($action->execute($request->user(), $ticket, $this->counter($request), $request->validated('request_id')), 'Senha retornada para a fila.');
    }

    public function cancel(TicketOperationRequest $request, Ticket $ticket, CancelTicketAction $action): JsonResponse
    {
        $counterId = $request->validated('counter_id');
        /** @var Counter|null $counter */
        $counter = $counterId === null ? null : Counter::query()->findOrFail((string) $counterId);

        return $this->response($action->execute($request->user(), $ticket, $counter, $request->validated('request_id')), 'Senha cancelada.');
    }

    private function counter(TicketOperationRequest $request): Counter
    {
        $counterId = $request->validated('counter_id');

        if ($counterId === null) {
            throw ValidationException::withMessages(['counter_id' => 'Selecione um guichê.']);
        }

        /** @var Counter $counter */
        $counter = Counter::query()->findOrFail((string) $counterId);

        return $counter;
    }

    private function response(Ticket $ticket, string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'ticket' => TicketData::make($ticket)]);
    }
}
