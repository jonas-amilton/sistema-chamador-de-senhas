<?php

declare(strict_types=1);

namespace App\Enums;

enum TicketStatus: string
{
    case Waiting = 'waiting';
    case Called = 'called';
    case Serving = 'serving';
    case Completed = 'completed';
    case NoShow = 'no_show';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Waiting => 'Aguardando',
            self::Called => 'Chamada',
            self::Serving => 'Em atendimento',
            self::Completed => 'Concluída',
            self::NoShow => 'Ausente',
            self::Cancelled => 'Cancelada',
        };
    }
}
