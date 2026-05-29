/**
 * VCD Parser
 * Parses Value Change Dump files into structured signal data.
 * Uses a minimal parser targeting the subset needed for RTL validation.
 *
 * VCD Format (IEEE 1364):
 * $timescale <scale> $end
 * $scope module <name> $end
 * $var <type> <width> <id> <name> $end
 * $enddefinitions $end
 * #<timestamp>
 * <value><id>
 */

/**
 * Parse a VCD file content into structured data.
 * @param {string} content - Raw VCD file content
 * @returns {{ timescale: string, signals: { [name]: [{ time, value }] } }}
 */
export function parseVcd(content) {
  if (!content || typeof content !== "string") {
    return { timescale: "1ns", signals: {} };
  }

  const lines = content.split("\n");
  let timescale = "1ns";
  let currentTime = 0;
  const varMap = {}; // id -> { name, width }
  const signals = {};
  let inDefinitions = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse timescale
    const tsMatch = trimmed.match(/\$timescale\s+(.+?)\s+\$end/);
    if (tsMatch) {
      timescale = tsMatch[1].trim();
      continue;
    }

    // Parse variable declarations
    const varMatch = trimmed.match(
      /\$var\s+(\w+)\s+(\d+)\s+(\S+)\s+(\S+)(?:\s+\[[\d:]+\])?\s+\$end/
    );
    if (varMatch) {
      const [, type, width, id, name] = varMatch;
      varMap[id] = { name, width: parseInt(width), type };
      if (!signals[name]) signals[name] = [];
      continue;
    }

    // End of definitions
    if (trimmed === "$enddefinitions $end") {
      inDefinitions = false;
      continue;
    }

    if (inDefinitions) continue;

    // Parse timestamp
    if (trimmed.startsWith("#")) {
      currentTime = parseInt(trimmed.substring(1), 10);
      continue;
    }

    // Parse scalar value change (0/1/x/z + id)
    const scalarMatch = trimmed.match(/^([01xXzZ])(\S+)$/);
    if (scalarMatch) {
      const [, value, id] = scalarMatch;
      const v = varMap[id];
      if (v && signals[v.name]) {
        signals[v.name].push({ time: currentTime, value });
      }
      continue;
    }

    // Parse vector value change (b<binary> <id>)
    const vectorMatch = trimmed.match(/^b(\S+)\s+(\S+)$/);
    if (vectorMatch) {
      const [, value, id] = vectorMatch;
      const v = varMap[id];
      if (v && signals[v.name]) {
        signals[v.name].push({ time: currentTime, value });
      }
      continue;
    }
  }

  return { timescale, signals };
}

/**
 * Extract only output port signals from parsed VCD data.
 * @param {{ timescale, signals }} parsedVcd - Parsed VCD data
 * @param {string[]} outputPortNames - Names of output ports to extract
 * @returns {{ [name]: [{ time, value }] }}
 */
export function extractOutputSignals(parsedVcd, outputPortNames) {
  const result = {};
  for (const name of outputPortNames) {
    // Try exact match first, then try with scope prefix
    if (parsedVcd.signals[name]) {
      result[name] = parsedVcd.signals[name];
    } else {
      // Try matching with scope prefix (e.g., "dut.out" matches "out")
      const scopedName = Object.keys(parsedVcd.signals).find(
        (k) => k.endsWith(`.${name}`) || k === name
      );
      if (scopedName) {
        result[name] = parsedVcd.signals[scopedName];
      } else {
        result[name] = [];
      }
    }
  }
  return result;
}

/**
 * Normalize VCD signals for comparison.
 * Strips leading zeros from bus values, normalizes X/Z handling.
 */
export function normalizeSignals(signals) {
  const normalized = {};
  for (const [name, transitions] of Object.entries(signals)) {
    normalized[name] = transitions.map((t) => ({
      time: t.time,
      value: normalizeValue(t.value),
    }));
  }
  return normalized;
}

function normalizeValue(value) {
  if (!value) return "0";
  // For bus values (binary strings), remove leading zeros but keep at least one digit
  if (value.match(/^[01]+$/)) {
    return value.replace(/^0+/, "") || "0";
  }
  return value.toLowerCase();
}
