import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware.js";
import Organization from "../models/Organization.js";

export async function checkIpAllowlist(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      next();
      return;
    }

    const org = await Organization.findById(orgId);
    if (!org || !org.ipAllowlist || org.ipAllowlist.length === 0) {
      next();
      return;
    }

    const clientIp = (req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");

    // Allow localhost/127.0.0.1 by default in dev
    if (clientIp === "127.0.0.1" || clientIp === "::1") {
      next();
      return;
    }

    const allowed = org.ipAllowlist.some((allowedIp) => {
      if (allowedIp.includes("/")) {
        // Simple prefix match simulation for CIDR
        const base = allowedIp.split("/")[0];
        return clientIp.startsWith(base.slice(0, 6));
      }
      return allowedIp.trim() === clientIp.trim();
    });

    if (!allowed) {
      res.status(403).json({
        message: `Access denied. IP address ${clientIp} is not in organization allowlist.`,
      });
      return;
    }

    next();
  } catch (err: any) {
    next();
  }
}
