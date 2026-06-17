import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import OrgMembership, { type OrgRole } from '../models/OrgMembership.js';
import { verifyToken } from '../utils/jwtUtils.js';

export interface AuthRequest extends Request {
    user?: any;
    org?: any;
    orgId?: mongoose.Types.ObjectId;
    membership?: any;
    membershipRole?: OrgRole;
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ 
                message: 'Access denied. No token provided.' 
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            res.status(401).json({ 
                message: 'Access denied. Invalid token format.' 
            });
            return;
        }

        const decoded = verifyToken(token);
        
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            res.status(401).json({ 
                message: 'Access denied. User not found.' 
            });
            return;
        }

        req.user = user;

        // Resolve active organization context.
        const orgHeader = req.headers['x-org-id'];
        const orgIdRaw = Array.isArray(orgHeader) ? orgHeader[0] : orgHeader;

        let orgId: mongoose.Types.ObjectId | null = null;
        if (typeof orgIdRaw === 'string' && mongoose.Types.ObjectId.isValid(orgIdRaw)) {
            orgId = new mongoose.Types.ObjectId(orgIdRaw);
        }

        let membership;
        if (orgId) {
            membership = await OrgMembership.findOne({ orgId, userId: user._id, status: 'Active' });
        } else {
            membership = await OrgMembership.findOne({ userId: user._id, status: 'Active' }).sort({ createdAt: 1 });
            orgId = membership?.orgId ?? null;
        }

        if (!membership || !orgId) {
            res.status(403).json({
                message: 'Access denied. No organization membership found.',
            });
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            res.status(403).json({
                message: 'Access denied. Organization not found.',
            });
            return;
        }

        req.orgId = orgId;
        req.org = org;
        req.membership = membership;
        req.membershipRole = membership.role;
        next();
        
    } catch (error: any) {
        console.error('Auth middleware error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ 
                message: 'Access denied. Invalid token.' 
            });
            return;
        }
        
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ 
                message: 'Access denied. Token expired.' 
            });
            return;
        }
        
        res.status(500).json({ 
            message: 'Server error during authentication.' 
        });
    }
};

const orgAdminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.membership) {
        res.status(401).json({ 
            message: 'Access denied. Authentication required.' 
        });
        return;
    }
    
    if (req.membershipRole !== 'OrgAdmin') {
        res.status(403).json({ 
            message: 'Access denied. Organization admin privileges required.' 
        });
        return;
    }
    
    next();
};

export { orgAdminOnly };
export default protect;
