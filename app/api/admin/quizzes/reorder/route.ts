import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Quiz } from '@/app/lib/models/Quiz';

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array of quiz IDs' }, { status: 400 });
    }

    const ops = order.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id },
        update: { orderIndex: index },
      },
    }));

    await Quiz.bulkWrite(ops);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/admin/quizzes/reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
