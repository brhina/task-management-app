import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";
import Organization from "../models/Organization";
import OrgMembership from "../models/OrgMembership";
import Project from "../models/Project";
import Task from "../models/Task";
import Goal from "../models/Goal";
import Dependency from "../models/Dependency";
import AutomationRule from "../models/AutomationRule";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasks-db";

// Helper to hash passwords
async function hashPassword(password: string) {
    return bcrypt.hash(password, 10);
}

// Seed data
async function seedMockData() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✓ Connected to MongoDB");

        // Clear existing data
        console.log("\nClearing existing data...");
        await User.deleteMany({});
        await Organization.deleteMany({});
        await OrgMembership.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Goal.deleteMany({});
        await Dependency.deleteMany({});
        await AutomationRule.deleteMany({});
        console.log("✓ Cleared all collections");

        // Create Users
        console.log("\nCreating users...");
        const users = await User.insertMany([
            {
                name: "John Admin",
                email: "admin@example.com",
                password: await hashPassword("password123"),
                role: "Admin",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
            },
            {
                name: "Jane Developer",
                email: "jane@example.com",
                password: await hashPassword("password123"),
                role: "Member",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
            },
            {
                name: "Bob Designer",
                email: "bob@example.com",
                password: await hashPassword("password123"),
                role: "Member",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
            },
            {
                name: "Alice PM",
                email: "alice@example.com",
                password: await hashPassword("password123"),
                role: "Member",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
            },
            {
                name: "Charlie QA",
                email: "charlie@example.com",
                password: await hashPassword("password123"),
                role: "Member",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
            },
            {
                name: "Diana Manager",
                email: "diana@example.com",
                password: await hashPassword("password123"),
                role: "Member",
                profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana",
            },
        ]);
        console.log(`✓ Created ${users.length} users`);

        // Create Organizations
        console.log("\nCreating organizations...");
        const orgs = await Organization.insertMany([
            {
                name: "Tech Innovators Inc",
                slug: "tech-innovators-inc",
                plan: "Enterprise",
                createdBy: users[0]._id,
            },
            {
                name: "Creative Studios",
                slug: "creative-studios",
                plan: "Pro",
                createdBy: users[1]._id,
            },
            {
                name: "Startup Hub",
                slug: "startup-hub",
                plan: "Free",
                createdBy: users[2]._id,
            },
        ]);
        console.log(`✓ Created ${orgs.length} organizations`);

        // Create Organization Memberships
        console.log("\nCreating organization memberships...");
        const memberships = await OrgMembership.insertMany([
            {
                orgId: orgs[0]._id,
                userId: users[0]._id,
                role: "OrgAdmin",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[0]._id,
                userId: users[1]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[0]._id,
                userId: users[2]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 35,
            },
            {
                orgId: orgs[0]._id,
                userId: users[3]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[0]._id,
                userId: users[4]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[1]._id,
                userId: users[1]._id,
                role: "OrgAdmin",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[1]._id,
                userId: users[2]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 30,
            },
            {
                orgId: orgs[2]._id,
                userId: users[2]._id,
                role: "OrgAdmin",
                status: "Active",
                capacityHoursPerWeek: 40,
            },
            {
                orgId: orgs[0]._id,
                userId: users[5]._id,
                role: "OrgMember",
                status: "Active",
                capacityHoursPerWeek: 38,
            },
        ]);
        console.log(`✓ Created ${memberships.length} organization memberships`);

        // Create Projects
        console.log("\nCreating projects...");
        const projects = await Project.insertMany([
            {
                orgId: orgs[0]._id,
                name: "Mobile App Redesign",
                description: "Redesign the mobile app with modern UI/UX",
                ownerId: users[0]._id,
                status: "Active",
                startDate: new Date("2026-01-15"),
                targetDate: new Date("2026-06-30"),
            },
            {
                orgId: orgs[0]._id,
                name: "API Optimization",
                description: "Optimize API performance and reduce latency",
                ownerId: users[1]._id,
                status: "Active",
                startDate: new Date("2026-02-01"),
                targetDate: new Date("2026-04-30"),
            },
            {
                orgId: orgs[0]._id,
                name: "Database Migration",
                description: "Migrate from SQL to NoSQL database",
                ownerId: users[3]._id,
                status: "Planned",
                startDate: new Date("2026-07-01"),
                targetDate: new Date("2026-09-30"),
            },
            {
                orgId: orgs[1]._id,
                name: "Brand Guidelines",
                description: "Create comprehensive brand guidelines",
                ownerId: users[1]._id,
                status: "Active",
                startDate: new Date("2026-01-01"),
                targetDate: new Date("2026-03-31"),
            },
            {
                orgId: orgs[1]._id,
                name: "Marketing Campaign",
                description: "Q2 marketing campaign for new product launch",
                ownerId: users[2]._id,
                status: "Active",
                startDate: new Date("2026-04-01"),
                targetDate: new Date("2026-06-30"),
            },
        ]);
        console.log(`✓ Created ${projects.length} projects`);

        // Create Goals
        console.log("\nCreating goals...");
        const goals = await Goal.insertMany([
            {
                orgId: orgs[0]._id,
                title: "Increase App Performance",
                objective: "Reduce API response time",
                metric: "Response Time (ms)",
                targetValue: 200,
                currentValue: 500,
                ownerId: users[1]._id,
                timeframe: "Quarterly",
                startDate: new Date("2026-01-01"),
                endDate: new Date("2026-03-31"),
            },
            {
                orgId: orgs[0]._id,
                title: "Improve Code Quality",
                objective: "Increase test coverage",
                metric: "Test Coverage (%)",
                targetValue: 85,
                currentValue: 60,
                ownerId: users[0]._id,
                timeframe: "Monthly",
                startDate: new Date("2026-05-01"),
                endDate: new Date("2026-05-31"),
            },
            {
                orgId: orgs[0]._id,
                title: "Customer Satisfaction",
                objective: "Improve customer satisfaction score",
                metric: "NPS Score",
                targetValue: 70,
                currentValue: 55,
                ownerId: users[3]._id,
                timeframe: "Quarterly",
                startDate: new Date("2026-01-01"),
                endDate: new Date("2026-03-31"),
            },
            {
                orgId: orgs[1]._id,
                title: "Design System Complete",
                objective: "Complete component library",
                metric: "Components Created",
                targetValue: 50,
                currentValue: 25,
                ownerId: users[1]._id,
                timeframe: "Monthly",
                startDate: new Date("2026-05-01"),
                endDate: new Date("2026-05-31"),
            },
        ]);
        console.log(`✓ Created ${goals.length} goals`);

        // Create Tasks
        console.log("\nCreating tasks...");
        const tasks = await Task.insertMany([
            {
                orgId: orgs[0]._id,
                title: "Design new homepage",
                description: "Create new homepage design with modern layout",
                priority: "High",
                status: "In Progress",
                dueDate: new Date("2026-02-15"),
                projectId: projects[0]._id,
                goalIds: [goals[0]._id],
                tags: ["design", "ui"],
                category: "Frontend",
                impactScore: 9,
                effortHours: 16,
                collaborators: [users[2]._id],
                assignedTo: users[2]._id,
                createdBy: users[0]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Wireframe design", isCompleted: true },
                    { text: "Create mockups", isCompleted: true },
                    { text: "Implement in React", isCompleted: false },
                ],
                progress: 65,
            },
            {
                orgId: orgs[0]._id,
                title: "Optimize database queries",
                description: "Profile and optimize slow database queries",
                priority: "High",
                status: "In Progress",
                dueDate: new Date("2026-03-01"),
                projectId: projects[1]._id,
                goalIds: [goals[0]._id],
                tags: ["backend", "performance"],
                category: "Backend",
                impactScore: 10,
                effortHours: 24,
                collaborators: [users[4]._id],
                assignedTo: users[1]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Profile queries", isCompleted: true },
                    { text: "Add indexes", isCompleted: true },
                    { text: "Test performance", isCompleted: false },
                ],
                progress: 50,
            },
            {
                orgId: orgs[0]._id,
                title: "Write unit tests",
                description: "Write comprehensive unit tests for API endpoints",
                priority: "Medium",
                status: "Pending",
                dueDate: new Date("2026-03-15"),
                projectId: projects[1]._id,
                goalIds: [goals[1]._id],
                tags: ["testing", "backend"],
                category: "QA",
                impactScore: 8,
                effortHours: 20,
                collaborators: [users[1]._id],
                assignedTo: users[4]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Setup test environment", isCompleted: false },
                    { text: "Write tests", isCompleted: false },
                ],
                progress: 0,
            },
            {
                orgId: orgs[0]._id,
                title: "Setup CI/CD pipeline",
                description: "Configure automated testing and deployment",
                priority: "High",
                status: "Pending",
                dueDate: new Date("2026-02-28"),
                projectId: projects[1]._id,
                tags: ["devops", "automation"],
                category: "DevOps",
                impactScore: 9,
                effortHours: 12,
                assignedTo: users[1]._id,
                createdBy: users[0]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Setup GitHub Actions", isCompleted: false },
                    { text: "Configure Docker", isCompleted: false },
                ],
                progress: 0,
            },
            {
                orgId: orgs[1]._id,
                title: "Create color palette",
                description: "Define primary and secondary colors for brand",
                priority: "High",
                status: "Completed",
                dueDate: new Date("2026-01-30"),
                projectId: projects[3]._id,
                goalIds: [goals[3]._id],
                tags: ["design", "branding"],
                category: "Design",
                impactScore: 7,
                effortHours: 8,
                assignedTo: users[2]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Research color theory", isCompleted: true },
                    { text: "Create palette", isCompleted: true },
                ],
                progress: 100,
            },
            {
                orgId: orgs[1]._id,
                title: "Design button components",
                description: "Create reusable button component variations",
                priority: "Medium",
                status: "In Progress",
                dueDate: new Date("2026-02-15"),
                projectId: projects[3]._id,
                goalIds: [goals[3]._id],
                tags: ["design", "components"],
                category: "Design",
                impactScore: 6,
                effortHours: 12,
                assignedTo: users[2]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Default button", isCompleted: true },
                    { text: "Primary button", isCompleted: true },
                    { text: "Disabled states", isCompleted: false },
                ],
                progress: 70,
            },
            {
                orgId: orgs[0]._id,
                title: "Review analytics dashboard",
                description: "Review dashboard metrics and provide feedback for the next sprint",
                priority: "Medium",
                status: "In Review",
                dueDate: new Date("2026-03-05"),
                projectId: projects[0]._id,
                goalIds: [goals[0]._id],
                tags: ["analytics", "review"],
                category: "Product",
                impactScore: 7,
                effortHours: 10,
                collaborators: [users[4]._id],
                assignedTo: users[3]._id,
                createdBy: users[0]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Check KPI widgets", isCompleted: true },
                    { text: "Validate data sources", isCompleted: false },
                    { text: "Recommend improvements", isCompleted: false },
                ],
                progress: 80,
            },
            {
                orgId: orgs[0]._id,
                title: "Finalize release notes",
                description: "Write and review release notes for the upcoming app update",
                priority: "Low",
                status: "Completed",
                dueDate: new Date("2026-03-10"),
                projectId: projects[1]._id,
                tags: ["documentation", "release"],
                category: "Operations",
                impactScore: 5,
                effortHours: 6,
                assignedTo: users[4]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Draft notes", isCompleted: true },
                    { text: "Review with team", isCompleted: true },
                    { text: "Publish release notes", isCompleted: true },
                ],
                progress: 100,
            },
            {
                orgId: orgs[1]._id,
                title: "Write campaign landing page copy",
                description: "Create compelling landing page copy for the Q2 marketing campaign",
                priority: "Medium",
                status: "Pending",
                dueDate: new Date("2026-05-20"),
                projectId: projects[4]._id,
                tags: ["marketing", "copy"],
                category: "Content",
                impactScore: 6,
                effortHours: 8,
                assignedTo: users[2]._id,
                createdBy: users[1]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Create headline options", isCompleted: false },
                    { text: "Write body copy", isCompleted: false },
                    { text: "Review brand tone", isCompleted: false },
                ],
                progress: 10,
            },
            {
                orgId: orgs[2]._id,
                title: "Create startup pitch deck",
                description: "Assemble a pitch deck for investors and partners",
                priority: "High",
                status: "Pending",
                dueDate: new Date("2026-07-15"),
                tags: ["pitch", "strategy"],
                category: "Strategy",
                impactScore: 9,
                effortHours: 18,
                assignedTo: users[2]._id,
                createdBy: users[2]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Collect market research", isCompleted: false },
                    { text: "Draft slides", isCompleted: false },
                    { text: "Review with leadership", isCompleted: false },
                ],
                progress: 0,
            },
            {
                orgId: orgs[0]._id,
                title: "Conduct user research interviews",
                description: "Schedule and conduct user research interviews to gather feedback on the new features",
                priority: "High",
                status: "Pending",
                dueDate: new Date("2026-04-15"),
                projectId: projects[0]._id,
                goalIds: [goals[2]._id],
                tags: ["research", "ux"],
                category: "Research",
                impactScore: 8,
                effortHours: 15,
                collaborators: [users[3]._id],
                assignedTo: users[5]._id,
                createdBy: users[0]._id,
                attachments: [],
                todoCheckList: [
                    { text: "Define research questions", isCompleted: false },
                    { text: "Recruit participants", isCompleted: false },
                    { text: "Conduct interviews", isCompleted: false },
                    { text: "Analyze findings", isCompleted: false },
                ],
                progress: 0,
            },
        ]);
        console.log(`✓ Created ${tasks.length} tasks`);

        // Create Dependencies
        console.log("\nCreating dependencies...");
        const dependencies = await Dependency.insertMany([
            {
                orgId: orgs[0]._id,
                fromTaskId: tasks[3]._id, // Setup CI/CD (prerequisite)
                toTaskId: tasks[2]._id,   // Write unit tests (dependent)
                type: "FS",
                lagHours: 0,
                status: "Active",
            },
            {
                orgId: orgs[0]._id,
                fromTaskId: tasks[1]._id, // Optimize database queries
                toTaskId: tasks[2]._id,   // Write unit tests
                type: "SS",
                lagHours: 8,
                status: "Active",
            },
            {
                orgId: orgs[1]._id,
                fromTaskId: tasks[4]._id, // Create color palette
                toTaskId: tasks[5]._id,   // Design button components
                type: "FS",
                lagHours: 0,
                status: "Active",
            },
        ]);
        console.log(`✓ Created ${dependencies.length} dependencies`);

        // Create Automation Rules
        console.log("\nCreating automation rules...");
        const automationRules = await AutomationRule.insertMany([
            {
                orgId: orgs[0]._id,
                name: "Auto-assign completed tasks to reviewer",
                enabled: true,
                trigger: "task_completed",
                conditions: {
                    priority: { $in: ["High", "Medium"] },
                },
                actions: [
                    {
                        type: "notify",
                        target: "projectOwner",
                        message: "Task completed, please review",
                    },
                ],
            },
            {
                orgId: orgs[0]._id,
                name: "Daily summary at 5 PM",
                enabled: true,
                trigger: "daily_summary",
                conditions: {
                    time: "17:00",
                },
                actions: [
                    {
                        type: "email",
                        target: "team",
                        template: "daily_summary",
                    },
                ],
            },
            {
                orgId: orgs[0]._id,
                name: "Update goal progress on task completion",
                enabled: true,
                trigger: "task_completed",
                conditions: {
                    hasGoals: true,
                },
                actions: [
                    {
                        type: "updateGoal",
                        incrementProgress: true,
                    },
                ],
            },
            {
                orgId: orgs[1]._id,
                name: "Notify on high priority task creation",
                enabled: true,
                trigger: "task_created",
                conditions: {
                    priority: "High",
                },
                actions: [
                    {
                        type: "notify",
                        target: "projectOwner",
                        message: "New high priority task created",
                    },
                ],
            },
        ]);
        console.log(`✓ Created ${automationRules.length} automation rules`);

        console.log("\n✅ Mock data seeding completed successfully!");
        console.log("\nCreated:");
        console.log(`  - ${users.length} users`);
        console.log(`  - ${orgs.length} organizations`);
        console.log(`  - ${memberships.length} organization memberships`);
        console.log(`  - ${projects.length} projects`);
        console.log(`  - ${tasks.length} tasks`);
        console.log(`  - ${goals.length} goals`);
        console.log(`  - ${dependencies.length} dependencies`);
        console.log(`  - ${automationRules.length} automation rules`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding mock data:", error);
        process.exit(1);
    }
}

// Run the seeding function
seedMockData();
