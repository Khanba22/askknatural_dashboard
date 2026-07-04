import mongoose, { Schema, type Document } from 'mongoose';

export interface IProfile extends Document {
  email: string;
  shopifyCustomerId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  ordersCount?: number;
  totalSpent?: number;
  lastActiveAt: Date;
  createdAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    shopifyCustomerId: { type: String, default: null, index: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    name: { type: String, default: null },
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Profile =
  (mongoose.models.Profile as mongoose.Model<IProfile>) ||
  mongoose.model<IProfile>('Profile', ProfileSchema);
