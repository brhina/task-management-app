import { Response } from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import OrgMembership from '../models/OrgMembership.js';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { slugify, shortRandomId } from '../utils/slugUtils.js';

export const createOrg = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, plan = 'Free' } = req.body;

        if (!name || !name.trim()) {
            res.status(400).json({ message: 'Organization name is required' });
            return;
        }

        const baseSlug = slugify(name.trim()) || `org-${shortRandomId(6)}`;
        let slug = baseSlug;
        while (true) {
            const exists = await Organization.findOne({ slug }).select('_id');
            if (!exists) break;
            slug = `${baseSlug}-${shortRandomId(4)}`;
        }

        const org = await Organization.create({
            name: name.trim(),
            slug,
            plan,
            createdBy: req.user._id,
        });

        await OrgMembership.create({
            orgId: org._id,
            userId: req.user._id,
            role: 'OrgAdmin',
            status: 'Active',
        });

        res.status(201).json({
            _id: org._id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            role: 'OrgAdmin',
        });
    } catch (error: any) {
        console.error('Create org error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrgById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, status: 'Active' });
        if (!membership) {
            res.status(403).json({ message: 'Not a member of this organization' });
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        const memberCount = await OrgMembership.countDocuments({ orgId, status: 'Active' });

        res.status(200).json({
            _id: org._id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            createdBy: org.createdBy,
            memberCount,
            createdAt: org.createdAt,
        });
    } catch (error: any) {
        console.error('Get org error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrg = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;
        const { name, plan } = req.body;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!membership) {
            res.status(403).json({ message: 'Only org admins can update organization' });
            return;
        }

        const org = await Organization.findById(orgId);
        if (!org) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        if (name && name.trim() !== org.name) {
            org.name = name.trim();
            const baseSlug = slugify(name.trim()) || `org-${shortRandomId(6)}`;
            let slug = baseSlug;
            while (true) {
                const exists = await Organization.findOne({ slug, _id: { $ne: org._id } }).select('_id');
                if (!exists) break;
                slug = `${baseSlug}-${shortRandomId(4)}`;
            }
            org.slug = slug;
        }

        if (plan) {
            org.plan = plan;
        }

        await org.save();

        res.status(200).json({
            _id: org._id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
        });
    } catch (error: any) {
        console.error('Update org error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteOrg = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        const membership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!membership) {
            res.status(403).json({ message: 'Only org admins can delete organization' });
            return;
        }

        const memberCount = await OrgMembership.countDocuments({ orgId, status: 'Active' });
        if (memberCount > 1) {
            res.status(400).json({ message: 'Cannot delete organization with more than 1 member. Remove all members first.' });
            return;
        }

        await OrgMembership.deleteMany({ orgId });
        await Organization.deleteOne({ _id: orgId });

        res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error: any) {
        console.error('Delete org error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addMemberByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;
        const { email, role = 'OrgMember' } = req.body;

        if (!email || !email.trim()) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        const adminMembership = await OrgMembership.findOne({ orgId, userId: req.user._id, role: 'OrgAdmin' });
        if (!adminMembership) {
            res.status(403).json({ message: 'Only org admins can add members' });
            return;
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            res.status(404).json({ message: 'User not found with this email' });
            return;
        }

        const existingMembership = await OrgMembership.findOne({ orgId, userId: user._id });
        if (existingMembership) {
            if (existingMembership.status === 'Active') {
                res.status(400).json({ message: 'User is already a member of this organization' });
                return;
            }
            existingMembership.status = 'Active';
            existingMembership.role = role;
            await existingMembership.save();
        } else {
            await OrgMembership.create({
                orgId,
                userId: user._id,
                role,
                status: 'Active',
            });
        }

        res.status(200).json({ 
            message: 'Member added successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profileImageUrl: user.profileImageUrl,
            },
            role,
        });
    } catch (error: any) {
        console.error('Add member error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const checkUserExists = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const email = req.params.email as string;

        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email profileImageUrl');
        
        res.status(200).json({ 
            exists: !!user,
            user: user || null,
        });
    } catch (error: any) {
        console.error('Check user error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
