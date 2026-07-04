import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';
import { Question } from '@/app/lib/models/Question';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { Profile } from '@/app/lib/models/Profile';

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
    const { sessionToken, shopifyCustomerId, sourceUrl, profile } = body;

    if (!sessionToken) {
      return NextResponse.json({ error: 'sessionToken is required' }, { status: 400 });
    }

    const quiz = await Quiz.findOne({ _id: quizId, isActive: true });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    let profileId: any = undefined;
    let email: string | undefined = undefined;
    let isAnonymous = true;

    if (profile && profile.email) {
      email = profile.email.toLowerCase().trim();
      isAnonymous = false;
      const profileDoc = await Profile.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            shopifyCustomerId: profile.id?.toString() || shopifyCustomerId || null,
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
      profileId = profileDoc._id;
    }

    const attempt = await QuizAttempt.create({
      quizId,
      sessionToken,
      shopifyCustomerId: shopifyCustomerId || (profile?.id?.toString() || null),
      sourceUrl: sourceUrl || null,
      profileId,
      email,
      isAnonymous,
    });

    return NextResponse.json({ attemptId: attempt._id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/quiz/:quizId (create attempt) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
