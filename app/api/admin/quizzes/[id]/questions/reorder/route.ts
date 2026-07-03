import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: quizId } = await params;
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array of question IDs' }, { status: 400 });
    }

    const ops = order.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id, quizId },
        update: { orderIndex: index },
      },
    }));

    await Question.bulkWrite(ops);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH questions/reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
