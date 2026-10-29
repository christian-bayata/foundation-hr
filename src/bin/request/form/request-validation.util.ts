import { ValidationError } from 'class-validator';

export const formatValidationErrors = (
  errors: ValidationError[],
  message = 'Request details are invalid',
): string => {
  const messages: string[] = [];

  const collect = (items: ValidationError[]) => {
    for (const item of items) {
      if (item.constraints) {
        messages.push(...Object.values(item.constraints));
      }
      if (item.children?.length) {
        collect(item.children);
      }
    }
  };

  collect(errors);

  const unique = [...new Set(messages)];
  return unique.length > 0 ? `${message}: ${unique.join(' ')}` : `${message}.`;
};
