import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/db';
import { Question } from '@/app/lib/models/Question';
import mongoose from 'mongoose';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (question.type === 'text') {
      return NextResponse.json({ error: 'Cannot add options to text questions' }, { status: 400 });
    }

    const maxOrder = question.options.length > 0
      ? Math.max(...question.options.map((o) => o.orderIndex))
      : -1;

    const newOption = {
      _id: new mongoose.Types.ObjectId(),
      text,
      orderIndex: maxOrder + 1,
      createdAt: new Date(),
    };

    question.options.push(newOption);
    await question.save();

    return NextResponse.json(newOption, { status: 201 });
  } catch (error) {
    console.error('POST option error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
