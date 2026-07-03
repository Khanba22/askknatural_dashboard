import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';
import { Question } from '@/app/lib/models/Question';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    await connectDB();
    const { quizId } = await params;

    const quiz = await Quiz.findOne({ _id: quizId, isActive: true }).lean();
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questions = await Question.find({ quizId })
      .sort({ orderIndex: 1 })
      .lean();

    // Sort options within each question
    const orderedQuestions = questions.map((q) => ({
      ...q,
      options: [...q.options].sort((a, b) => a.orderIndex - b.orderIndex),
    }));

    return NextResponse.json({
      ...quiz,
      questions: orderedQuestions,
    });
  } catch (error) {
    console.error('GET /api/quiz/:quizId error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  // POST /api/quiz/:quizId — create attempt
  try {
    await connectDB();
    const { quizId } = await params;
    const body = await request.json();
    const { sessionToken, shopifyCustomerId, sourceUrl } = body;

    if (!sessionToken) {
      return NextResponse.json({ error: 'sessionToken is required' }, { status: 400 });
    }

    const quiz = await Quiz.findOne({ _id: quizId, isActive: true });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const attempt = await QuizAttempt.create({
      quizId,
      sessionToken,
      shopifyCustomerId: shopifyCustomerId || null,
      sourceUrl: sourceUrl || null,
    });

    return NextResponse.json({ attemptId: attempt._id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/quiz/:quizId (create attempt) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
