import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';
import { Question } from '@/app/lib/models/Question';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';

export async function GET() {
  try {
    await connectDB();

    const quizzes = await Quiz.find().sort({ orderIndex: 1, createdAt: -1 }).lean();

    // Attach question counts and attempt counts
    const enriched = await Promise.all(
      quizzes.map(async (q) => {
        const [questionCount, attemptCount] = await Promise.all([
          Question.countDocuments({ quizId: q._id }),
          QuizAttempt.countDocuments({ quizId: q._id }),
        ]);
        return { ...q, questionCount, attemptCount };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/admin/quizzes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, slug, homeOptionText, description, outputUrl, isActive } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await Quiz.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const maxOrder = await Quiz.findOne().sort({ orderIndex: -1 }).select('orderIndex').lean();
    const orderIndex = (maxOrder?.orderIndex ?? -1) + 1;

    const quiz = await Quiz.create({
      name,
      slug,
      homeOptionText: homeOptionText || null,
      description: description || null,
      outputUrl: outputUrl || null,
      isActive: isActive ?? true,
      orderIndex,
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/quizzes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
