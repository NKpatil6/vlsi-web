/**
 * Port Extractor
 * Parses Verilog/SystemVerilog module declarations to extract port information.
 */

/**
 * Extract port information from Verilog module declaration.
 * Supports both ANSI and non-ANSI port styles.
 * @param {string} code - Verilog source code
 * @returns {object} { moduleName, inputs, outputs, clocks, resets }
 */
export function extractPorts(code) {
  if (!code) return { moduleName: "unknown", inputs: [], outputs: [], clocks: [], resets: [] };

  // Extract module name
  const moduleMatch = code.match(/\bmodule\s+(\w+)/);
  const moduleName = moduleMatch ? moduleMatch[1] : "unknown";

  const inputs = [];
  const outputs = [];

  // ANSI port declarations: input [7:0] data_in, output reg [3:0] count
  const inputRegex = /\binput\s+(?:logic|wire|reg)?\s*(?:\[([^\]]+)\])?\s*(\w+)/g;
  const outputRegex = /\boutput\s+(?:logic|wire|reg)?\s*(?:\[([^\]]+)\])?\s*(\w+)/g;

  let match;
  while ((match = inputRegex.exec(code)) !== null) {
    inputs.push({
      name: match[2],
      width: match[1] ? parseWidth(match[1]) : 1,
      range: match[1] || null,
    });
  }
  while ((match = outputRegex.exec(code)) !== null) {
    outputs.push({
      name: match[2],
      width: match[1] ? parseWidth(match[1]) : 1,
      range: match[1] || null,
      isReg: /output\s+reg\b/.test(
        code.substring(match.index - 20, match.index + match[0].length + 5),
      ),
    });
  }

  // Detect clocks from sensitivity lists
  const clocks = new Set();
  const clockMatches = code.matchAll(/posedge\s+(\w+)/g);
  for (const m of clockMatches) {
    const name = m[1];
    if (!name.match(/^(?:rst|reset|nrst|arst|set|clear)$/i)) {
      clocks.add(name);
    }
  }

  // Detect resets
  const resets = new Set();
  const resetMatches = code.matchAll(
    /posedge\s+(rst\w*|reset|nrst|arst)/gi,
  );
  for (const m of resetMatches) {
    resets.add(m[1]);
  }

  return {
    moduleName,
    inputs,
    outputs,
    clocks: [...clocks].map((name) => ({ name })),
    resets: [...resets].map((name) => ({ name })),
  };
}

function parseWidth(rangeStr) {
  const match = rangeStr.match(/(\d+)\s*:\s*(\d+)/);
  if (match) {
    return Math.abs(parseInt(match[1]) - parseInt(match[2])) + 1;
  }
  return 1;
}
