import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';

export async function GET() {
  try {
    await connectDB();

    const quizzes = await Quiz.find({ isActive: true, homeOptionText: { $ne: null } })
      .sort({ orderIndex: 1 })
      .select('_id homeOptionText outputUrl')
      .lean();

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('GET /api/quiz/hub error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
