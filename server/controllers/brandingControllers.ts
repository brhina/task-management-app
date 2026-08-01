import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Organization from "../models/Organization.js";

export async function getOrgBrandingHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const org = await Organization.findById(orgId);
    res.status(200).json(org?.branding || {
      logoUrl: "",
      primaryColor: "#6366F1",
      accentColor: "#8B5CF6",
      customTitle: "",
      whiteLabelEnabled: false,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch branding" });
  }
}

export async function updateOrgBrandingHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const { logoUrl, primaryColor, accentColor, customTitle, whiteLabelEnabled } = req.body;

    const org = await Organization.findByIdAndUpdate(
      orgId,
      {
        branding: {
          logoUrl: logoUrl || "",
          primaryColor: primaryColor || "#6366F1",
          accentColor: accentColor || "#8B5CF6",
          customTitle: customTitle || "",
          whiteLabelEnabled: Boolean(whiteLabelEnabled),
        },
      },
      { new: true },
    );

    res.status(200).json(org?.branding);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update branding" });
  }
}
