import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IQuizAnswer extends Document {
  attemptId: Types.ObjectId;
  questionId: Types.ObjectId;
  answerText?: string;
  optionIds: Types.ObjectId[];
  createdAt: Date;
}

const QuizAnswerSchema = new Schema<IQuizAnswer>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'QuizAttempt', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    answerText: { type: String, default: null },
    optionIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

QuizAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
QuizAnswerSchema.index({ questionId: 1 });

export const QuizAnswer =
  (mongoose.models.QuizAnswer as mongoose.Model<IQuizAnswer>) ||
  mongoose.model<IQuizAnswer>('QuizAnswer', QuizAnswerSchema);
