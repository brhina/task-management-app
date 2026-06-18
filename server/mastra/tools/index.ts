import { projectTools } from "./project-tools.js";
import { taskTools } from "./task-tools.js";
import { dependencyTools } from "./dependency-tools.js";
import { capacityTools } from "./capacity-tools.js";
import { reportingTools } from "./reporting-tools.js";

export const allTools = {
  ...projectTools,
  ...taskTools,
  ...dependencyTools,
  ...capacityTools,
  ...reportingTools,
};

export {
  projectTools,
  taskTools,
  dependencyTools,
  capacityTools,
  reportingTools,
};
