/**
 * Testbench Generator
 * Generates Vivado-compatible testbenches with VCD dump support.
 */

/**
 * Generate a testbench for the given module ports.
 * @param {{ moduleName, ports, vcdFileName, simulationTime, clockPeriod, resetSequence }}
 * @returns {string} Complete testbench Verilog code
 */
export function generateTestbench({
  moduleName,
  ports,
  vcdFileName = "output.vcd",
  simulationTime = 1000,
  clockPeriod = 10,
  resetSequence = { duration: 20, activeHigh: false },
}) {
  const tbName = `tb_${moduleName}`;
  const lines = [];

  lines.push("`timescale 1ns / 1ps");
  lines.push("");
  lines.push(`module ${tbName}();`);
  lines.push("");

  // Declare testbench signals
  const inputSignals = ports.inputs || [];
  const outputSignals = ports.outputs || [];

  for (const port of inputSignals) {
    const range = port.width > 1 ? `[${port.width - 1}:0] ` : "";
    lines.push(`  reg ${range}${port.name};`);
  }

  for (const port of outputSignals) {
    const range = port.width > 1 ? `[${port.width - 1}:0] ` : "";
    lines.push(`  wire ${range}${port.name};`);
  }

  lines.push("");

  // Instantiate DUT
  lines.push(`  ${moduleName} dut (`);
  const portConnections = [...inputSignals, ...outputSignals].map(
    (p) => `    .${p.name}(${p.name})`
  );
  lines.push(portConnections.join(",\n"));
  lines.push("  );");
  lines.push("");

  // Clock generation
  const clockPorts = ports.clocks || [];
  if (clockPorts.length > 0) {
    const clk = clockPorts[0].name;
    lines.push(`  // Clock generation`);
    lines.push(`  initial ${clk} = 0;`);
    lines.push(`  always #${clockPeriod / 2} ${clk} = ~${clk};`);
    lines.push("");
  }

  // VCD dump (MUST be before stimulus for Vivado)
  lines.push(`  // VCD dump`);
  lines.push(`  initial begin`);
  lines.push(`    $dumpfile("${vcdFileName}");`);
  lines.push(`    $dumpvars(0, ${tbName});`);
  lines.push(`  end`);
  lines.push("");

  // Stimulus
  lines.push(`  // Stimulus`);
  lines.push(`  initial begin`);

  // Reset sequence
  const resetPorts = ports.resets || [];
  if (resetPorts.length > 0) {
    const rst = resetPorts[0].name;
    const resetVal = resetSequence.activeHigh ? 1 : 0;
    const activeVal = resetSequence.activeHigh ? 0 : 1;
    lines.push(`    // Reset sequence`);
    lines.push(`    ${rst} = ${resetVal};`);
    lines.push(`    #${resetSequence.duration};`);
    lines.push(`    ${rst} = ${activeVal};`);
    lines.push("");
  }

  // Apply stimulus to non-clock, non-reset inputs
  const otherInputs = inputSignals.filter(
    (p) => !p.name.match(/^(clk|clock|clk_i|rst|reset|rst_n|arst|nrst)$/i)
  );

  if (otherInputs.length > 0) {
    lines.push(`    // Apply stimulus`);
    for (const port of otherInputs) {
      const defaultVal = port.width > 1 ? `${port.width}'b0` : "0";
      lines.push(`    ${port.name} = ${defaultVal};`);
    }
    lines.push(`    #50;`);
    lines.push("");

    // Simple stimulus patterns
    lines.push(`    // Test vectors`);
    for (let i = 0; i < 4; i++) {
      for (const port of otherInputs) {
        if (port.width === 1) {
          lines.push(`    ${port.name} = ${i % 2};`);
        } else {
          lines.push(`    ${port.name} = ${port.width}'d${i + 1};`);
        }
      }
      lines.push(`    #20;`);
    }
    lines.push("");
  } else {
    // No non-clock inputs — just wait
    lines.push(`    // Wait for simulation`);
    lines.push(`    #100;`);
    lines.push("");
  }

  lines.push(`    $finish;`);
  lines.push(`  end`);
  lines.push("");
  lines.push("endmodule");

  return lines.join("\n");
}
