import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';

export async function GET() {
  try {
    await connectDB();

    const [
      totalAttempts,
      totalCompleted,
      activeQuizzes,
      allAttempts,
      anonymousAttempts,
      loggedInAttempts,
      anonymousCompleted,
      loggedInCompleted,
    ] = await Promise.all([
      QuizAttempt.countDocuments(),
      QuizAttempt.countDocuments({ isCompleted: true }),
      Quiz.countDocuments({ isActive: true }),
      QuizAttempt.find({ isCompleted: true })
        .select('startedAt completedAt quizId')
        .lean(),
      QuizAttempt.countDocuments({ isAnonymous: true }),
      QuizAttempt.countDocuments({ isAnonymous: false }),
      QuizAttempt.countDocuments({ isAnonymous: true, isCompleted: true }),
      QuizAttempt.countDocuments({ isAnonymous: false, isCompleted: true }),
    ]);

    const completionRate = totalAttempts > 0 ? ((totalCompleted / totalAttempts) * 100).toFixed(1) : '0';

    // Average completion time (median approximation via sort + middle element)
    const completionTimes = allAttempts
      .filter((a) => a.completedAt && a.startedAt)
      .map((a) => new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime())
      .filter((t) => t > 0 && t < 3600000) // filter outliers > 1 hour
      .sort((a, b) => a - b);

    const medianTime = completionTimes.length > 0
      ? completionTimes[Math.floor(completionTimes.length / 2)]
      : 0;

    const avgTimeFormatted = medianTime > 0
      ? `${Math.floor(medianTime / 60000)}m ${Math.floor((medianTime % 60000) / 1000)}s`
      : 'N/A';

    // Most popular quiz (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const popularAgg = await QuizAttempt.aggregate([
      { $match: { startedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let mostPopularQuiz = null;
    if (popularAgg.length > 0) {
      const quiz = await Quiz.findById(popularAgg[0]._id).select('name').lean();
      mostPopularQuiz = quiz ? { name: quiz.name, attempts: popularAgg[0].count } : null;
    }

    // Attempts over time (last 30 days, daily)
    const attemptsOverTime = await QuizAttempt.aggregate([
      { $match: { startedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Drop-off leaderboard
    const dropoffAgg = await QuizAttempt.aggregate([
      {
        $group: {
          _id: '$quizId',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$isCompleted', 1, 0] },
          },
          stuckAtZero: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isCompleted', false] }, { $eq: ['$currentQuestionIndex', 0] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { total: { $gt: 0 } } },
      {
        $project: {
          total: 1,
          completed: 1,
          abandoned: { $subtract: ['$total', '$completed'] },
          stuckAtZero: 1,
          dropoffRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$total', '$completed'] }, '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { dropoffRate: -1 } },
      { $limit: 10 },
    ]);

    // Enrich drop-off with quiz names
    const dropoffWithNames = await Promise.all(
      dropoffAgg.map(async (d) => {
        const quiz = await Quiz.findById(d._id).select('name').lean();
        return { ...d, quizName: quiz?.name || 'Unknown' };
      })
    );

    return NextResponse.json({
      totalAttempts,
      totalCompleted,
      completionRate: parseFloat(completionRate),
      activeQuizzes,
      anonymousAttempts,
      loggedInAttempts,
      anonymousCompleted,
      loggedInCompleted,
      avgCompletionTime: avgTimeFormatted,
      medianCompletionTimeMs: medianTime,
      mostPopularQuiz,
      attemptsOverTime: attemptsOverTime.map((d) => ({
        label: d._id,
        value: d.count,
      })),
      dropoffLeaderboard: dropoffWithNames,
    });
  } catch (error) {
    console.error('GET global analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
