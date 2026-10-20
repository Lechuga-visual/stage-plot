export async function openDefault(
  page,
  { identify = true, role = "FOH" } = {},
) {
  const toggle = page.locator("#toggle-chat");
  await toggle.waitFor();
  if (
    (await toggle.count()) &&
    (await toggle.getAttribute("aria-expanded")) === "true"
  )
    await toggle.click();
  await page.locator('[data-project="default"]').click();
  const form = page.locator("#identity-form");
  await form.waitFor();
  if (identify) {
    await page.locator("#identity-role").selectOption(role);
    await form.locator("button").click();
    await form.waitFor({ state: "detached" });
  } else await page.locator("#workspace-dialog [data-dismiss]").click();
}
