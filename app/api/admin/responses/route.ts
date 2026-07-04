import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { Quiz } from '@/app/lib/models/Quiz';
import { Profile } from '@/app/lib/models/Profile';

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') || 'all';
    const search = url.searchParams.get('search') || '';
    const quizId = url.searchParams.get('quizId') || '';

    const query: Record<string, unknown> = { isCompleted: true };

    if (filter === 'logged_in') {
      query.isAnonymous = false;
    } else if (filter === 'anonymous') {
      query.isAnonymous = true;
    }

    if (quizId) {
      query.quizId = quizId;
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      // Find matching profiles first
      const matchingProfiles = await Profile.find({
        $or: [{ email: searchRegex }, { name: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }],
      }).select('_id');
      const profileIds = matchingProfiles.map((p) => p._id);

      query.$or = [
        { email: searchRegex },
        { profileId: { $in: profileIds } },
        { sessionToken: searchRegex },
      ];
    }

    const attempts = await QuizAttempt.find(query)
      .sort({ completedAt: -1, startedAt: -1 })
      .limit(100)
      .populate({
        path: 'profileId',
        model: Profile,
      })
      .populate({
        path: 'quizId',
        model: Quiz,
        select: 'name slug',
      })
      .lean();

    return NextResponse.json(attempts);
  } catch (error) {
    console.error('GET /api/admin/responses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
