<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

final class TicketPolicy
{
    public function operate(User $user, Ticket $ticket): bool
    {
        return $user->is_active
            && ($user->isAdmin() || $user->unit_id === $ticket->unit_id);
    }

    public function view(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin() || $this->operate($user, $ticket);
    }
}
