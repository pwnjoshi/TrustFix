import { expect, test } from "@playwright/test";

test("review explains and completes the approval flow", async ({ page }) => {
  await page.goto("/app/reviews");
  await expect(page.getByRole("heading", { name: "Acme Security Review" })).toBeVisible();
  await page.getByRole("button", { name: "Review remediation" }).click();
  await expect(page.getByRole("dialog", { name: "Remove public bucket access" })).toBeVisible();
  await page.getByRole("button", { name: "Approve & remediate" }).click();
  await expect(page.getByText("Anonymous access denied")).toBeVisible();
  await expect(page.getByText("EVIDENCE-BACKED ANSWER")).toBeVisible();
});

test("mobile review has no horizontal overflow", async ({ page }) => {
  await page.goto("/app/reviews");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

