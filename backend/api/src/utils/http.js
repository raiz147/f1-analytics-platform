export function asyncHandler(handler) {
  return function wrappedHandler(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function parseIntegerParam(value, name) {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    const error = new Error(`${name} must be an integer`);
    error.statusCode = 400;
    throw error;
  }
  return parsedValue;
}
