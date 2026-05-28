/**
 * Comprehensive VLSI syllabus with proper track separation
 * Design Track → Verification Track progression
 */

export const TOPICS = [
  // ===== DIGITAL DESIGN TRACK =====
  {
    id: "dd-01",
    title: "Number Systems",
    track: "design",
    order: 1,
    prerequisites: [],
    description:
      "Binary, octal, hexadecimal, decimal conversions and arithmetic operations.",
    estimatedHours: 4,
    difficulty: "beginner",
    subtopics: [
      "Binary number system",
      "Octal and hexadecimal",
      "Number base conversions",
      "Binary arithmetic",
      "Signed number representations",
      "2s complement",
    ],
    learningObjectives: [
      "Convert between different number systems",
      "Perform binary arithmetic operations",
      "Understand signed number representations",
    ],
  },
  {
    id: "dd-02",
    title: "Boolean Algebra",
    track: "design",
    order: 2,
    prerequisites: ["dd-01"],
    description: "Boolean operations, laws, theorems, and De Morgan's laws.",
    estimatedHours: 6,
    difficulty: "beginner",
    subtopics: [
      "Boolean operations (AND, OR, NOT)",
      "Boolean laws and theorems",
      "De Morgan's laws",
      "Boolean expression simplification",
      "SOP and POS forms",
    ],
    learningObjectives: [
      "Apply Boolean algebra laws",
      "Simplify Boolean expressions",
      "Convert between SOP and POS forms",
    ],
  },
  {
    id: "dd-03",
    title: "Logic Gates",
    track: "design",
    order: 3,
    prerequisites: ["dd-02"],
    description:
      "Fundamental logic gates, truth tables, and gate-level implementations.",
    estimatedHours: 5,
    difficulty: "beginner",
    subtopics: [
      "Basic gates (AND, OR, NOT)",
      "Universal gates (NAND, NOR)",
      "XOR and XNOR gates",
      "Truth tables",
      "Gate delays",
      "Multi-input gates",
    ],
    learningObjectives: [
      "Identify and use different logic gates",
      "Create truth tables",
      "Understand gate-level timing",
    ],
  },
  {
    id: "dd-04",
    title: "Karnaugh Maps",
    track: "design",
    order: 4,
    prerequisites: ["dd-02", "dd-03"],
    description: "K-map minimization techniques for Boolean functions.",
    estimatedHours: 6,
    difficulty: "intermediate",
    subtopics: [
      "2-variable K-maps",
      "3-variable K-maps",
      "4-variable K-maps",
      "Prime implicants",
      "Essential prime implicants",
      "Don't care conditions",
    ],
    learningObjectives: [
      "Minimize Boolean functions using K-maps",
      "Identify prime and essential prime implicants",
      "Handle don't care conditions",
    ],
  },
  {
    id: "dd-05",
    title: "Combinational Logic",
    track: "design",
    order: 5,
    prerequisites: ["dd-03", "dd-04"],
    description:
      "Multiplexers, demultiplexers, encoders, decoders, and comparators.",
    estimatedHours: 8,
    difficulty: "intermediate",
    subtopics: [
      "Multiplexers (2:1, 4:1, 8:1)",
      "Demultiplexers",
      "Encoders and priority encoders",
      "Decoders",
      "Magnitude comparators",
      "Parity generators",
    ],
    learningObjectives: [
      "Design combinational circuits using MUX/DEMUX",
      "Implement encoders and decoders",
      "Build comparators and parity circuits",
    ],
  },
  {
    id: "dd-06",
    title: "Adders and Subtractors",
    track: "design",
    order: 6,
    prerequisites: ["dd-05"],
    description:
      "Half adder, full adder, ripple carry adder, and arithmetic circuits.",
    estimatedHours: 6,
    difficulty: "intermediate",
    subtopics: [
      "Half adder",
      "Full adder",
      "Ripple carry adder",
      "Carry look-ahead adder",
      "Half subtractor",
      "Full subtractor",
      "BCD adder",
    ],
    learningObjectives: [
      "Design adder and subtractor circuits",
      "Understand carry propagation",
      "Implement arithmetic units",
    ],
  },
  {
    id: "dd-07",
    title: "Sequential Logic Basics",
    track: "design",
    order: 7,
    prerequisites: ["dd-05"],
    description: "Latches, flip-flops, and sequential circuit fundamentals.",
    estimatedHours: 8,
    difficulty: "intermediate",
    subtopics: [
      "SR latch",
      "D latch",
      "SR flip-flop",
      "D flip-flop",
      "JK flip-flop",
      "T flip-flop",
      "Master-slave flip-flops",
      "Edge-triggered flip-flops",
    ],
    learningObjectives: [
      "Differentiate between latches and flip-flops",
      "Design sequential storage elements",
      "Understand clock triggering",
    ],
  },
  {
    id: "dd-08",
    title: "Finite State Machines",
    track: "design",
    order: 8,
    prerequisites: ["dd-07"],
    description: "Moore and Mealy FSMs, state diagrams, and state encoding.",
    estimatedHours: 10,
    difficulty: "intermediate",
    subtopics: [
      "FSM fundamentals",
      "Moore machines",
      "Mealy machines",
      "State diagrams",
      "State tables",
      "State minimization",
      "State encoding techniques",
    ],
    learningObjectives: [
      "Design Moore and Mealy FSMs",
      "Create state diagrams and tables",
      "Minimize and encode states",
    ],
  },
  {
    id: "dd-09",
    title: "Counters",
    track: "design",
    order: 9,
    prerequisites: ["dd-07"],
    description:
      "Synchronous and asynchronous counters, up/down counters, and modulo counters.",
    estimatedHours: 7,
    difficulty: "intermediate",
    subtopics: [
      "Asynchronous counters",
      "Synchronous counters",
      "Up counters",
      "Down counters",
      "Up-down counters",
      "Modulo-N counters",
      "Ring counters",
      "Johnson counters",
    ],
    learningObjectives: [
      "Design synchronous and asynchronous counters",
      "Implement modulo-N counters",
      "Build special-purpose counters",
    ],
  },
  {
    id: "dd-10",
    title: "Registers and Shift Registers",
    track: "design",
    order: 10,
    prerequisites: ["dd-07"],
    description:
      "Parallel and serial registers, SISO, SIPO, PISO, PIPO configurations.",
    estimatedHours: 6,
    difficulty: "intermediate",
    subtopics: [
      "Parallel-in parallel-out (PIPO)",
      "Serial-in serial-out (SISO)",
      "Serial-in parallel-out (SIPO)",
      "Parallel-in serial-out (PISO)",
      "Bidirectional shift registers",
      "Universal shift registers",
    ],
    learningObjectives: [
      "Design different register types",
      "Implement shift register operations",
      "Build universal shift registers",
    ],
  },
  {
    id: "dd-11",
    title: "Memory Fundamentals",
    track: "design",
    order: 11,
    prerequisites: ["dd-07"],
    description: "RAM, ROM, SRAM, DRAM architecture and operations.",
    estimatedHours: 8,
    difficulty: "advanced",
    subtopics: [
      "Memory hierarchy",
      "RAM architecture",
      "ROM types (PROM, EPROM, EEPROM)",
      "SRAM cell design",
      "DRAM cell design",
      "Memory organization",
      "Address decoding",
      "Memory timing",
    ],
    learningObjectives: [
      "Understand memory architectures",
      "Design memory cells",
      "Implement address decoding",
    ],
  },
  {
    id: "dd-12",
    title: "Verilog HDL Basics",
    track: "design",
    order: 12,
    prerequisites: ["dd-08"],
    description: "Verilog syntax, modules, data types, and basic constructs.",
    estimatedHours: 12,
    difficulty: "intermediate",
    subtopics: [
      "Module structure",
      "Data types (wire, reg)",
      "Operators",
      "Continuous assignment",
      "Procedural blocks (always, initial)",
      "Blocking vs non-blocking",
      "Testbenches",
      "Simulation basics",
    ],
    learningObjectives: [
      "Write basic Verilog modules",
      "Understand blocking vs non-blocking",
      "Create testbenches",
    ],
  },
  {
    id: "dd-13",
    title: "RTL Design Principles",
    track: "design",
    order: 13,
    prerequisites: ["dd-12"],
    description:
      "Register Transfer Level design, coding guidelines, and synthesis.",
    estimatedHours: 15,
    difficulty: "advanced",
    subtopics: [
      "RTL coding style",
      "Synthesizable constructs",
      "FSM coding",
      "Parameterized modules",
      "Generate statements",
      "Timing and synthesis",
      "Code optimization",
      "Design hierarchy",
    ],
    learningObjectives: [
      "Write synthesizable RTL code",
      "Follow RTL coding guidelines",
      "Design hierarchical modules",
    ],
  },
  {
    id: "dd-14",
    title: "Timing Analysis Basics",
    track: "design",
    order: 14,
    prerequisites: ["dd-13"],
    description:
      "Setup time, hold time, clock-to-Q delay, and timing constraints.",
    estimatedHours: 10,
    difficulty: "advanced",
    subtopics: [
      "Clock domains",
      "Setup time",
      "Hold time",
      "Clock-to-Q delay",
      "Propagation delay",
      "Clock skew",
      "Timing paths",
      "Critical path analysis",
    ],
    learningObjectives: [
      "Understand timing parameters",
      "Analyze timing paths",
      "Identify timing violations",
    ],
  },

  // ===== DESIGN VERIFICATION TRACK =====
  {
    id: "dv-01",
    title: "Verification Fundamentals",
    track: "verification",
    order: 15,
    prerequisites: ["dd-13"],
    description:
      "Introduction to design verification, testbenches, and verification planning.",
    estimatedHours: 8,
    difficulty: "intermediate",
    subtopics: [
      "Verification vs validation",
      "Verification methodologies",
      "Testbench architecture",
      "Stimulus generation",
      "Response checking",
      "Coverage metrics",
      "Verification plan",
    ],
    learningObjectives: [
      "Understand verification principles",
      "Create verification plans",
      "Build basic testbenches",
    ],
  },
  {
    id: "dv-02",
    title: "SystemVerilog Basics",
    track: "verification",
    order: 16,
    prerequisites: ["dv-01"],
    description:
      "SystemVerilog data types, procedural statements, and OOP concepts.",
    estimatedHours: 15,
    difficulty: "advanced",
    subtopics: [
      "Data types (logic, bit, byte, etc.)",
      "Arrays (packed, unpacked, dynamic)",
      "Queues and associative arrays",
      "Structures and unions",
      "Classes and objects",
      "Inheritance and polymorphism",
      "Interfaces",
      "Packages",
    ],
    learningObjectives: [
      "Write SystemVerilog code",
      "Use advanced data types",
      "Implement OOP concepts",
    ],
  },
  {
    id: "dv-03",
    title: "Constrained Random Verification",
    track: "verification",
    order: 17,
    prerequisites: ["dv-02"],
    description: "Randomization, constraints, and directed random testing.",
    estimatedHours: 12,
    difficulty: "advanced",
    subtopics: [
      "Random variables",
      "Randomization methods",
      "Constraint blocks",
      "Constraint operators",
      "Distribution constraints",
      "Pre/post randomize",
      "Random stability",
    ],
    learningObjectives: [
      "Implement constrained random tests",
      "Write effective constraints",
      "Control randomization",
    ],
  },
  {
    id: "dv-04",
    title: "Functional Coverage",
    track: "verification",
    order: 18,
    prerequisites: ["dv-02"],
    description:
      "Covergroups, coverpoints, cross coverage, and coverage analysis.",
    estimatedHours: 10,
    difficulty: "advanced",
    subtopics: [
      "Coverage types",
      "Covergroups",
      "Coverpoints",
      "Bins and ranges",
      "Cross coverage",
      "Coverage options",
      "Coverage analysis",
      "Coverage closure",
    ],
    learningObjectives: [
      "Create functional coverage models",
      "Analyze coverage results",
      "Achieve coverage closure",
    ],
  },
  {
    id: "dv-05",
    title: "Assertions (SVA)",
    track: "verification",
    order: 19,
    prerequisites: ["dv-02"],
    description:
      "SystemVerilog Assertions for property checking and formal verification.",
    estimatedHours: 12,
    difficulty: "advanced",
    subtopics: [
      "Immediate assertions",
      "Concurrent assertions",
      "Sequence operators",
      "Property operators",
      "Implication",
      "Temporal operators",
      "Assertion directives",
      "Formal verification basics",
    ],
    learningObjectives: [
      "Write effective assertions",
      "Use temporal logic",
      "Debug with assertions",
    ],
  },
  {
    id: "dv-06",
    title: "UVM Fundamentals",
    track: "verification",
    order: 20,
    prerequisites: ["dv-03", "dv-04"],
    description:
      "Universal Verification Methodology basics, components, and TLM.",
    estimatedHours: 20,
    difficulty: "advanced",
    subtopics: [
      "UVM architecture",
      "UVM base classes",
      "UVM components",
      "TLM communication",
      "Sequence items",
      "Sequences and sequencers",
      "Drivers and monitors",
      "Scoreboards",
      "UVM configuration",
      "UVM phases",
    ],
    learningObjectives: [
      "Build UVM testbenches",
      "Understand UVM methodology",
      "Implement verification components",
    ],
  },
];

