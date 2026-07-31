import mongoose from "mongoose";
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import {
  getWorkspaceTemplate,
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateSeed,
} from "../constants/workspaceTemplates.js";

export { WORKSPACE_TEMPLATES, getWorkspaceTemplate };

export async function applyWorkspaceTemplate(
  orgId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  templateId: string,
): Promise<WorkspaceTemplateSeed | null> {
  const template = getWorkspaceTemplate(templateId);
  if (!template || template.id === "blank") return template || null;

  for (const project of template.projects) {
    await Project.create({
      orgId,
      name: project.name,
      description: project.description,
      ownerId: userId,
      status: "Active",
    });
  }

  for (const team of template.teams) {
    await Team.create({
      orgId,
      name: team.name,
      description: team.description,
      memberIds: [userId],
      leadId: userId,
      createdBy: userId,
    });
  }

  return template;
}
