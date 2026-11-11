import type {
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverResult,
} from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

/**
 * Lightweight typed React Hook Form resolver backed by the installed Zod package.
 * Avoids requiring an extra @hookform/resolvers runtime dependency while preserving
 * schema validation and field-level error reporting.
 */
export function zodResolver<T extends FieldValues>(
  schema: ZodTypeAny
): Resolver<T> {
  return async (values): Promise<ResolverResult<T>> => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {
        values: result.data as T,
        errors: {} as Record<string, never>,
      };
    }

    const fieldErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      if (key && !fieldErrors[key]) {
        fieldErrors[key] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return {
      values: {} as Record<string, never>,
      errors: fieldErrors as FieldErrors<T>,
    };
  };
}
