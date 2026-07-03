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

    // Find the question containing this option
    const question = await Question.findOne({ 'options._id': id });
    if (!question) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    const option = question.options.find((o) => o._id.toString() === id);
    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    if (body.text !== undefined) {
      option.text = body.text;
    }

    await question.save();

    return NextResponse.json(option);
  } catch (error) {
    console.error('PATCH option error:', error);
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

    const question = await Question.findOne({ 'options._id': id });
    if (!question) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    question.options = question.options.filter((o) => o._id.toString() !== id);
    await question.save();

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE option error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
