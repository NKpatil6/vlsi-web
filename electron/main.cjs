/**
 * Electron Main Process
 * Handles IPC for Vivado xsim, QuestaSim, and file system operations.
 */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

let mainWindow = null;

function getPathDirs() {
  const raw = process.env.PATH || process.env.Path || "";
  return raw
    .split(path.delimiter)
    .map((p) => (p || "").trim())
    .filter(Boolean);
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function looksLikeVivadoBinDir(dir) {
  const xvlog = path.join(dir, "xvlog" + (process.platform === "win32" ? ".bat" : ""));
  const xelab = path.join(dir, "xelab" + (process.platform === "win32" ? ".bat" : ""));
  const xsim = path.join(dir, "xsim" + (process.platform === "win32" ? ".bat" : ""));
  return fs.existsSync(xvlog) && fs.existsSync(xelab) && fs.existsSync(xsim);
}

function looksLikeQuestaBinDir(dir) {
  const vsim = path.join(dir, "vsim" + (process.platform === "win32" ? ".exe" : ""));
  const vlog = path.join(dir, "vlog" + (process.platform === "win32" ? ".exe" : ""));
  const vlib = path.join(dir, "vlib" + (process.platform === "win32" ? ".exe" : ""));
  return fs.existsSync(vsim) && fs.existsSync(vlog) && fs.existsSync(vlib);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),  // falls back to default if missing
    title: "VLSI Tracker",
  });

  // In dev, load from Vite dev server. In prod, load built files.
  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL("http://localhost:4000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../build/client/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/**
 * Spawn a process with timeout and capture stdout/stderr.
 */
function spawnProcess(command, args, options = {}) {
  const { timeout = 30000, cwd } = options;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const proc = spawn(command, args, {
      cwd,
      shell: true,
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
    }, timeout);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout,
        stderr,
        killed,
        success: code === 0 && !killed,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout: "",
        stderr: err.message,
        killed: false,
        success: false,
      });
    });
  });
}

// ─── Vivado IPC ──────────────────────────────────────────────────────────────

ipcMain.handle("vivado:detect", async (_event, customPath) => {
  const fromEnvAndDefaults = [
    process.env.VIVADO,
    "C:\\AMDDesignTools\\2025.2\\Vivado\\bin",
    "C:\\AMDDesignTools\\2025.1\\Vivado\\bin",
    "C:\\AMDDesignTools\\2024.2\\Vivado\\bin",
    "C:\\Xilinx\\Vivado\\2025.2\\bin",
    "C:\\Xilinx\\Vivado\\2024.2\\bin",
    "C:\\Xilinx\\Vivado\\2024.1\\bin",
    "C:\\Xilinx\\Vivado\\2023.2\\bin",
    "C:\\Xilinx\\Vivado\\2023.1\\bin",
    "/opt/Xilinx/Vivado/2025.2/bin",
    "/opt/Xilinx/Vivado/2024.2/bin",
    "/opt/Xilinx/Vivado/2024.1/bin",
    "/opt/Xilinx/Vivado/2023.2/bin",
  ].filter(Boolean);

  const fromPath = getPathDirs();

  const fromCommonRoots = [];
  if (process.platform === "win32") {
    // C:\AMDDesignTools\<ver>\Vivado\bin
    for (const e of safeReadDir("C:\\AMDDesignTools")) {
      if (!e.isDirectory()) continue;
      fromCommonRoots.push(path.join("C:\\AMDDesignTools", e.name, "Vivado", "bin"));
    }
    // C:\Xilinx\Vivado\<ver>\bin
    for (const e of safeReadDir("C:\\Xilinx\\Vivado")) {
      if (!e.isDirectory()) continue;
      fromCommonRoots.push(path.join("C:\\Xilinx\\Vivado", e.name, "bin"));
    }
  }

  const candidates = uniq(
    (customPath ? [customPath] : []).concat(fromPath, fromEnvAndDefaults, fromCommonRoots),
  );

  for (const dir of candidates) {
    if (looksLikeVivadoBinDir(dir)) {
      const xvlog = path.join(dir, "xvlog" + (process.platform === "win32" ? ".bat" : ""));
      const result = await spawnProcess(xvlog, ["--version"], { timeout: 10000 });
      const versionMatch = result.stdout.match(/Vivado Simulator v([\d.]+)/i);
      return {
        available: true,
        path: dir,
        version: versionMatch ? versionMatch[1] : "unknown",
      };
    }
  }

  return { available: false, path: null, version: null };
});

