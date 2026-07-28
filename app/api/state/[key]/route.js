import { NextResponse } from 'next/server';
import { getState, setState } from '../../../../lib/store';

export async function GET(request, { params }) {
  const { key } = await params;
  const value = await getState(key);
  return NextResponse.json({ value });
}

export async function POST(request, { params }) {
  const { key } = await params;
  const body = await request.json();
  await setState(key, body.value);
  return NextResponse.json({ ok: true });
}
