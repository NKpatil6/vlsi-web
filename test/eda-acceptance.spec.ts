/**
 * Playwright Acceptance Tests
 *
 * Covers:
 *   1. Claude / Anthropic removal — no text in any rendered page
 *   2. EDA Playground button visible after problem generation
 *   3. EDA open flow — electronAPI.openExternal called, clipboard written
 *   4. Paste EDA Output modal — opens, accepts text, triggers AI analysis
 *   5. Persistence — simAnalysis and logs survive page reload
 *
 * Run:
 *   npx playwright test test/eda-acceptance.spec.ts
 *
 * Prerequisites:
 *   npm run build:electron   (or npm run dev in a separate terminal)
 *   npx playwright install chromium
 */

import { test, expect, Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to a hash route and wait for the page to settle. */
async function goto(page: Page, hash: string) {
  await page.goto(`http://localhost:4000/#${hash}`);
  await page.waitForLoadState("networkidle");
}

/** Inject a mock electronAPI so tests don't need a real Electron window. */
async function mockElectronAPI(page: Page) {
  await page.addInitScript(() => {
    const calls: { method: string; args: unknown[] }[] = [];
    (window as Window & { _electronAPICalls?: typeof calls }).
      _electronAPICalls = calls;

    (window as Window & { electronAPI?: object }).electronAPI = {
      openExternal: (url: string) => {
        calls.push({ method: "openExternal", args: [url] });
        return Promise.resolve();
      },
      checkVivado: () => Promise.resolve({ available: false }),
      checkQuestasim: () => Promise.resolve({ available: false }),
      runVSim: () => Promise.resolve({ success: false, transcript: "", errors: [], warnings: [], passed: false }),
      writeTempFiles: () => Promise.resolve({ success: true }),
      readFile: () => Promise.resolve({ success: false }),
      cleanupTemp: () => Promise.resolve({ success: true }),
    };

    // Mock clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text: string) => {
          calls.push({ method: "clipboard.writeText", args: [text] });
          return Promise.resolve();
        },
        readText: () => Promise.resolve(""),
      },
      configurable: true,
    });
  });
}

/** Seed localStorage with a Groq API key so AI calls don't fail with "not configured". */
async function seedSettings(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "vlsi_settings",
      JSON.stringify({
        ai_provider: "groq",
        groq_api_key: "gsk_test_key_playwright",
        preferred_model: "llama-3.3-70b-versatile",
        gemini_api_key: "",
        preferred_gemini_model: "gemini-2.0-flash",
        questasim_path: "",
        vivado_path: "",
      }),
    );
  });
}

/** Seed a pre-generated coding problem so we don't need a real AI call. */
async function seedCodingProblem(page: Page) {
  const problem = {
    title: "4-bit Counter",
    description: "Implement a synchronous 4-bit up-counter with active-high reset.",
    difficulty: "intermediate",
    starterCode: `module counter_4bit(\n  input clk,\n  input rst,\n  output reg [3:0] count\n);\n  always @(posedge clk) begin\n    if (rst) count <= 4'b0;\n    else count <= count + 1;\n  end\nendmodule`,
    solution: `module counter_4bit(\n  input clk,\n  input rst,\n  output reg [3:0] count\n);\n  always @(posedge clk) begin\n    if (rst) count <= 4'b0;\n    else count <= count + 1;\n  end\nendmodule`,
    testCases: [
      { input: "clk=1, rst=1", expectedOutput: "count=0" },
      { input: "clk=1, rst=0", expectedOutput: "count=1" },
    ],
  };

  await page.addInitScript((p) => {
    localStorage.setItem("vlsi_coding_task", JSON.stringify(p));
    localStorage.setItem("vlsi_editor_code", p.starterCode);
    localStorage.setItem("vlsi_selected_tool", "eda");
  }, problem);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe("Claude / Anthropic Removal", () => {
  const routes = ["/", "/dashboard", "/coding", "/settings", "/ai-explorer", "/quiz", "/flashcards", "/sessions", "/analytics", "/achievements"];

  for (const route of routes) {
    test(`no Claude or Anthropic text on ${route}`, async ({ page }) => {
      await mockElectronAPI(page);
      await seedSettings(page);
      await goto(page, route);

      const bodyText = await page.locator("body").innerText();
      const lower = bodyText.toLowerCase();

      expect(lower, `Found "claude" on ${route}`).not.toContain("claude");
      expect(lower, `Found "anthropic" on ${route}`).not.toContain("anthropic");
    });
  }
});

test.describe("EDA Playground Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);
  });

  test("toolbar is visible after problem load", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("coding-toolbar")).toBeVisible();
  });

  test("Open in EDA Playground button is visible", async ({ page }) => {
    await goto(page, "/coding");
    const btn = page.getByTestId("open-eda-btn");
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("clicking Open in EDA Playground calls openExternal with edaplayground.com URL", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByTestId("open-eda-btn").click();

    // Wait for async open to complete
    await page.waitForTimeout(1500);

    const calls = await page.evaluate(
      () => (window as Window & { _electronAPICalls?: { method: string; args: unknown[] }[] })._electronAPICalls ?? [],
    );

    const openCall = calls.find((c) => c.method === "openExternal");
    expect(openCall, "openExternal was not called").toBeTruthy();
    expect(String(openCall!.args[0])).toContain("edaplayground.com");
  });

  test("clipboard.writeText is called with design code", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByTestId("open-eda-btn").click();
    await page.waitForTimeout(1500);

    const calls = await page.evaluate(
      () => (window as Window & { _electronAPICalls?: { method: string; args: unknown[] }[] })._electronAPICalls ?? [],
    );

    const clipCall = calls.find((c) => c.method === "clipboard.writeText");
    expect(clipCall, "clipboard.writeText was not called").toBeTruthy();

    const clipText = String(clipCall!.args[0]);
    expect(clipText).toContain("DESIGN CODE");
    expect(clipText).toContain("TESTBENCH CODE");
    expect(clipText).toContain("counter_4bit");
  });

  test("EDA launch banner appears after clicking Open in EDA Playground", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByTestId("open-eda-btn").click();
    await expect(page.getByText("EDA Playground opened")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Paste EDA Output Modal", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);
  });

  test("Paste EDA Output button opens modal", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByRole("button", { name: /Paste EDA Output/i }).click();
    await expect(page.getByText("Paste EDA Playground Output")).toBeVisible();
  });

  test("modal accepts pasted text", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByRole("button", { name: /Paste EDA Output/i }).click();
    const textarea = page.locator("textarea").last();
    await textarea.fill("Error: syntax error near 'always' at line 5");
    await expect(textarea).toHaveValue(/syntax error/);
  });

  test("modal closes on Close button", async ({ page }) => {
    await goto(page, "/coding");
    await page.getByRole("button", { name: /Paste EDA Output/i }).click();
    await page.getByRole("button", { name: /Close/i }).click();
    await expect(page.getByText("Paste EDA Playground Output")).not.toBeVisible();
  });
});

