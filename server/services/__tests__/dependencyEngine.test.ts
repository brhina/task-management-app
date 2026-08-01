import { describe, it, expect } from "vitest";
import {
  buildAdjacency,
  findCycles,
  topoSort,
} from "../dependencyEngine.js";

describe("dependencyEngine Service", () => {
  describe("buildAdjacency()", () => {
    it("should build adjacency map correctly from directed edges", () => {
      const edges = [
        { from: "task-A", to: "task-B" },
        { from: "task-B", to: "task-C" },
      ];
      const adj = buildAdjacency(edges);
      expect(adj.get("task-A")).toEqual(["task-B"]);
      expect(adj.get("task-B")).toEqual(["task-C"]);
      expect(adj.get("task-C")).toEqual([]);
    });
  });

  describe("findCycles()", () => {
    it("should return empty array for acyclic graphs", () => {
      const edges = [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
      ];
      const adj = buildAdjacency(edges);
      const cycles = findCycles(adj);
      expect(cycles).toEqual([]);
    });

    it("should detect circular dependency cycles", () => {
      const edges = [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "A" },
      ];
      const adj = buildAdjacency(edges);
      const cycles = findCycles(adj);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain("A");
      expect(cycles[0]).toContain("B");
      expect(cycles[0]).toContain("C");
    });
  });

  describe("topoSort()", () => {
    it("should perform topological sort for DAG", () => {
      const edges = [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
      ];
      const adj = buildAdjacency(edges);
      const sorted = topoSort(adj);
      expect(sorted).toEqual(["A", "B", "C"]);
    });
  });
});
