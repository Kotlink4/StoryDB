import { expect, test } from '@playwright/test';

test('project page opens and can reach the API proxy', async ({ page, request }) => {
  const authResponse = await request.get('/api/auth/me');
  expect(authResponse.status()).toBe(401);

  await page.goto('/');

  await expect(page.getByText(/storydb/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /выбор проекта|choose a project/i })).toBeVisible();
});

test('style preview opens without a blank screen', async ({ page }) => {
  await page.goto('/style-preview');

  await expect(page.getByRole('heading', { name: /storydb/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'A' })).toBeVisible();
  await expect(page.getByText(/API/i)).toBeVisible();
});
