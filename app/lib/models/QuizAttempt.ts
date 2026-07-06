import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IQuizAttempt extends Document {
  quizId: Types.ObjectId;
  profileId?: Types.ObjectId;
  email?: string;
  isAnonymous: boolean;
  shopifyCustomerId?: string;
  sessionToken: string;
  currentQuestionIndex: number;
  startedAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  sourceUrl?: string;
  idempotencyKey?: string;
  createdAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', default: null, index: true },
    email: { type: String, default: null, lowercase: true, index: true },
    isAnonymous: { type: Boolean, default: true, index: true },
    shopifyCustomerId: { type: String, default: null },
    sessionToken: { type: String, required: true },
    currentQuestionIndex: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
    sourceUrl: { type: String, default: null },
    idempotencyKey: { type: String, sparse: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

QuizAttemptSchema.index({ quizId: 1, isCompleted: 1, completedAt: 1 });
QuizAttemptSchema.index({ sessionToken: 1 });
QuizAttemptSchema.index({ isAnonymous: 1, isCompleted: 1 });

export const QuizAttempt =
  (mongoose.models.QuizAttempt as mongoose.Model<IQuizAttempt>) ||
  mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
