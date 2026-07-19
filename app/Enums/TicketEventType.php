<?php

declare(strict_types=1);

namespace App\Enums;

enum TicketEventType: string
{
    case Issued = 'issued';
    case Called = 'called';
    case Recalled = 'recalled';
    case ServiceStarted = 'service_started';
    case Completed = 'completed';
    case MarkedNoShow = 'marked_no_show';
    case Requeued = 'requeued';
    case Cancelled = 'cancelled';
}
