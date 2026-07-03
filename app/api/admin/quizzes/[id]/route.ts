import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';
import { Question } from '@/app/lib/models/Question';
import { QuizAttempt } from '@/app/lib/models/QuizAttempt';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['name', 'slug', 'homeOptionText', 'description', 'outputUrl', 'isActive', 'orderIndex'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (updates.slug) {
      const existing = await Quiz.findOne({ slug: updates.slug, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(id, updates, { new: true });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('PATCH /api/admin/quizzes/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const attemptCount = await QuizAttempt.countDocuments({ quizId: id });

    if (attemptCount > 0) {
      // Soft delete: deactivate instead of destroying historical data
      await Quiz.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json({ softDeleted: true, message: 'Quiz deactivated (has existing attempts)' });
    }

    // Hard delete: no attempts, safe to remove everything
    const questions = await Question.find({ quizId: id }).select('_id').lean();
    const questionIds = questions.map((q) => q._id);

    await QuizAnswer.deleteMany({ questionId: { $in: questionIds } });
    await Question.deleteMany({ quizId: id });
    await Quiz.findByIdAndDelete(id);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/admin/quizzes/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const quiz = await Quiz.findById(id).lean();
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questions = await Question.find({ quizId: id }).sort({ orderIndex: 1 }).lean();
    const attemptCount = await QuizAttempt.countDocuments({ quizId: id });

    return NextResponse.json({ ...quiz, questions, attemptCount });
  } catch (error) {
    console.error('GET /api/admin/quizzes/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