export function getTopicById(topicId) {
  return TOPICS.find((t) => t.id === topicId) || null;
}

export function getTopicsByTrack(track) {
  return TOPICS.filter((t) => t.track === track).sort(
    (a, b) => a.order - b.order,
  );
}

export function getPrerequisiteTopics(topicId) {
  const topic = getTopicById(topicId);
  if (!topic || !topic.prerequisites.length) return [];
  return topic.prerequisites.map(getTopicById).filter(Boolean);
}

export function isTopicUnlocked(topicId, completedTopicIds = []) {
  const topic = getTopicById(topicId);
  if (!topic) return false;
  if (!topic.prerequisites.length) return true;
  return topic.prerequisites.every((prereqId) =>
    completedTopicIds.includes(prereqId),
  );
}

export function getNextTopic(currentTopicId, completedTopicIds = []) {
  const current = getTopicById(currentTopicId);
  if (!current) return null;

  const trackTopics = getTopicsByTrack(current.track);
  const currentIndex = trackTopics.findIndex((t) => t.id === currentTopicId);

  for (let i = currentIndex + 1; i < trackTopics.length; i++) {
    const nextTopic = trackTopics[i];
    if (isTopicUnlocked(nextTopic.id, completedTopicIds)) {
      return nextTopic;
    }
  }

  return null;
}
