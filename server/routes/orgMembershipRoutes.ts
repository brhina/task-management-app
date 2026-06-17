import express from 'express';
import { 
    getMyOrgs,
    leaveOrg,
    generateInviteToken, 
    joinOrgByInvite, 
    getOrgMembers, 
    updateMemberRole, 
    removeMember 
} from '../controllers/orgMembershipControllers.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-orgs', protect, getMyOrgs);
router.post('/:orgId/leave', protect, leaveOrg);
router.post('/:orgId/invite', protect, generateInviteToken);
router.post('/join', protect, joinOrgByInvite);
router.get('/:orgId/members', protect, getOrgMembers);
router.put('/:orgId/members/:memberId/role', protect, updateMemberRole);
router.delete('/:orgId/members/:memberId', protect, removeMember);

export default router;
