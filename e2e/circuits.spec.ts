import { test, expect } from "./fixtures";
import { open, openSidebar, chooseCircuit } from "./helpers";

test("the full catalogue stays available with existing saved circuits and each selected track is highlighted", async ({
  page,
}) => {
  await open(page);
  await openSidebar(page);
  const circuit = page.getByLabel("Circuit", { exact: true });
  const requested = [
    ["magny-cours", "Magny-Cours"],
    ["lemans", "Le Mans · La Sarthe"],
    ["lemans-bugatti", "Le Mans · Bugatti"],
    ["spa", "Spa-Francorchamps"],
    ["portimao", "Portimão"],
    ["dijon-prenois", "Dijon-Prenois"],
    ["paul-ricard", "Paul Ricard"],
    ["jarama", "Jarama"],
  ];
  await expect(circuit.locator("option")).toHaveCount(18);
  for (const [id, name] of requested) {
    await chooseCircuit(page, name);
    await expect(circuit).toHaveValue(id);
    await expect(page.locator(".active-circuit")).toContainText(name);
    await expect(
      page.getByText("Circuit outline · radar coverage", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".leaflet-overlay-pane path.leaflet-interactive"),
    ).toHaveCount(3);
  }
  await page.reload();
  await expect(circuit).toHaveValue("jarama");
  await expect(circuit.locator("option")).toHaveCount(18);
  await expect(
    circuit.locator('optgroup[label="Saved circuits"] option[value="jarama"]'),
  ).toHaveCount(1);
  await expect(
    circuit.locator('optgroup[label="More circuits"] option[value="jerez"]'),
  ).toHaveCount(1);
});
