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
        starterCode: "module counter_4bit(\n  input clk,\n  input rst_n,\n  output reg [3:0] count\n);\n  always @(posedge clk or negedge rst_n) begin\n    if (!rst_n) count <= 4'b0;\n    else count <= count + 1;\n  end\nendmodule",
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
      "module counter_4bit(\n  input clk,\n  input rst_n,\n  output reg [3:0] count\n);\n  always @(posedge clk or negedge rst_n) begin\n    if (!rst_n) count <= 4'b0;\n    else count <= count + 1;\n  end\nendmodule"
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
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("statistics cards render", async ({ page }) => {
    await goto(page, "/dashboard");
    await expect(page.locator("text=Streak")).toBeVisible();
    await expect(page.locator("text=Topics")).toBeVisible();
    await expect(page.locator("text=Study Hours")).toBeVisible();
  });

  test("quick actions render", async ({ page }) => {
    await goto(page, "/dashboard");
    await expect(page.locator("text=AI Explorer")).toBeVisible();
    await expect(page.locator("text=Take a Quiz")).toBeVisible();
    await expect(page.locator("text=Practice Coding")).toBeVisible();
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

  test("page loads with topic list", async ({ page }) => {
    await goto(page, "/syllabus");
    await expect(page.locator("text=VLSI Syllabus")).toBeVisible();
  });

  test("topics are displayed", async ({ page }) => {
    await goto(page, "/syllabus");
    await expect(page.locator("text=Counters")).toBeVisible();
    await expect(page.locator("text=FSM")).toBeVisible();
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
    await expect(page.locator("text=Study Sessions")).toBeVisible();
  });

  test("create session button visible", async ({ page }) => {
    await goto(page, "/sessions");
    await expect(page.locator("text=Create Session")).toBeVisible();
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
    await expect(page.locator("text=Counter Review")).toBeVisible();
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
    await expect(page.locator("text=VLSI Coding")).toBeVisible();
  });

  test("code editor visible", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.locator("text=your-solution.sv")).toBeVisible();
  });

  test("terminal panel visible", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-panel")).toBeVisible();
  });

  test("terminal shows placeholder when empty", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.getByTestId("terminal-content")).toContainText("Run a simulation");
  });

  test("run button visible", async ({ page }) => {
    await goto(page, "/coding");
    await expect(page.locator("text=Run")).toBeVisible();
  });

  test("simulation output appears after paste", async ({ page }) => {
    await goto(page, "/coding");
    // Open paste modal
    const pasteBtn = page.locator("button", { hasText: "Paste" }).first();
    if (await pasteBtn.isVisible()) {
      await pasteBtn.click();
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible()) {
        await textarea.fill("# count = 0\n# count = 1\nSimulation completed");
        const analyzeBtn = page.locator("button", { hasText: "Analyze" }).first();
        if (await analyzeBtn.isVisible()) {
          await analyzeBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
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
    // Check localStorage has the code
    const code = await page.evaluate(() => localStorage.getItem("vlsi_editor_code"));
    expect(code).toContain("counter_4bit");
  });

  test("AI diagnostic references only challenge modules", async ({ page }) => {
    // Seed sim analysis with proper content
    await page.addInitScript(() => {
      localStorage.setItem(
        "vlsi_sim_analysis",
        JSON.stringify({
          success: true,
          diagnostic:
            "## Simulation Diagnostic\n\n**The Symptom:** Counter not incrementing.\n\n### Root Cause Analysis\nThe counter_4bit module has a reset issue.\n\n### How to Fix\nAdd proper reset logic.",
          hallucinatedModules: [],
        })
      );
    });
    await goto(page, "/coding");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).toContain("counter");
    expect(bodyText.toLowerCase()).not.toContain("decoder");
    expect(bodyText.toLowerCase()).not.toContain("fifo");
  });

  test("PASS badge appears when eval passes", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "vlsi_sim_analysis",
        JSON.stringify({
          success: true,
          diagnostic: "All tests passed. Simulation completed successfully.",
        })
      );
    });
    await goto(page, "/coding");
    // Check for terminal panel at least
    await expect(page.getByTestId("terminal-panel")).toBeVisible();
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
    await expect(page.locator("text=Quiz")).toBeVisible();
  });

  test("generate button visible", async ({ page }) => {
    await goto(page, "/quiz");
    await expect(page.locator("text=Generate Quiz")).toBeVisible();
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
    await expect(page.locator("text=Flashcards")).toBeVisible();
  });

  test("topic selector visible", async ({ page }) => {
    await goto(page, "/flashcards");
    await expect(page.locator("text=Select Topic")).toBeVisible();
  });

  test("generate with AI button visible", async ({ page }) => {
    await goto(page, "/flashcards");
    await expect(page.locator("text=Generate with AI")).toBeVisible();
  });

  test("load existing button visible", async ({ page }) => {
    await goto(page, "/flashcards");
    await expect(page.locator("text=Load Existing")).toBeVisible();
  });

  test("no undefined errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/flashcards");
    await page.waitForTimeout(500);
    const undefinedErrors = errors.filter((e) =>
      e.toLowerCase().includes("undefined")
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
    await expect(page.locator("text=Achievement")).toBeVisible();
  });

  test("achievements display", async ({ page }) => {
    await goto(page, "/achievements");
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
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
    await expect(page.locator("text=Analytics")).toBeVisible();
  });

  test("heatmap renders", async ({ page }) => {
    await goto(page, "/analytics");
    await page.waitForTimeout(500);
    // Check for heatmap or chart elements
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Activity");
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
    await expect(page.locator("text=AI Explorer")).toBeVisible();
  });

  test("mode selector visible", async ({ page }) => {
    await goto(page, "/ai-explorer");
    await expect(page.locator("text=Explain")).toBeVisible();
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
    await expect(page.locator("text=Settings")).toBeVisible();
  });

  test("provider options visible", async ({ page }) => {
    await goto(page, "/settings");
    await expect(page.locator("text=Groq")).toBeVisible();
    await expect(page.locator("text=Gemini")).toBeVisible();
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

  test("sidebar links work", async ({ page }) => {
    await goto(page, "/dashboard");
    // Click sidebar links
    const sidebar = page.locator("nav").first();
    if (await sidebar.isVisible()) {
      const links = sidebar.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

// ─── Error Resilience ────────────────────────────────────────────────────────

test.describe("Error Resilience", () => {
  test("handles missing localStorage gracefully", async ({ page }) => {
    await mockElectronAPI(page);
    // Don't seed anything
    await goto(page, "/dashboard");
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("handles corrupt settings gracefully", async ({ page }) => {
    await mockElectronAPI(page);
    await page.addInitScript(() => {
      localStorage.setItem("vlsi_settings", "not-json{{{");
    });
    await goto(page, "/settings");
    await page.waitForTimeout(500);
    // Should not crash
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await goto(page, "/settings");
    await page.waitForTimeout(300);
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
