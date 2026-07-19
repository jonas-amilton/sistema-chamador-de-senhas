<?php

return [
    'kiosk_rate_limit' => (int) env('KIOSK_RATE_LIMIT', 120),
    'display_poll_seconds' => (int) env('DISPLAY_POLL_SECONDS', 15),
    'admin_per_page_max' => (int) env('ADMIN_PER_PAGE_MAX', 100),
    'seed' => [
        'admin_name' => env('SEED_ADMIN_NAME', 'Administrador Demo'),
        'admin_email' => env('SEED_ADMIN_EMAIL', 'admin@example.test'),
        'admin_password' => env('SEED_ADMIN_PASSWORD', 'SenhaDemo!123'),
        'attendant_name' => env('SEED_ATTENDANT_NAME', 'Atendente Demo'),
        'attendant_email' => env('SEED_ATTENDANT_EMAIL', 'atendente@example.test'),
        'attendant_password' => env('SEED_ATTENDANT_PASSWORD', 'SenhaDemo!123'),
    ],
];
