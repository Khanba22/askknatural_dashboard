import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';
import { Question } from '@/app/lib/models/Question';
import { Profile } from '@/app/lib/models/Profile';
import mongoose from 'mongoose';

interface SubmitAnswer {
  questionId: string;
  answerText?: string;
  optionIds?: string[];
}

interface ShopifyProfilePayload {
  id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  orders_count?: number;
  total_spent?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    await connectDB();
    const { attemptId } = await params;
    const body = await request.json();
    const { idempotencyKey, answers, profile } = body as {
      idempotencyKey: string;
      answers: SubmitAnswer[];
      profile?: ShopifyProfilePayload;
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

    let profileDoc = null;
    let email = null;
    if (profile && profile.email) {
      email = profile.email.toLowerCase().trim();
      profileDoc = await Profile.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            shopifyCustomerId: profile.id?.toString() || attempt.shopifyCustomerId || null,
            firstName: profile.first_name || null,
            lastName: profile.last_name || null,
            name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
            ordersCount: typeof profile.orders_count === 'number' ? profile.orders_count : 0,
            totalSpent: typeof profile.total_spent === 'number' ? profile.total_spent : 0,
            lastActiveAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
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
        const updateData: Record<string, unknown> = {
          isCompleted: true,
          completedAt: new Date(),
          idempotencyKey,
          currentQuestionIndex: questions.length - 1,
        };
        if (profileDoc) {
          updateData.profileId = profileDoc._id;
          updateData.email = email;
          updateData.isAnonymous = false;
          if (profile?.id) updateData.shopifyCustomerId = profile.id.toString();
        }
        await QuizAttempt.findByIdAndUpdate(attemptId, updateData, { session });
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
