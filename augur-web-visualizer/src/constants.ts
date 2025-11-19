export const INITIAL_PYTHON_CODE = `def fibonacci(n):
    """Calculates the nth Fibonacci number."""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b

result = fibonacci(5)
print(f"The 5th Fibonacci number is: {result}")
`;
