import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';
import { Question } from '@/app/lib/models/Question';
import mongoose from 'mongoose';

interface SubmitAnswer {
  questionId: string;
  answerText?: string;
  optionIds?: string[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    await connectDB();
    const { attemptId } = await params;
    const body = await request.json();
    const { idempotencyKey, answers } = body as {
      idempotencyKey: string;
      answers: SubmitAnswer[];
    };

    if (!idempotencyKey || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'idempotencyKey and answers array are required' },
        { status: 400 }
      );
    }

    // Check idempotency: if this key was already used, return success without rewriting
    const existingAttempt = await QuizAttempt.findOne({ idempotencyKey });
    if (existingAttempt) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.isCompleted) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    // Server-side enforced-answer validation
    const questions = await Question.find({ quizId: attempt.quizId }).lean();
    const answerMap = new Map(answers.map((a) => [a.questionId, a]));

    for (const q of questions) {
      if (q.enforced) {
        const answer = answerMap.get(q._id.toString());
        if (!answer) {
          return NextResponse.json(
            { error: `Required question "${q.text}" is not answered` },
            { status: 400 }
          );
        }
        if (q.type === 'text' && (!answer.answerText || !answer.answerText.trim())) {
          return NextResponse.json(
            { error: `Required question "${q.text}" has empty answer` },
            { status: 400 }
          );
        }
        if (
          (q.type === 'single_option' || q.type === 'multi_option') &&
          (!answer.optionIds || answer.optionIds.length === 0)
        ) {
          return NextResponse.json(
            { error: `Required question "${q.text}" has no options selected` },
            { status: 400 }
          );
        }
      }
    }

    // Write all answers in a transaction (or sequentially for MongoDB without replica set)
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Create answer documents
        const answerDocs = answers.map((a) => ({
          attemptId: attempt._id,
          questionId: a.questionId,
          answerText: a.answerText || null,
          optionIds: a.optionIds?.map((id) => new mongoose.Types.ObjectId(id)) || [],
        }));

        await QuizAnswer.insertMany(answerDocs, { session });

        // Mark attempt as completed
        await QuizAttempt.findByIdAndUpdate(
          attemptId,
          {
            isCompleted: true,
            completedAt: new Date(),
            idempotencyKey,
            currentQuestionIndex: questions.length - 1,
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // Handle duplicate idempotency key (race condition)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }
    console.error('POST submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
