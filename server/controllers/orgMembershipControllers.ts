import { Response } from 'express';
import mongoose from 'mongoose';
import OrgMembership from '../models/OrgMembership.js';
import Organization from '../models/Organization.js';
import Invite from '../models/Invite.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { shortRandomId } from '../utils/slugUtils.js';

export const getMyOrgs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const memberships = await OrgMembership.find({ userId: req.user._id, status: 'Active' })
            .populate('orgId', 'name slug plan')
            .sort({ createdAt: 1 });

        const orgs = memberships.map(m => ({
            _id: (m.orgId as any)._id,
            name: (m.orgId as any).name,
            slug: (m.orgId as any).slug,
            plan: (m.orgId as any).plan,
            membershipId: m._id,
            role: m.role,
            capacityHoursPerWeek: m.capacityHoursPerWeek,
            joinedAt: m.createdAt,
        }));

        res.status(200).json(orgs);
    } catch (error: any) {
        console.error('Get my orgs error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const leaveOrg = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, status: 'Active' });
        if (!membership) {
            res.status(404).json({ message: 'You are not a member of this organization' });
            return;
        }

        const orgMemberCount = await OrgMembership.countDocuments({ orgId, status: 'Active' });
        if (orgMemberCount <= 1) {
            res.status(400).json({ message: 'Cannot leave organization as the last member. Delete the organization instead.' });
            return;
        }

        if (membership.role === 'OrgAdmin') {
            const adminCount = await OrgMembership.countDocuments({ orgId, role: 'OrgAdmin', status: 'Active' });
            if (adminCount <= 1) {
                res.status(400).json({ message: 'Cannot leave organization as the last admin. Transfer admin role first.' });
                return;
            }
        }

        await OrgMembership.deleteOne({ _id: membership._id });

        res.status(200).json({ message: 'Successfully left the organization' });
    } catch (error: any) {
        console.error('Leave org error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const generateInviteToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;
        const { email, role = 'OrgMember' } = req.body;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!membership) {
            res.status(403).json({ message: 'Only org admins can generate invite tokens' });
            return;
        }

        const token = `inv_${shortRandomId(12)}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await Invite.create({
            orgId,
            email,
            token,
            role,
            expiresAt,
            createdBy: req.user._id,
        });

        res.status(201).json({ inviteToken: token, expiresAt, inviteId: invite._id });
    } catch (error: any) {
        console.error('Generate invite token error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const joinOrgByInvite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { inviteToken } = req.body;

        const invite = await Invite.findOne({ 
            token: inviteToken, 
            expiresAt: { $gt: new Date() }
        });

        if (!invite) {
            res.status(400).json({ message: 'Invalid or expired invite token' });
            return;
        }

        const existingMembership = await OrgMembership.findOne({ 
            orgId: invite.orgId, 
            userId: req.user._id 
        });

        if (existingMembership) {
            existingMembership.status = 'Active';
            existingMembership.role = invite.role;
            await existingMembership.save();
        } else {
            await OrgMembership.create({
                orgId: invite.orgId,
                userId: req.user._id,
                role: invite.role,
                status: 'Active',
            });
        }

        await Invite.deleteOne({ _id: invite._id });

        res.status(200).json({ 
            message: 'Successfully joined organization',
            orgId: invite.orgId,
            role: invite.role
        });
    } catch (error: any) {
        console.error('Join org by invite error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrgMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, status: 'Active' });
        if (!membership) {
            res.status(403).json({ message: 'Not a member of this organization' });
            return;
        }

        const members = await OrgMembership.find({ orgId, status: 'Active' })
            .populate('userId', 'name email profileImageUrl');

        res.status(200).json(members);
    } catch (error: any) {
        console.error('Get org members error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId, memberId } = req.params;
        const { role } = req.body;

        const adminMembership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!adminMembership) {
            res.status(403).json({ message: 'Only org admins can update member roles' });
            return;
        }

        const membership = await OrgMembership.findOne({ _id: memberId, orgId });
        if (!membership) {
            res.status(404).json({ message: 'Membership not found' });
            return;
        }

        membership.role = role;
        await membership.save();

        res.status(200).json({ message: 'Member role updated', membership });
    } catch (error: any) {
        console.error('Update member role error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId, memberId } = req.params;

        const adminMembership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!adminMembership) {
            res.status(403).json({ message: 'Only org admins can remove members' });
            return;
        }

        const membership = await OrgMembership.findOne({ _id: memberId, orgId });
        if (!membership) {
            res.status(404).json({ message: 'Membership not found' });
            return;
        }

        if (String(membership.userId) === String(req.user._id)) {
            res.status(400).json({ message: 'Cannot remove yourself from the organization' });
            return;
        }

        await OrgMembership.deleteOne({ _id: memberId });

        res.status(200).json({ message: 'Member removed from organization' });
    } catch (error: any) {
        console.error('Remove member error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