ipcMain.handle("vivado:run", async (_event, { files, topModule, vivadoPath, timeout }) => {
  const tempDir = path.join(os.tmpdir(), "vlsi-vivado-" + Date.now());

  try {
    // Write files to temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    for (const file of files) {
      fs.writeFileSync(path.join(tempDir, file.name), file.content);
    }

    const xvlog = path.join(vivadoPath, "xvlog" + (process.platform === "win32" ? ".bat" : ""));
    const xelab = path.join(vivadoPath, "xelab" + (process.platform === "win32" ? ".bat" : ""));
    const xsim = path.join(vivadoPath, "xsim" + (process.platform === "win32" ? ".bat" : ""));

    const fileNames = files.map((f) => f.name);

    // Step 1: Compile
    const compileResult = await spawnProcess(xvlog, ["-sv", ...fileNames], {
      timeout: timeout / 3,
      cwd: tempDir,
    });
    if (!compileResult.success) {
      return {
        success: false,
        errors: [compileResult.stderr || compileResult.stdout],
        compileErrors: [compileResult.stderr || compileResult.stdout],
        elaborateErrors: [],
        warnings: [],
        output: compileResult.stdout,
        vcdPath: null,
      };
    }

    // Step 2: Elaborate
    const elabResult = await spawnProcess(xelab, ["-top", topModule, "-snapshot", "snap"], {
      timeout: timeout / 3,
      cwd: tempDir,
    });
    if (!elabResult.success) {
      return {
        success: false,
        errors: [elabResult.stderr || elabResult.stdout],
        compileErrors: [],
        elaborateErrors: [elabResult.stderr || elabResult.stdout],
        warnings: [],
        output: elabResult.stdout,
        vcdPath: null,
      };
    }

    // Step 3: Simulate
    const simResult = await spawnProcess(xsim, ["snap", "-runall"], {
      timeout: timeout / 3,
      cwd: tempDir,
    });

    // Find VCD file
    const vcdCandidates = ["output.vcd", "dump.vcd", "sim.vcd"].map((n) => path.join(tempDir, n));
    const vcdPath = vcdCandidates.find((p) => fs.existsSync(p)) || null;

    return {
      success: simResult.success,
      errors: simResult.success ? [] : [simResult.stderr || simResult.stdout],
      compileErrors: [],
      elaborateErrors: [],
      warnings: [],
      output: simResult.stdout,
      vcdPath,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err.message],
      compileErrors: [],
      elaborateErrors: [],
      warnings: [],
      output: "",
      vcdPath: null,
    };
  }
  // NOTE: tempDir cleanup is handled by fs:cleanup IPC call
});

// ─── QuestaSim IPC ───────────────────────────────────────────────────────────

ipcMain.handle("questa:detect", async (_event, customPath) => {
  const fromEnvAndDefaults = [
    process.env.QUESTASIM_PATH,
    "C:\\questasim\\win64",
    "C:\\questasim\\bin",
    "C:\\modeltech64_2024.1\\win64",
    "C:\\intelFPGA\\questa_fse\\win64",
    "C:\\intelFPGA\\20.1\\questa_fse\\win64",
    "/opt/questasim/linux_x86_64",
  ].filter(Boolean);

  const fromPath = getPathDirs();

  const fromCommonRoots = [];
  if (process.platform === "win32") {
    for (const e of safeReadDir("C:\\questasim")) {
      if (!e.isDirectory()) continue;
      fromCommonRoots.push(path.join("C:\\questasim", e.name));
      fromCommonRoots.push(path.join("C:\\questasim", e.name, "win64"));
    }
    for (const e of safeReadDir("C:\\intelFPGA")) {
      if (!e.isDirectory()) continue;
      fromCommonRoots.push(path.join("C:\\intelFPGA", e.name, "questa_fse", "win64"));
      fromCommonRoots.push(path.join("C:\\intelFPGA", e.name, "modelsim_ase", "win64"));
      fromCommonRoots.push(path.join("C:\\intelFPGA", e.name, "modelsim_ase", "win32aloem"));
    }
    // ModelSim/Questa can be installed in versioned roots like C:\modeltech64_XXXX.Y
    for (const e of safeReadDir("C:\\")) {
      if (!e.isDirectory()) continue;
      if (/^modeltech64_/i.test(e.name)) {
        fromCommonRoots.push(path.join("C:\\", e.name, "win64"));
      }
    }
  }

  const candidates = uniq(
    (customPath ? [customPath] : []).concat(fromPath, fromEnvAndDefaults, fromCommonRoots),
  );

  for (const dir of candidates) {
    if (looksLikeQuestaBinDir(dir)) {
      const vsim = path.join(dir, "vsim" + (process.platform === "win32" ? ".exe" : ""));
      const result = await spawnProcess(vsim, ["-version"], { timeout: 10000 });
      return {
        available: true,
        path: dir,
        version: result.stdout.trim().split("\n")[0] || "unknown",
      };
    }
  }

  return { available: false, path: null, version: null };
});

