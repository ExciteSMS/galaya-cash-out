# Architecture rules

- Preserve internal-state navigation on Index for merchant screens; product selection returns its total and items through callbacks to retain the existing payment flow.
- Keep product matching and stock-limited cart updates in pure selection helpers so search and quantity behavior can be tested without payment requests.