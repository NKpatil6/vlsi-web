/**
 * Waveform Comparator
 * Compares two sets of VCD signal data (expected vs actual).
 * Only compares top-level output ports.
 */

import { parseVcd, extractOutputSignals, normalizeSignals } from "./vcdParser";

/**
 * Compare two VCD files for behavioral equivalence.
 * @param {{ expectedVcd: string, actualVcd: string, outputPorts: string[], toleranceCycles?: number, ignoreXZ?: boolean }}
 * @returns {{ passed, score, mismatches, summary }}
 */
export function compareWaveforms({
  expectedVcd,
  actualVcd,
  outputPorts,
  toleranceCycles = 1,
  ignoreXZ = true,
}) {
  if (!expectedVcd || !actualVcd) {
    return {
      passed: false,
      score: 0,
      mismatches: [],
      summary: "Missing VCD data for comparison.",
    };
  }

  // Parse both VCD files
  const expected = parseVcd(expectedVcd);
  const actual = parseVcd(actualVcd);

  // Extract only output port signals
  const expectedSignals = extractOutputSignals(expected, outputPorts);
  const actualSignals = extractOutputSignals(actual, outputPorts);

  // Normalize for comparison
  const normExpected = normalizeSignals(expectedSignals);
  const normActual = normalizeSignals(actualSignals);

  // Compute tolerance in time units
  const timescaleNs = parseTimescaleToNs(expected.timescale);
  const toleranceNs = toleranceCycles * timescaleNs * 10; // assume 10ns clock

  // Compare each output port
  const mismatches = [];
  let comparedSignals = 0;
  let matchedSignals = 0;

  for (const portName of outputPorts) {
    const exp = normExpected[portName] || [];
    const act = normActual[portName] || [];

    comparedSignals++;

    if (exp.length === 0 && act.length === 0) {
      matchedSignals++;
      continue;
    }

    if (exp.length === 0) {
      mismatches.push({
        signal: portName,
        expectedTime: null,
        actualTime: act[0]?.time,
        expectedValue: "(no transitions)",
        actualValue: act[0]?.value,
        description: `Signal '${portName}' has no transitions in expected but has ${act.length} in actual.`,
      });
      continue;
    }

    if (act.length === 0) {
      mismatches.push({
        signal: portName,
        expectedTime: exp[0]?.time,
        actualTime: null,
        expectedValue: exp[0]?.value,
        actualValue: "(no transitions)",
        description: `Signal '${portName}' has ${exp.length} transitions in expected but none in actual.`,
      });
      continue;
    }

    // Compare transition-by-transition
    const maxLen = Math.max(exp.length, act.length);
    let signalMatched = true;

    for (let i = 0; i < maxLen; i++) {
      const e = exp[i];
      const a = act[i];

      if (!e) {
        mismatches.push({
          signal: portName,
          expectedTime: null,
          actualTime: a.time,
          expectedValue: "(end of transitions)",
          actualValue: a.value,
          description: `Signal '${portName}' has extra transition at ${a.time}: value=${a.value}`,
        });
        signalMatched = false;
        break;
      }

      if (!a) {
        mismatches.push({
          signal: portName,
          expectedTime: e.time,
          actualTime: null,
          expectedValue: e.value,
          actualValue: "(end of transitions)",
          description: `Signal '${portName}' missing transition at ${e.time}: expected value=${e.value}`,
        });
        signalMatched = false;
        break;
      }

      // Check value match
      const valueMatch = ignoreXZ
        ? normalizeForCompare(e.value) === normalizeForCompare(a.value)
        : e.value === a.value;

      // Check time match (within tolerance)
      const timeMatch = Math.abs(e.time - a.time) <= toleranceNs;

      if (!valueMatch && !timeMatch) {
        mismatches.push({
          signal: portName,
          expectedTime: e.time,
          actualTime: a.time,
          expectedValue: e.value,
          actualValue: a.value,
          description: `Signal '${portName}': expected ${e.value} at ${e.time}, got ${a.value} at ${a.time}`,
        });
        signalMatched = false;
        break;
      } else if (!valueMatch) {
        mismatches.push({
          signal: portName,
          expectedTime: e.time,
          actualTime: a.time,
          expectedValue: e.value,
          actualValue: a.value,
          description: `Signal '${portName}': value mismatch at ${e.time}: expected ${e.value}, got ${a.value}`,
        });
        signalMatched = false;
        break;
      } else if (!timeMatch) {
        const delay = a.time - e.time;
        const cyclesOff = Math.round(delay / (timescaleNs * 10));
        mismatches.push({
          signal: portName,
          expectedTime: e.time,
          actualTime: a.time,
          expectedValue: e.value,
          actualValue: a.value,
          description: `Signal '${portName}': delayed by ${cyclesOff} cycle(s) — expected at ${e.time}, got at ${a.time}`,
        });
        signalMatched = false;
        break;
      }
    }

    if (signalMatched) matchedSignals++;
  }

  const passed = mismatches.length === 0;
  const score = comparedSignals > 0
    ? Math.round((matchedSignals / comparedSignals) * 100)
    : 0;

  const summary = passed
    ? `All ${comparedSignals} output port(s) match between expected and actual waveforms.`
    : `${mismatches.length} mismatch(es) found across ${comparedSignals} output port(s).`;

  return { passed, score, mismatches, summary };
}

function normalizeForCompare(value) {
  if (!value) return "0";
  return value.replace(/^0+/, "") || "0";
}

function parseTimescaleToNs(timescale) {
  const match = timescale.match(/(\d+)\s*(s|ms|us|ns|ps)/i);
  if (!match) return 1;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1e9, ms: 1e6, us: 1e3, ns: 1, ps: 0.001 };
  return val * (multipliers[unit] || 1);
}
