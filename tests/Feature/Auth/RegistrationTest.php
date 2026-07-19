<?php

declare(strict_types=1);

test('public registration is disabled', function (): void {
    $this->get('/register')->assertNotFound();

    $this->post('/register', [
        'name' => 'Pessoa não autorizada',
        'email' => 'novo@example.test',
        'password' => 'Senha!123456',
        'password_confirmation' => 'Senha!123456',
    ])->assertNotFound();

    $this->assertGuest();
});
