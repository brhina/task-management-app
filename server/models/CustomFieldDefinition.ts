import mongoose from "mongoose";

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multi-select";

export interface ICustomFieldDefinition {
  orgId: mongoose.Types.ObjectId;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface ICustomFieldDefinitionDocument
  extends ICustomFieldDefinition,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const customFieldDefinitionSchema =
  new mongoose.Schema<ICustomFieldDefinitionDocument>(
    {
      orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
      },
      key: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ["text", "number", "date", "select", "multi-select"],
        required: true,
      },
      options: [{ type: String, trim: true }],
      required: { type: Boolean, default: false },
    },
    { timestamps: true },
  );

customFieldDefinitionSchema.index({ orgId: 1, key: 1 }, { unique: true });

const CustomFieldDefinition = mongoose.model<ICustomFieldDefinitionDocument>(
  "CustomFieldDefinition",
  customFieldDefinitionSchema,
);
export default CustomFieldDefinition;
