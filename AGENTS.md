# Agent Directives

- In tests, always use stacked SVG snapshots with the analysis SVG below the circuit SVG.
- Keep one test per test file.
- Do not modify README.md except for user-facing API changes.
- Never use string checks on names or labels (including pin names, `port_hints`, net names, or reference designators) to establish semantic meaning or infer electrical roles; use explicit typed metadata and connectivity/topology instead, and skip cases where that evidence is insufficient.
