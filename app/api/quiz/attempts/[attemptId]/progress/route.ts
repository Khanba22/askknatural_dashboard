import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    await connectDB();
    const { attemptId } = await params;
    const body = await request.json();
    const { currentQuestionIndex } = body;

    if (currentQuestionIndex == null) {
      return NextResponse.json({ error: 'currentQuestionIndex is required' }, { status: 400 });
    }

    // Fire-and-forget style: don't fail hard if attempt not found
    await QuizAttempt.findByIdAndUpdate(attemptId, { currentQuestionIndex });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
