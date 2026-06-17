import { Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import OrgMembership from '../models/OrgMembership.js';
import Invite from '../models/Invite.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { shortRandomId, slugify } from '../utils/slugUtils.js';

async function ensureDefaultOrgForUser(params: { userId: string; displayName: string }): Promise<{ orgId: string; membershipRole: string }> {
    const existingMembership = await OrgMembership.findOne({ userId: params.userId, status: 'Active' }).sort({ createdAt: 1 });
    if (existingMembership) {
        return { orgId: String(existingMembership.orgId), membershipRole: existingMembership.role };
    }

    const baseSlug = slugify(params.displayName) || `org-${shortRandomId(6)}`;
    let slug = baseSlug;
    // Ensure uniqueness.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await Organization.findOne({ slug }).select('_id');
        if (!exists) break;
        slug = `${baseSlug}-${shortRandomId(4)}`;
    }

    const org = await Organization.create({
        name: `${params.displayName}'s Workspace`,
        slug,
        createdBy: params.userId,
    });

    const membership = await OrgMembership.create({
        orgId: org._id,
        userId: params.userId,
        role: 'OrgAdmin',
        status: 'Active',
    });

    return { orgId: String(org._id), membershipRole: membership.role };
}

export const registerUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, email, password, profileImageUrl, adminInviteToken, orgId: joinOrgId, orgInviteToken } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        let role: 'Admin' | 'Member' = 'Member';
        if (adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
            role = 'Admin';
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({ 
            name, 
            email, 
            password: hashedPassword,
            profileImageUrl,
            role,
        });

        if (newUser) {
            let orgId: string;
            let membershipRole: string;

            if (orgInviteToken) {
                const invite = await Invite.findOne({ 
                    token: orgInviteToken, 
                    expiresAt: { $gt: new Date() }
                });

                if (!invite) {
                    res.status(400).json({ message: 'Invalid or expired invite token' });
                    return;
                }

                const existingMembership = await OrgMembership.findOne({ 
                    orgId: invite.orgId, 
                    userId: newUser._id 
                });

                if (existingMembership) {
                    existingMembership.status = 'Active';
                    existingMembership.role = invite.role;
                    await existingMembership.save();
                } else {
                    await OrgMembership.create({
                        orgId: invite.orgId,
                        userId: newUser._id,
                        role: invite.role,
                        status: 'Active',
                    });
                }

                await Invite.deleteOne({ _id: invite._id });

                orgId = String(invite.orgId);
                membershipRole = invite.role;
            } else if (joinOrgId) {
                const existingOrg = await Organization.findById(joinOrgId);
                if (!existingOrg) {
                    res.status(400).json({ message: 'Organization not found' });
                    return;
                }

                const existingMembership = await OrgMembership.findOne({ orgId: joinOrgId, userId: newUser._id });
                if (existingMembership) {
                    orgId = String(joinOrgId);
                    membershipRole = existingMembership.role;
                } else {
                    const membership = await OrgMembership.create({
                        orgId: joinOrgId,
                        userId: newUser._id,
                        role: 'OrgMember',
                        status: 'Active',
                    });
                    orgId = String(joinOrgId);
                    membershipRole = membership.role;
                }
            } else {
                const result = await ensureDefaultOrgForUser({ userId: String(newUser._id), displayName: newUser.name || newUser.email });
                orgId = result.orgId;
                membershipRole = result.membershipRole;
            }

            res.status(201).json({
                message: 'User created successfully',
                token: generateToken(newUser._id as string),
                activeOrgId: orgId,
                user: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    profileImageUrl: newUser.profileImageUrl,
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }

    } catch (error: any) {
        console.error('Registration error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const loginUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const { orgId } = await ensureDefaultOrgForUser({ userId: String(user._id), displayName: user.name || user.email });
        res.status(200).json({
            message: 'Logged in successfully',
            token: generateToken(user._id as string),
            activeOrgId: orgId,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
            }
        });
    } catch (error: any) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const memberships = await OrgMembership.find({ userId: user._id, status: 'Active' })
            .populate('orgId', 'name slug plan')
            .sort({ createdAt: 1 });

        const orgs = memberships.map(m => ({
            _id: (m.orgId as any)._id,
            name: (m.orgId as any).name,
            slug: (m.orgId as any).slug,
            plan: (m.orgId as any).plan,
            membershipId: m._id,
            role: m.role,
        }));

        const activeOrgId = req.headers['x-org-id'] as string || (orgs.length > 0 ? String(orgs[0]._id) : undefined);

        res.status(200).json({
            ...user.toObject(),
            orgs,
            activeOrgId,
        });
    } catch (error: any) {
        console.error('Get profile error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.profileImageUrl = req.body.profileImageUrl || user.profileImageUrl;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                profileImageUrl: updatedUser.profileImageUrl,
                token: generateToken(updatedUser._id as string),
            }
        });
    } catch (error: any) {
        console.error('Update profile error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
