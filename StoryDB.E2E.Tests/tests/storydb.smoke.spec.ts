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
  await expect(page.getByText(/профиль|profile|выбор проекта|choose a project/i).first()).toBeVisible();
});

test('profile and settings routes render the application shell for anonymous users', async ({ page }) => {
  await page.goto('/style-preview/profile');

  await expect(page.getByRole('heading', { name: /storydb/i })).toBeVisible();
  await expect(page.getByText(/профиль|profile/i)).toBeVisible();

  await page.goto('/style-preview/settings');

  await expect(page.getByRole('heading', { name: /storydb/i })).toBeVisible();
  await expect(page.getByText(/профиль|profile|вход|sign in/i).first()).toBeVisible();
});

test('protected project routes keep anonymous users out of project tabs', async ({ page }) => {
  await page.goto('/style-preview/projects/1/database/characters');

  await expect(page.getByText(/профиль|profile|войти|sign in/i)).toBeVisible();
});
