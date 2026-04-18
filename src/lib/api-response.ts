import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

export function apiSuccess<T>(data: T, message = 'ok', status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      code: 0,
      message,
      data,
    },
    { status }
  );
}

export function apiError(message: string, status = 400, code = status) {
  return NextResponse.json<ApiResponse<null>>(
    {
      code,
      message,
      data: null,
    },
    { status }
  );
}
