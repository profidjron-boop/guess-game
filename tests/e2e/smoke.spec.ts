import { expect, test } from "@playwright/test";

test("экран матчей открывается и содержит ключевые действия", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Матчи" })).toBeVisible();
  await expect(page.getByPlaceholder("Поиск по командам")).toBeVisible();
  await expect(page.getByRole("link", { name: "Глобальные лидеры" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Играть" }).first()).toBeVisible();
});
