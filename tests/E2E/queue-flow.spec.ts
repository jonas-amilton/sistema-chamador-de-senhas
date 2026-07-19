import { expect, test } from '@playwright/test';

test('fluxo crítico da emissão até a conclusão', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('admin@example.test');
    await page.getByLabel('Senha').fill('SenhaDemo!123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/attendant/);

    await page.goto('/admin');
    await expect(
        page.getByRole('heading', { name: /administração/i }),
    ).toBeVisible();

    await page.goto('/kiosk/unidade-principal');
    await page.getByRole('button', { name: 'Atendimento Geral' }).click();
    await page.getByRole('button', { name: 'Atendimento normal' }).click();
    await page.getByRole('button', { name: 'Emitir minha senha' }).click();
    await expect(
        page.getByRole('heading', { name: 'Senha emitida' }),
    ).toBeVisible();
    const ticketCode = (
        await page.locator('p.font-mono').first().textContent()
    )?.trim();
    expect(ticketCode).toMatch(/^N\d{4,}$/);

    await page.goto('/attendant');
    await page.getByRole('button', { name: 'Chamar próxima senha' }).click();
    await expect(
        page.getByText(ticketCode ?? '', { exact: true }),
    ).toBeVisible();

    await page.goto('/display/unidade-principal');
    await expect(
        page.getByText(ticketCode ?? '', { exact: true }),
    ).toBeVisible();

    await page.goto('/attendant');
    await page.getByRole('button', { name: 'Iniciar atendimento' }).click();
    await expect(page.getByText('Em atendimento')).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
    await expect(page.getByText('Nenhuma senha neste guichê')).toBeVisible();
});
