import mongoose from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  role: "Admin" | "Member";
}

export interface IUserDocument extends IUser, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImageUrl: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["Admin", "Member"],
      default: "Member",
    },
  },
  { timestamps: true },
);

const User = mongoose.model<IUserDocument>("User", userSchema);

export default User;
