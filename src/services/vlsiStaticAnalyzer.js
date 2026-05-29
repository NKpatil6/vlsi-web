/**
 * VLSI Static Code Analyzer
 * Pattern-matching engine for Verilog/SystemVerilog anti-patterns.
 * Runs instantly without AI or simulator dependency.
 */

function parseBlocks(code) {
  const lines = code.split("\n");
  const blocks = [];
  let currentBlock = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    const seqMatch = trimmed.match(
      /^always\s+@\s*\(\s*posedge\s+(\w+)\s*(?:or\s+posedge\s+(\w+))?\s*\)/i,
    );
    const comboMatch = trimmed.match(
      /^always\s+@\s*\(\s*\*\s*\)|^always_comb\b|^always\s+@\s*\*/i,
    );
    const assignMatch = trimmed.match(/^assign\s+/i);

    if (seqMatch) {
      currentBlock = {
        type: "sequential",
        clock: seqMatch[1],
        reset: seqMatch[2] || null,
        startLine: lineNum,
        lines: [],
        content: "",
      };
      if (trimmed.includes("begin")) braceDepth++;
    } else if (comboMatch) {
      currentBlock = {
        type: "combinational",
        startLine: lineNum,
        lines: [],
        content: "",
      };
      if (trimmed.includes("begin")) braceDepth++;
    } else if (assignMatch) {
      blocks.push({
        type: "assign",
        startLine: lineNum,
        lines: [lineNum],
        content: trimmed,
      });
      currentBlock = null;
    }

    if (currentBlock) {
      currentBlock.lines.push(lineNum);
      currentBlock.content += line + "\n";
      if (trimmed.includes("begin")) braceDepth++;
      if (trimmed.includes("end")) braceDepth--;
      if (braceDepth <= 0 && currentBlock.lines.length > 1) {
        blocks.push(currentBlock);
        currentBlock = null;
        braceDepth = 0;
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);
  return blocks;
}

const CHECKERS = [
  {
    name: "blocking-in-sequential",
    category: "Blocking Assignment",
    severity: "error",
    check(blocks) {
      const issues = [];
      for (const block of blocks) {
        if (block.type !== "sequential") continue;
        const lines = block.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("//")) continue;
          const match = line.match(/^(\w+(?:\[.*?\])?)\s*=\s*[^=]/);
          if (match && !line.match(/^(?:parameter|localparam)\b/)) {
            issues.push({
              line: block.startLine + i,
              category: "Blocking Assignment",
              severity: "error",
              message: `Blocking assignment to '${match[1]}' in sequential block. Use <= for proper synthesis.`,
              suggestion: `Change '${match[1]} = ...' to '${match[1]} <= ...'`,
            });
          }
        }
      }
      return issues;
    },
  },
  {
    name: "nonblocking-in-combo",
    category: "Non-blocking in Combinational",
    severity: "warning",
    check(blocks) {
      const issues = [];
      for (const block of blocks) {
        if (block.type !== "combinational") continue;
        const lines = block.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("//")) continue;
          const match = line.match(/(\w+(?:\[.*?\])?)\s*<=\s*/);
          if (match) {
            issues.push({
              line: block.startLine + i,
              category: "Non-blocking in Combinational",
              severity: "warning",
              message: `Non-blocking assignment to '${match[1]}' in combinational block. Use blocking (=).`,
              suggestion: `Change '${match[1]} <= ...' to '${match[1]} = ...'`,
            });
          }
        }
      }
      return issues;
    },
  },
  {
    name: "latch-inference",
    category: "Latch Inference",
    severity: "error",
    check(blocks) {
      const issues = [];
      for (const block of blocks) {
        if (block.type !== "combinational") continue;
        const content = block.content;
        const ifCount = (content.match(/\bif\s*\(/g) || []).length;
        const elseCount = (content.match(/\belse\b/g) || []).length;
        if (ifCount > 0 && elseCount < ifCount) {
          issues.push({
            line: block.startLine,
            category: "Latch Inference",
            severity: "error",
            message: "Combinational block has if without else. This infers a latch.",
            suggestion: "Add an else clause to cover all conditions.",
          });
        }
        const caseMatch = content.match(/\bcase[xz]?\s*\(/);
        const hasDefault = content.match(/\bdefault\s*:/);
        if (caseMatch && !hasDefault) {
          issues.push({
            line: block.startLine,
            category: "Latch Inference",
            severity: "error",
            message: "Case without default in combinational block infers a latch.",
            suggestion: "Add a default clause to the case statement.",
          });
        }
      }
      return issues;
    },
  },
  {
    name: "missing-reset",
    category: "Missing Reset",
    severity: "warning",
    check(blocks) {
      const issues = [];
      for (const block of blocks) {
        if (block.type !== "sequential") continue;
        if (block.reset) continue;
        const hasResetCheck = block.content.match(
          /\b(?:if\s*\(\s*!?\s*(?:rst|reset|nrst|arst))/i,
        );
        if (!hasResetCheck) {
          issues.push({
            line: block.startLine,
            category: "Missing Reset",
            severity: "warning",
            message: "Sequential block has no reset. Registers may power up in unknown state.",
            suggestion: "Add async reset: always @(posedge clk or posedge rst) if (rst) ...",
          });
        }
      }
      return issues;
    },
  },
  {
    name: "long-combo-path",
    category: "Timing - Long Combinational Path",
    severity: "warning",
    check(blocks) {
      const issues = [];
      for (const block of blocks) {
        if (block.type !== "combinational") continue;
        const ops =
          block.content.match(/[+\-*/%&|^~!<>?:]|&&|\|\||>>|<</g) || [];
        if (ops.length > 12) {
          issues.push({
            line: block.startLine,
            category: "Timing - Long Combinational Path",
            severity: "warning",
            message: `Combinational block has ${ops.length} operators. May cause setup time violations at high frequencies.`,
            suggestion: "Consider pipelining: split the logic across multiple clock cycles.",
          });
        }
      }
      return issues;
    },
  },
  {
    name: "case-no-default",
    category: "Incomplete Case",
    severity: "warning",
    check(blocks, code) {
      const issues = [];
      const lines = code.split("\n");
      let inCase = false;
      let caseLine = 0;
      let hasDefault = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/\bcase[xz]?\s*\(/)) {
          inCase = true;
          caseLine = i + 1;
          hasDefault = false;
        }
        if (inCase) {
          if (line.match(/\bdefault\s*:/)) hasDefault = true;
          if (line.match(/\bendcase\b/)) {
            if (!hasDefault) {
              issues.push({
                line: caseLine,
                category: "Incomplete Case",
                severity: "warning",
                message: "Case statement without default clause.",
                suggestion: "Add a default: branch to handle unexpected values.",
              });
            }
            inCase = false;
          }
        }
      }
      return issues;
    },
  },
];

export function analyzeCode(code) {
  if (!code || typeof code !== "string") {
    return {
      passed: true,
      score: 100,
      errors: [],
      warnings: [],
      summary: "No code to analyze.",
    };
  }

  const blocks = parseBlocks(code);
  const allIssues = [];

  for (const checker of CHECKERS) {
    try {
      allIssues.push(...checker.check(blocks, code));
    } catch (e) {
      console.warn(`VLSI checker '${checker.name}' failed:`, e);
    }
  }

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  let score = 100 - errors.length * 15 - warnings.length * 5;
  score = Math.max(0, Math.min(100, score));

  const passed = errors.length === 0;
  const summary = passed
    ? warnings.length === 0
      ? "No VLSI issues detected."
      : `${warnings.length} warning(s) found but no critical errors.`
    : `${errors.length} error(s) and ${warnings.length} warning(s) found.`;

  return { passed, score, errors, warnings, summary };
}
