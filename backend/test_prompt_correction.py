from fastapi.testclient import TestClient
from main import app
from prompt_corrector import correct_prompt

print("--- Running Prompt Corrector & FastAPI Integration Tests ---")

# 1. Direct unit test of typo correction
prompt_raw = 'a boy swimmin in te pool'
corrected, changed = correct_prompt(prompt_raw)
print(f'1. Target prompt: "{prompt_raw}" -> "{corrected}" (changed={changed})')
assert corrected == 'a boy swimming in the pool', f"Expected 'a boy swimming in the pool', got '{corrected}'"
assert changed is True
print("Target prompt verified: 'a boy swimmin in te pool' -> 'a boy swimming in the pool'")

# 2. More edge cases
cases = [
    ('A bueatiful gerl swimmin in te ocen!', 'A beautiful girl swimming in the ocean!'),
    ('cyberpuk carr racin on te stret', 'cyberpunk car racing on the street'),
    ('dogg playin in te gardn', 'dog playing in the garden'),
]

for raw, expected in cases:
    res, ch = correct_prompt(raw)
    print(f'Check: "{raw}" -> "{res}"')
    assert res == expected, f'Expected "{expected}", got "{res}"'

print("\nAll prompt correction tests PASSED 100% successfully!")
