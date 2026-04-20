import mongoose, { Schema, model } from "mongoose";

export type UserRole = "admin" | "operator";

export type UserDoc = {
  email: string;
  passwordHash: string;
  role: UserRole;
};

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["admin", "operator"], default: "operator" },
  },
  { timestamps: true }
);

export const User = model("User", UserSchema);

