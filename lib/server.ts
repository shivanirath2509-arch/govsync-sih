export function database() {
  throw new Error('Database access not available in static deployment');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function owner(request: Request): string {
  const user = request.headers.get('oai-authenticated-user-id') || 'anonymous';
  return user;
}

export async function application(id: string, user: string) {
  throw new Error('Database access not available in static deployment');
}