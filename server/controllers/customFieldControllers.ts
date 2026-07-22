import { Response } from "express";
import CustomFieldDefinition from "../models/CustomFieldDefinition.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const listCustomFields = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const fields = await CustomFieldDefinition.find({ orgId: req.orgId }).sort({
      label: 1,
    });
    res.status(200).json({ message: "Custom fields fetched", data: fields });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomField = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const key =
      req.body.key ||
      String(req.body.label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    if (!key || !req.body.label || !req.body.type) {
      res.status(400).json({ message: "key/label/type are required" });
      return;
    }

    const field = await CustomFieldDefinition.create({
      orgId: req.orgId,
      key,
      label: req.body.label,
      type: req.body.type,
      options: req.body.options || [],
      required: Boolean(req.body.required),
    });

    res.status(201).json({ message: "Custom field created", data: field });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Field key already exists" });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomField = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const field = await CustomFieldDefinition.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!field) {
      res.status(404).json({ message: "Custom field not found" });
      return;
    }

    if (req.body.label !== undefined) field.label = req.body.label;
    if (req.body.type !== undefined) field.type = req.body.type;
    if (req.body.options !== undefined) field.options = req.body.options;
    if (req.body.required !== undefined) field.required = req.body.required;
    await field.save();

    res.status(200).json({ message: "Custom field updated", data: field });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCustomField = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const field = await CustomFieldDefinition.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!field) {
      res.status(404).json({ message: "Custom field not found" });
      return;
    }
    await field.deleteOne();
    res.status(200).json({ message: "Custom field deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
