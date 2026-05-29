/**
 * Transcript Analyzer
 * Parses pasted simulation output from EDA Playground or QuestaSim.
 * Extracts errors, warnings, assertions, and simulation result.
 */

/**
 * Parse simulation transcript text into structured data.
 * Handles output from VCS, Xcelium, QuestaSim, Verilator, and generic $display.
 * @param {string} rawText - pasted simulation output
 * @returns {object} parsed transcript data
 */
export function parseTranscript(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return {
      errors: [],
      warnings: [],
      assertions: [],
      simulationResult: "unknown",
      summary: "No output to analyze.",
    };
  }

  const lines = rawText.split("\n");
  const errors = [];
  const warnings = [];
  const assertions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Error patterns (VCS, Xcelium, QuestaSim, Verilator)
    if (
      line.match(/\*\* Error/i) ||
      line.match(/\*\*ERROR/i) ||
      line.match(/^Error:/i) ||
      line.match(/error:/i) ||
      line.match(/fatal/i) ||
      line.match(/\$error/i)
    ) {
      errors.push({ line: i + 1, message: line, severity: "error" });
    }

    // Warning patterns
    if (
      line.match(/\*\* Warning/i) ||
      line.match(/\*\*WARNING/i) ||
      line.match(/^Warning:/i) ||
      line.match(/warning:/i)
    ) {
      warnings.push({ line: i + 1, message: line });
    }

    // Assertion failures
    const assertMatch = line.match(
      /assert(?:ion)?\s*(?:fail|error).*?(?:time\s*[=:]\s*(\d+))?/i,
    );
    if (assertMatch) {
      assertions.push({
        name: `assertion_line_${i + 1}`,
        status: "failed",
        message: line,
        time: assertMatch[1] ? parseInt(assertMatch[1]) : null,
      });
    }

    // SVA assertion patterns
    const svaMatch = line.match(
      /\$assert(?:fail|error).*?(?:at\s+time\s+(\d+))?/i,
    );
    if (svaMatch) {
      assertions.push({
        name: `sva_line_${i + 1}`,
        status: "failed",
        message: line,
        time: svaMatch[1] ? parseInt(svaMatch[1]) : null,
      });
    }
  }

  // Determine simulation result
  let simulationResult = "unknown";
  if (
    rawText.includes("Simulation complete") ||
    rawText.includes("$finish") ||
    rawText.includes("V C S   S i m u l a t i o n") ||
    rawText.includes("--- UVM Report Summary ---")
  ) {
    simulationResult = errors.length === 0 ? "pass" : "fail";
  }
  if (errors.length > 0) {
    simulationResult = "fail";
  }

  // Build summary
  let summary = "";
  if (simulationResult === "pass") {
    summary = "Simulation completed successfully.";
  } else if (simulationResult === "fail") {
    summary = `Simulation failed with ${errors.length} error(s), ${warnings.length} warning(s), ${assertions.length} assertion failure(s).`;
  } else {
    summary = `Parsed ${errors.length} error(s), ${warnings.length} warning(s), ${assertions.length} assertion(s). Result: ${simulationResult}.`;
  }

  return { errors, warnings, assertions, simulationResult, summary };
}
