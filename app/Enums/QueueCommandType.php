<?php

declare(strict_types=1);

namespace App\Enums;

enum QueueCommandType: string
{
    case CallNext = 'call_next';
    case Recall = 'recall';
    case StartService = 'start_service';
    case Complete = 'complete';
    case MarkNoShow = 'mark_no_show';
    case Requeue = 'requeue';
    case Cancel = 'cancel';
}
