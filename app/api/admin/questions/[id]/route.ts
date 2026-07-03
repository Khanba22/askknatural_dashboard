import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';
import { QuizAnswer } from '@/app/lib/models/QuizAnswer';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['text', 'type', 'enforced'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    // If changing type to 'text', clear existing options
    if (updates.type === 'text') {
      updates.options = [];
    }

    const question = await Question.findByIdAndUpdate(id, updates, { new: true });
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('PATCH question error:', error);
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

    // Check if there are existing answers referencing this question
    const answerCount = await QuizAnswer.countDocuments({ questionId: id });
    if (answerCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete question with existing answers. Archive it instead.' },
        { status: 409 }
      );
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE question error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
