<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class DomainConflictException extends RuntimeException
{
    /** @param array<string, mixed> $context */
    public function __construct(string $message, public readonly array $context = [])
    {
        parent::__construct($message, 409);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 409);
    }
}
