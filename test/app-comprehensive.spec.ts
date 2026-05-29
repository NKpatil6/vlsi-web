import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:4000";

async function goto(page: Page, hash: string) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: "networkidle" });
}

async function mockElectronAPI(page: Page) {
  await page.addInitScript(() => {
    (window as any).electronAPI = {
      openExternal: async () => true,
      checkVivado: async () => ({ available: false }),
      checkQuestasim: async () => ({ available: false }),
      runVSim: async () => ({ stdout: "", stderr: "" }),
      writeTempFiles: async () => ({ dir: "/tmp" }),
      readFile: async () => "",
      cleanupTemp: async () => {},
      clipboard: { writeText: async () => {} },
    };
  });
}

async function seedSettings(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "vlsi_settings",
      JSON.stringify({
        aiProvider: "groq",
        groqApiKey: "test-key",
        geminiApiKey: "",
      })
    );
  });
}

async function seedCodingProblem(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "vlsi_coding_task",
      JSON.stringify({
        title: "Basic 4-bit Counter",
        description: "Design a 4-bit synchronous counter with reset.",
        starterCode: "module counter_4bit(\n  input clk,\n  input rst_n,\n  output reg [3:0] count\n);\nendmodule",
        solution: "module counter_4bit(\n  input clk,\n  input rst_n,\n  output reg [3:0] count\n);\n  always @(posedge clk or negedge rst_n) begin\n    if (!rst_n) count <= 4'b0;\n    else count <= count + 1;\n  end\nendmodule",
        testCases: [
          { input: "clk=0 rst_n=0", expectedOutput: "count = 0000" },
          { input: "clk=1 rst_n=1", expectedOutput: "count = 0001" },
        ],
        difficulty: "beginner",
      })
    );
    localStorage.setItem(
      "vlsi_editor_code",
      "module counter_4bit(\n  input clk,\n  input rst_n,\n  output reg [3:0] count\n);\nendmodule"
    );
    localStorage.setItem("vlsi_selected_topic", "counters");
    localStorage.setItem("vlsi_selected_tool", "questa");
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("opens successfully", async ({ page }) => {
    await goto(page, "/dashboard");
    // Use first() to avoid strict mode violation
    await expect(page.locator("text=Dashboard").first()).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await goto(page, "/dashboard");
    await page.waitForTimeout(1000);
    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("network")
    );
    expect(critical).toHaveLength(0);
  });
});

// ─── Syllabus ────────────────────────────────────────────────────────────────

test.describe("Syllabus", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/syllabus");
    // The page body should have content
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("no crashes on navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/syllabus");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ─── Sessions ────────────────────────────────────────────────────────────────

test.describe("Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/sessions");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("session persistence via localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      const sessions = [
        {
          id: "test-1",
          title: "Counter Review",
          topic_id: "counters",
          scheduled_date: new Date().toISOString().split("T")[0],
          status: "pending",
          session_type: "daily-recurrence",
          duration_minutes: 30,
          created_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem("vlsi_sessions", JSON.stringify(sessions));
    });
    await goto(page, "/sessions");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Counter Review");
  });

  test("no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await goto(page, "/sessions");
    await page.waitForTimeout(500);
    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(critical).toHaveLength(0);
  });
});

// ─── Coding ──────────────────────────────────────────────────────────────────

test.describe("Coding", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
    await seedCodingProblem(page);
  });

  test("page loads with editor", async ({ page }) => {
    await goto(page, "/coding");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("VLSI Coding");
  });

  test("terminal panel visible", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-panel")).toBeVisible();
  });

  test("terminal shows placeholder when empty", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-content")).toContainText("Run a simulation");
  });

  test("no React crash on 5 consecutive loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    for (let i = 0; i < 5; i++) {
      await goto(page, "/coding");
      await page.waitForTimeout(300);
    }
    expect(errors).toHaveLength(0);
  });

  test("code persists after navigation", async ({ page }) => {
    await goto(page, "/coding");
    await page.waitForTimeout(500);
    const code = await page.evaluate(() => localStorage.getItem("vlsi_editor_code"));
    expect(code).toContain("counter_4bit");
  });
});

// ─── Quiz ────────────────────────────────────────────────────────────────────

test.describe("Quiz", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/quiz");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Quiz");
  });

  test("no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await goto(page, "/quiz");
    await page.waitForTimeout(500);
    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(critical).toHaveLength(0);
  });
});

// ─── Flashcards ──────────────────────────────────────────────────────────────

test.describe("Flashcards", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/flashcards");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Flashcards");
  });

  test("no undefined errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/flashcards");
    await page.waitForTimeout(500);
    const undefinedErrors = errors.filter((e) =>
      e.toLowerCase().includes("undefined is not")
    );
    expect(undefinedErrors).toHaveLength(0);
  });
});

// ─── Achievements ────────────────────────────────────────────────────────────

test.describe("Achievements", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/achievements");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("no crashes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/achievements");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

test.describe("Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/analytics");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Analytics");
  });

  test("no crashes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/analytics");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ─── AI Explorer ─────────────────────────────────────────────────────────────

test.describe("AI Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/ai-explorer");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("AI Explorer");
  });

  test("no crashes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/ai-explorer");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("page loads", async ({ page }) => {
    await goto(page, "/settings");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Settings");
  });

  test("no claude/anthropic references", async ({ page }) => {
    await goto(page, "/settings");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toContain("claude");
    expect(bodyText.toLowerCase()).not.toContain("anthropic");
  });

  test("settings persistence", async ({ page }) => {
    await goto(page, "/settings");
    await page.waitForTimeout(500);
    const settings = await page.evaluate(() =>
      localStorage.getItem("vlsi_settings")
    );
    expect(settings).toBeTruthy();
    const parsed = JSON.parse(settings!);
    expect(parsed.aiProvider).toBe("groq");
  });
});

// ─── Cross-Page Navigation ───────────────────────────────────────────────────

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPI(page);
    await seedSettings(page);
  });

  test("all pages load without crash", async ({ page }) => {
    const pages = [
      "/dashboard",
      "/syllabus",
      "/sessions",
      "/coding",
      "/quiz",
      "/flashcards",
      "/achievements",
      "/analytics",
      "/ai-explorer",
      "/settings",
    ];
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (const p of pages) {
      await goto(page, p);
      await page.waitForTimeout(300);
    }

    expect(errors).toHaveLength(0);
  });
});

// ─── Error Resilience ────────────────────────────────────────────────────────

test.describe("Error Resilience", () => {
  test("handles missing localStorage gracefully", async ({ page }) => {
    await mockElectronAPI(page);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/dashboard");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("handles corrupt settings gracefully", async ({ page }) => {
    await mockElectronAPI(page);
    await page.addInitScript(() => {
      localStorage.setItem("vlsi_settings", "not-json{{{");
    });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/settings");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("handles corrupt session data gracefully", async ({ page }) => {
    await mockElectronAPI(page);
    await page.addInitScript(() => {
      localStorage.setItem("vlsi_sessions", "[broken json");
    });
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/sessions");
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
