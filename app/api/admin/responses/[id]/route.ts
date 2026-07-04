import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { Quiz } from '@/app/lib/models/Quiz';
import { Question } from '@/app/lib/models/Question';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';
import { Profile } from '@/app/lib/models/Profile';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const attempt = await QuizAttempt.findById(id)
      .populate({ path: 'profileId', model: Profile })
      .populate({ path: 'quizId', model: Quiz })
      .lean();

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Find all related completed attempts for this profile or session
    const relatedQuery: Record<string, unknown> = { isCompleted: true };
    if (attempt.profileId) {
      relatedQuery.profileId = attempt.profileId;
    } else if (attempt.email) {
      relatedQuery.email = attempt.email;
    } else {
      relatedQuery.sessionToken = attempt.sessionToken;
    }

    const allAttempts = await QuizAttempt.find(relatedQuery)
      .sort({ completedAt: -1 })
      .populate({ path: 'quizId', model: Quiz, select: 'name slug' })
      .lean();

    // Enrich each attempt with full Q&A
    const enrichedAttempts = await Promise.all(
      allAttempts.map(async (att) => {
        const [questions, answers] = await Promise.all([
          Question.find({ quizId: att.quizId }).sort({ orderIndex: 1 }).lean(),
          QuizAnswer.find({ attemptId: att._id }).lean(),
        ]);

        const answerMap = new Map(answers.map((a) => [a.questionId.toString(), a]));
        const qaList = questions.map((q) => {
          const ans = answerMap.get(q._id.toString());
          let displayAnswer = 'No answer';
          if (ans) {
            if (q.type === 'text') {
              displayAnswer = ans.answerText || 'Empty text';
            } else if (ans.optionIds && ans.optionIds.length > 0) {
              const selectedOpts = q.options.filter((o) =>
                ans.optionIds.some((id) => id.toString() === o._id.toString())
              );
              displayAnswer = selectedOpts.map((o) => o.text).join(', ');
            }
          }
          return {
            questionId: q._id,
            questionText: q.text,
            questionType: q.type,
            answerText: displayAnswer,
          };
        });

        return {
          ...att,
          qaList,
        };
      })
    );

    return NextResponse.json({
      attempt,
      profile: attempt.profileId || null,
      allAttempts: enrichedAttempts,
    });
  } catch (error) {
    console.error('GET /api/admin/responses/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
