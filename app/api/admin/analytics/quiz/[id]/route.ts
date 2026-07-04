import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';

// Simple stopwords list for word cloud generation
const STOPWORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're',
  've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven',
  'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
  'won', 'wouldn', 'also', 'really', 'like', 'would', 'much', 'get', 'got',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: quizId } = await params;
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Date range filter
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const attemptFilter: Record<string, unknown> = { quizId };
    if (Object.keys(dateFilter).length > 0) {
      attemptFilter.startedAt = dateFilter;
    }

    // KPIs
    const [
      totalAttempts,
      completedAttempts,
      completedAttemptsData,
      anonymousAttempts,
      loggedInAttempts,
      anonymousCompleted,
      loggedInCompleted,
    ] = await Promise.all([
      QuizAttempt.countDocuments(attemptFilter),
      QuizAttempt.countDocuments({ ...attemptFilter, isCompleted: true }),
      QuizAttempt.find({ ...attemptFilter, isCompleted: true })
        .select('startedAt completedAt')
        .lean(),
      QuizAttempt.countDocuments({ ...attemptFilter, isAnonymous: true }),
      QuizAttempt.countDocuments({ ...attemptFilter, isAnonymous: false }),
      QuizAttempt.countDocuments({ ...attemptFilter, isAnonymous: true, isCompleted: true }),
      QuizAttempt.countDocuments({ ...attemptFilter, isAnonymous: false, isCompleted: true }),
    ]);

    const completionRate = totalAttempts > 0 ? ((completedAttempts / totalAttempts) * 100).toFixed(1) : '0';

    // Completion times
    const times = completedAttemptsData
      .filter((a) => a.completedAt && a.startedAt)
      .map((a) => new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime())
      .filter((t) => t > 0 && t < 3600000)
      .sort((a, b) => a - b);

    const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    const formatTime = (ms: number) =>
      ms > 0 ? `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s` : 'N/A';

    // Funnel: attempts reaching each question index
    const questions = await Question.find({ quizId }).sort({ orderIndex: 1 }).lean();

    const funnelSteps = await Promise.all(
      questions.map(async (q, i) => {
        const reaching = await QuizAttempt.countDocuments({
          ...attemptFilter,
          $or: [
            { currentQuestionIndex: { $gte: i } },
            { isCompleted: true },
          ],
        });
        return {
          label: `Q${i + 1}: ${q.text.length > 30 ? q.text.slice(0, 28) + '...' : q.text}`,
          value: reaching,
        };
      })
    );

    // Per-question analytics
    const perQuestion = await Promise.all(
      questions.map(async (q) => {
        // Get attempt IDs in range
        const attemptIds = await QuizAttempt.find(attemptFilter)
          .select('_id')
          .lean()
          .then((docs) => docs.map((d) => d._id));

        const answers = await QuizAnswer.find({
          attemptId: { $in: attemptIds },
          questionId: q._id,
        }).lean();

        if (q.type === 'text') {
          // Word cloud from text answers
          const wordCounts = new Map<string, number>();
          const rawSample: string[] = [];

          for (const answer of answers) {
            if (answer.answerText) {
              if (rawSample.length < 10) rawSample.push(answer.answerText);
              const words = tokenize(answer.answerText);
              for (const word of words) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
              }
            }
          }

          const wordFrequencies = Array.from(wordCounts.entries())
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50);

          return {
            questionId: q._id,
            text: q.text,
            type: q.type,
            totalAnswers: answers.length,
            wordFrequencies,
            rawSample,
          };
        }

        // Option-based questions
        const optionCounts = new Map<string, number>();
        for (const answer of answers) {
          for (const optId of answer.optionIds) {
            const key = optId.toString();
            optionCounts.set(key, (optionCounts.get(key) || 0) + 1);
          }
        }

        const options = q.options
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((opt) => {
            const count = optionCounts.get(opt._id.toString()) || 0;
            return {
              optionId: opt._id,
              text: opt.text,
              count,
              pct: answers.length > 0 ? parseFloat(((count / answers.length) * 100).toFixed(1)) : 0,
            };
          });

        return {
          questionId: q._id,
          text: q.text,
          type: q.type,
          totalAnswers: answers.length,
          options,
        };
      })
    );

    return NextResponse.json({
      totalAttempts,
      completedAttempts,
      completionRate: parseFloat(completionRate),
      anonymousAttempts,
      loggedInAttempts,
      anonymousCompleted,
      loggedInCompleted,
      avgCompletionTime: formatTime(avgTime),
      medianCompletionTime: formatTime(medianTime),
      funnelSteps,
      perQuestion,
    });
  } catch (error) {
    console.error('GET per-quiz analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
