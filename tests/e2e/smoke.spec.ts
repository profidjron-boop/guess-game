import { expect, test } from "@playwright/test";

test("лобби открывается и содержит основные CTA", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Дуэль тайминга")).toBeVisible();
  await expect(page.getByRole("button", { name: "Создать комнату" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});