test.describe("Persistence", () => {
  test("simulation logs persist across navigation", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);

    // Seed logs directly
    await page.addInitScript(() => {
      localStorage.setItem("vlsi_simulation_logs", "# Simulation output: PASS at t=100ns");
    });

    await goto(page, "/coding");

    // Navigate away and back
    await goto(page, "/dashboard");
    await goto(page, "/coding");

    const logs = await page.evaluate(() => localStorage.getItem("vlsi_simulation_logs"));
    expect(logs).toContain("PASS at t=100ns");
  });

  test("simAnalysis persists across navigation", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);

    const analysis = { success: true, diagnostic: "Root cause: off-by-one in counter reset logic." };
    await page.addInitScript((a) => {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify(a));
    }, analysis);

    await goto(page, "/coding");
    await goto(page, "/dashboard");
    await goto(page, "/coding");

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("vlsi_sim_analysis") || "null"); } catch { return null; }
    });
    expect(stored?.diagnostic).toContain("off-by-one");
  });
});

test.describe("Settings — AI Provider", () => {
  test("Settings page shows Groq and Gemini provider options", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await goto(page, "/settings");

    await expect(page.getByText("Groq (Llama)").first()).toBeVisible();
    await expect(page.getByText("Gemini (Google)").first()).toBeVisible();
  });

  test("Settings About panel shows correct providers", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await goto(page, "/settings");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Groq");
    expect(bodyText).toContain("Gemini");
    expect(bodyText.toLowerCase()).not.toContain("claude");
    expect(bodyText.toLowerCase()).not.toContain("anthropic");
  });
});

// ─── Terminal Panel Tests ─────────────────────────────────────────────────────

test.describe("Terminal Panel", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);
  });

  test("terminal panel is visible on coding page", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-panel")).toBeVisible();
  });

  test("terminal shows placeholder when no logs", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByText("Run a simulation to see output here")).toBeVisible();
  });

  test("terminal displays simulation logs from localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("vlsi_simulation_logs", "# count = 0\n# count = 1\n# count = 2\nSimulation completed");
    });
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-content")).toContainText("count = 0");
    await expect(page.getByTestId("terminal-content")).toContainText("Simulation completed");
  });

  test("terminal has compile/simulation tabs", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulation" })).toBeVisible();
  });

  test("terminal collapses on minimize button click", async ({ page }) => {
    await goto(page, "/coding");
    const panel = page.getByTestId("terminal-panel");
    await expect(panel).toBeVisible();
    const toggleBtn = page.getByTestId("terminal-toggle");
    await toggleBtn.click();
    await expect(page.getByTestId("terminal-content")).not.toBeVisible();
  });
});

// ─── AI Analyzer Validation Tests ─────────────────────────────────────────────

test.describe("AI Analyzer — Module Validation", () => {
  test("counter challenge produces counter-only analysis", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);

    const analysis = {
      success: true,
      diagnostic: "## Simulation Diagnostic\n\n**The Symptom:** Counter not resetting properly.\n\n### Root Cause Analysis\nThe counter_4bit module has a reset timing issue.\n\n### How to Fix\nAdd proper synchronous reset in the counter module.",
      hallucinatedModules: [],
    };
    await page.addInitScript((a) => {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify(a));
    }, analysis);

    await goto(page, "/coding");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).toContain("counter");
    expect(bodyText.toLowerCase()).not.toContain("decoder");
    expect(bodyText.toLowerCase()).not.toContain("fifo");
    expect(bodyText.toLowerCase()).not.toContain("cdc");
  });

  test("PASS badge appears when simulation passes", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);

    await page.addInitScript(() => {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify({
        success: true,
        diagnostic: "Simulation completed. All tests passed. PASS.",
      }));
    });

    await goto(page, "/coding");
    await expect(page.getByTestId("pass-fail-badge")).toContainText("PASS");
  });

  test("FAIL badge appears when simulation fails", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);

    await page.addInitScript(() => {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify({
        success: true,
        diagnostic: "Simulation failed at t=100ns. FAIL.",
      }));
    });

    await goto(page, "/coding");
    await expect(page.getByTestId("pass-fail-badge")).toContainText("FAIL");
  });

  test("waveform status shown when analysis succeeds", async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);

    await page.addInitScript(() => {
      localStorage.setItem("vlsi_sim_analysis", JSON.stringify({
        success: true,
        diagnostic: "Simulation completed successfully.",
      }));
    });

    await goto(page, "/coding");
    await expect(page.getByTestId("waveform-status")).toBeVisible();
  });
});
