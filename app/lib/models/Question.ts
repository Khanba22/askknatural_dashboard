import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IOption {
  _id: Types.ObjectId;
  text: string;
  orderIndex: number;
  createdAt: Date;
}

const OptionSchema = new Schema<IOption>(
  {
    text: { type: String, required: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type QuestionType = 'text' | 'single_option' | 'multi_option';

export interface IQuestion extends Document {
  quizId: Types.ObjectId;
  text: string;
  type: QuestionType;
  enforced: boolean;
  orderIndex: number;
  options: IOption[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'single_option', 'multi_option'],
      required: true,
    },
    enforced: { type: Boolean, default: false },
    orderIndex: { type: Number, default: 0 },
    options: { type: [OptionSchema], default: [] },
  },
  { timestamps: true }
);

QuestionSchema.index({ quizId: 1, orderIndex: 1 });

export const Question =
  (mongoose.models.Question as mongoose.Model<IQuestion>) ||
  mongoose.model<IQuestion>('Question', QuestionSchema);
