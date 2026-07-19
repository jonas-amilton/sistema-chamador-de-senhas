<?php

declare(strict_types=1);

namespace App\Enums;

enum TicketPriority: string
{
    case Standard = 'standard';
    case Priority = 'priority';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Atendimento normal',
            self::Priority => 'Atendimento prioritário',
        };
    }
}
