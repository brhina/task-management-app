import mongoose from "mongoose";

export interface ITeam {
  orgId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  leadId?: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  parentTeamId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

export interface ITeamDocument extends ITeam, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new mongoose.Schema<ITeamDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    parentTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

teamSchema.index({ orgId: 1, name: 1 }, { unique: true });
teamSchema.index({ orgId: 1, parentTeamId: 1 });

const Team = mongoose.model<ITeamDocument>("Team", teamSchema);
export default Team;
