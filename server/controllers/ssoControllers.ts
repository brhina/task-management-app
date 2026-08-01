import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import SSOConfig from "../models/SSOConfig.js";
import User from "../models/User.js";
import OrgMembership from "../models/OrgMembership.js";
import jwt from "jsonwebtoken";

export async function getSSOConfigHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    let config = await SSOConfig.findOne({ orgId });
    if (!config) {
      config = await SSOConfig.create({
        orgId,
        enabled: false,
        provider: "saml",
        domainWhitelist: [],
        jitProvisioning: true,
        defaultRole: "OrgMember",
        createdBy: req.user!._id,
      });
    }
    res.status(200).json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch SSO config" });
  }
}

export async function updateSSOConfigHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const userId = req.user?._id;
    if (!orgId || !userId) {
      res.status(400).json({ message: "Organization ID and User ID required" });
      return;
    }
    const { enabled, provider, issuerUrl, entryPoint, certificate, domainWhitelist, jitProvisioning, defaultRole } = req.body;

    const config = await SSOConfig.findOneAndUpdate(
      { orgId },
      {
        orgId,
        enabled: Boolean(enabled),
        provider: provider || "saml",
        issuerUrl: issuerUrl || "",
        entryPoint: entryPoint || "",
        certificate: certificate || "",
        domainWhitelist: Array.isArray(domainWhitelist) ? domainWhitelist : [],
        jitProvisioning: jitProvisioning !== false,
        defaultRole: defaultRole || "OrgMember",
        createdBy: userId,
      },
      { upsert: true, new: true },
    );

    res.status(200).json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update SSO config" });
  }
}

export async function ssoLoginInitiateHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email required for SSO login" });
      return;
    }
    const domain = email.split("@")[1]?.toLowerCase();
    const ssoConfig = await SSOConfig.findOne({ domainWhitelist: domain, enabled: true });

    if (!ssoConfig) {
      res.status(404).json({ message: `No active SSO integration found for domain @${domain}` });
      return;
    }

    res.status(200).json({
      ssoEnabled: true,
      redirectUrl: ssoConfig.entryPoint || `https://sso.idp.example.com/auth?org=${ssoConfig.orgId}&email=${encodeURIComponent(email)}`,
      provider: ssoConfig.provider,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to initiate SSO login" });
  }
}

export async function ssoCallbackHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, name, ssoToken, orgId } = req.body;
    if (!email || !orgId) {
      res.status(400).json({ message: "Email and OrgId required for SSO callback" });
      return;
    }

    const ssoConfig = await SSOConfig.findOne({ orgId, enabled: true });
    if (!ssoConfig) {
      res.status(400).json({ message: "SSO is not enabled for this organization" });
      return;
    }

    let user = await User.findOne({ email });
    if (!user) {
      if (!ssoConfig.jitProvisioning) {
        res.status(403).json({ message: "User does not exist and JIT provisioning is disabled" });
        return;
      }
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: "SSO_PROVISIONED_ACCOUNT_NO_PASS",
        role: "Member",
      });
    }

    let membership = await OrgMembership.findOne({ userId: user._id, orgId });
    if (!membership) {
      membership = await OrgMembership.create({
        userId: user._id,
        orgId,
        role: ssoConfig.defaultRole || "OrgMember",
      });
    }

    const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, activeOrgId: orgId },
      secret,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        activeOrgId: orgId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "SSO Callback authentication failed" });
  }
}
