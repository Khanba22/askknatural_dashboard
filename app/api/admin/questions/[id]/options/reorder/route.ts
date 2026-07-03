import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array of option IDs' }, { status: 400 });
    }

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Reorder options based on the provided order
    for (const option of question.options) {
      const newIndex = order.indexOf(option._id.toString());
      if (newIndex !== -1) {
        option.orderIndex = newIndex;
      }
    }

    question.options.sort((a, b) => a.orderIndex - b.orderIndex);
    await question.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH options/reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
