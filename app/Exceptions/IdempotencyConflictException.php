<?php

declare(strict_types=1);

namespace App\Exceptions;

class IdempotencyConflictException extends DomainConflictException {}
