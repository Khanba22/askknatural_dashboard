import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: quizId } = await params;

    const questions = await Question.find({ quizId }).sort({ orderIndex: 1 }).lean();
    return NextResponse.json(questions);
  } catch (error) {
    console.error('GET questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: quizId } = await params;
    const body = await request.json();
    const { text, type, enforced } = body;

    if (!text || !type) {
      return NextResponse.json({ error: 'text and type are required' }, { status: 400 });
    }

    if (!['text', 'single_option', 'multi_option'].includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const maxOrder = await Question.findOne({ quizId }).sort({ orderIndex: -1 }).select('orderIndex').lean();
    const orderIndex = (maxOrder?.orderIndex ?? -1) + 1;

    const question = await Question.create({
      quizId,
      text,
      type,
      enforced: enforced ?? false,
      orderIndex,
      options: [],
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('POST question error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