ipcMain.handle("questa:run", async (_event, { files, topModule, questaPath, timeout }) => {
  const tempDir = path.join(os.tmpdir(), "vlsi-questa-" + Date.now());

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    for (const file of files) {
      fs.writeFileSync(path.join(tempDir, file.name), file.content);
    }

    const vlog = path.join(questaPath, "vlog" + (process.platform === "win32" ? ".exe" : ""));
    const vsim = path.join(questaPath, "vsim" + (process.platform === "win32" ? ".exe" : ""));
    const vlib = path.join(questaPath, "vlib" + (process.platform === "win32" ? ".exe" : ""));
    const vmap = path.join(questaPath, "vmap" + (process.platform === "win32" ? ".exe" : ""));

    const fileNames = files.map((f) => f.name);

    // Create work library
    await spawnProcess(vlib, ["work"], { timeout: Math.max(3000, Math.floor(timeout / 10)), cwd: tempDir });
    await spawnProcess(vmap, ["work", "work"], { timeout: Math.max(3000, Math.floor(timeout / 10)), cwd: tempDir });

    // Compile
    const compileResult = await spawnProcess(vlog, ["-sv", ...fileNames], {
      timeout: timeout / 2,
      cwd: tempDir,
    });
    if (!compileResult.success) {
      return {
        success: false,
        compileLog: compileResult.stdout,
        simulationLog: "",
        runtimeLog: compileResult.stderr,
        transcript: compileResult.stdout + "\n" + compileResult.stderr,
        errors: [compileResult.stderr || compileResult.stdout],
        warnings: [],
        passed: false,
      };
    }

    // Simulate
    const transcriptPath = path.join(tempDir, "transcript.log");
    const simResult = await spawnProcess(
      vsim,
      ["-c", "-l", transcriptPath, topModule, "-do", `run -all; quit`],
      { timeout: timeout / 2, cwd: tempDir },
    );

    let transcript = simResult.stdout + "\n" + simResult.stderr;
    try {
      if (fs.existsSync(transcriptPath)) {
        transcript = fs.readFileSync(transcriptPath, "utf-8");
      }
    } catch {
      // keep best-effort transcript from stdout/stderr
    }

    const hasErrors = transcript.includes("** Error") || transcript.includes("Error:");
    const hasAssertionFail =
      transcript.includes("Assertion failed") || transcript.includes("UVM_FATAL");

    return {
      success: simResult.success && !hasErrors,
      compileLog: compileResult.stdout + (compileResult.stderr ? "\n" + compileResult.stderr : ""),
      simulationLog: transcript,
      runtimeLog: simResult.stderr || "",
      transcript,
      vcdPath: (["sim.vcd", "dump.vcd", "output.vcd"].map((n) => path.join(tempDir, n)).find((p) => fs.existsSync(p))) || null,
      errors: hasErrors
        ? transcript
            .split("\n")
            .filter((l) => l.includes("** Error") || l.includes("Error:"))
        : [],
      warnings: transcript
        .split("\n")
        .filter((l) => l.includes("** Warning")),
      passed: simResult.success && !hasErrors && !hasAssertionFail,
    };
  } catch (err) {
    return {
      success: false,
      transcript: "",
      compileLog: "",
      simulationLog: "",
      runtimeLog: "",
      errors: [err.message],
      warnings: [],
      passed: false,
    };
  }
});

// ─── File System IPC ─────────────────────────────────────────────────────────

ipcMain.handle("fs:writeTemp", async (_event, { dir, files }) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const file of files) {
      fs.writeFileSync(path.join(dir, file.name), file.content);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("fs:readFile", async (_event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("fs:cleanup", async (_event, dir) => {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── External URL ────────────────────────────────────────────────────────────

ipcMain.handle("shell:openExternal", async (_event, url) => {
  await shell.openExternal(url);
});
