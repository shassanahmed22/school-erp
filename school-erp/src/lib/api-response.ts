import { NextResponse } from "next/server";

export function success<T>(data: T, message = "Success", status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function created<T>(data: T, message = "Created successfully") {
  return success(data, message, 201);
}

export function paginated<T>(
  items: T[],
  meta: { page: number; limit: number; total: number }
) {
  return NextResponse.json({
    success: true,
    message: "Success",
    data: items,
    pagination: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  });
}

export function failure(message = "Something went wrong", status = 400, errors?: unknown) {
  return NextResponse.json({ success: false, message, errors: errors ?? null }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return failure(message, 401);
}

export function forbidden(message = "Forbidden - insufficient permissions") {
  return failure(message, 403);
}

export function notFound(message = "Resource not found") {
  return failure(message, 404);
}

export function serverError(message = "Internal server error") {
  return failure(message, 500);
}
