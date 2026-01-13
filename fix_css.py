
import os

file_path = r'c:\Users\prith\Downloads\Typi\style.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 0-indexed in python
# Line 30 is index 29
# Body: 30-38 -> index 29-37
# App Container: 40-48 -> index 39-47
# Main: 264-273 -> index 263-272
# Garbage: 602+ -> index 601+

# New Body
new_body = [
    "body {\n",
    "    background-color: var(--bg-color);\n",
    "    color: var(--text-primary);\n",
    "    font-family: var(--font-sans);\n",
    "    min-height: 100vh;\n",
    "    display: flex;\n",
    "    flex-direction: column;\n",
    "    align-items: center;\n",
    "    overflow-x: hidden;\n",
    "    padding: 2rem 0;\n",
    "}\n"
]

# New App Container
new_container = [
    ".app-container {\n",
    "    width: 100%;\n",
    "    max-width: 900px;\n",
    "    min-height: 90vh;\n",
    "    display: flex;\n",
    "    flex-direction: column;\n",
    "    padding: 2rem;\n",
    "    position: relative;\n",
    "}\n"
]

# New Main
new_main = [
    "main {\n",
    "    flex: 0 0 70vh;\n",
    "    background-color: var(--card-bg);\n",
    "    border-radius: 16px;\n",
    "    padding: 2rem;\n",
    "    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);\n",
    "    display: flex;\n",
    "    flex-direction: column;\n",
    "    overflow: hidden;\n",
    "    margin-bottom: 4rem;\n",
    "}\n"
]

# New Info CSS
new_info_css = """
/* Info Content Sections */
.info-content {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    color: var(--text-secondary);
}

.info-section {
    margin-bottom: 3rem;
}

.info-section h2 {
    color: var(--text-primary);
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
}

.info-section p {
    line-height: 1.6;
    margin-bottom: 1rem;
}

.steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.step-card {
    background: rgba(255, 255, 255, 0.03);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
}

.step-number {
    width: 32px;
    height: 32px;
    background: var(--accent-primary);
    color: #000;
    font-weight: bold;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem auto;
}

.step-card h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
}

.step-card p {
    font-size: 0.9rem;
    margin-bottom: 0;
}

.features-list {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.features-list li {
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: 8px;
    border-left: 3px solid var(--accent-secondary);
}

.features-list strong {
    color: var(--text-primary);
}
"""

# Apply changes
# Replace Body (29-37 inclusive)
lines[29:38] = new_body

# Replace App Container (39-47 inclusive)
# Note: indices shift after previous replacement if length changes.
# Original length of body block was 9 lines. New is 11 lines. Diff +2.
# Original App Container start was 39. New start is 41.
# But easier to just reconstruct the list.

final_lines = lines[:29] + new_body + ["\n"] + new_container + lines[48:263] + new_main + lines[273:601] + ["}\n"] + [new_info_css]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
