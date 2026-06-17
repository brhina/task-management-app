import { Response } from "express";
import AutomationRule from "../models/AutomationRule.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { buildOrgWorkosSummary } from "../services/workosSummary.js";
import InsightSnapshot from "../models/InsightSnapshot.js";
import { runAutomations } from "../services/automationRunner.js";

export const listAutomationRules = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const rules = await AutomationRule.find({ orgId: req.orgId }).sort({
      createdAt: -1,
    });
    res
      .status(200)
      .json({ message: "Automation rules fetched successfully", data: rules });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAutomationRule = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const { name, enabled, trigger, conditions, actions } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ message: "Rule name is required" });
      return;
    }
    if (!trigger) {
      res.status(400).json({ message: "Trigger is required" });
      return;
    }
    if (!Array.isArray(actions) || actions.length === 0) {
      res.status(400).json({ message: "At least one action is required" });
      return;
    }

    const rule = await AutomationRule.create({
      orgId: req.orgId,
      name: String(name).trim(),
      enabled: enabled !== false,
      trigger,
      conditions,
      actions,
    });
    res
      .status(201)
      .json({ message: "Automation rule created successfully", data: rule });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAutomationRule = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!rule) {
      res.status(404).json({ message: "Rule not found" });
      return;
    }

    rule.name = req.body.name ?? rule.name;
    rule.enabled = req.body.enabled ?? rule.enabled;
    rule.trigger = req.body.trigger ?? rule.trigger;
    rule.conditions = req.body.conditions ?? rule.conditions;
    rule.actions = req.body.actions ?? rule.actions;
    const updated = await rule.save();
    res
      .status(200)
      .json({ message: "Automation rule updated successfully", data: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAutomationRule = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!rule) {
      res.status(404).json({ message: "Rule not found" });
      return;
    }
    await rule.deleteOne();
    res.status(200).json({ message: "Automation rule deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Cron-friendly endpoint.
export const runDailySummaryJob = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const payload = await buildOrgWorkosSummary({ orgId: req.orgId });
    await InsightSnapshot.create({
      orgId: req.orgId,
      scopeType: "Org",
      scopeId: req.orgId,
      computedAt: new Date(),
      payload,
    });

    await runAutomations({ orgId: req.orgId, trigger: "daily_summary" });

    res.status(200).json({ message: "Daily summary generated", data: payload });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
