import mongoose, { Schema, type Document } from 'mongoose';

export interface IQuiz extends Document {
  name: string;
  slug: string;
  homeOptionText?: string;
  description?: string;
  outputUrl?: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    homeOptionText: { type: String, default: null },
    description: { type: String, default: null },
    outputUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

QuizSchema.index({ orderIndex: 1 });
QuizSchema.index({ isActive: 1, orderIndex: 1 });

export const Quiz =
  (mongoose.models.Quiz as mongoose.Model<IQuiz>) ||
  mongoose.model<IQuiz>('Quiz', QuizSchema);
