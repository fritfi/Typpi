
import os

file_path = r'c:\Users\prith\Downloads\Typi\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Target lines based on view_file (1-based 144-192)
start_idx = 143
end_idx = 192 # Slice upper bound (exclusive)

# Verify content to be safe
if '<section id="info-content"' not in lines[start_idx]:
    print(f"Error: Start line mismatch. Found: {lines[start_idx]}")
    exit(1)

if '</section>' not in lines[end_idx-1]:
    print(f"Error: End line mismatch. Found: {lines[end_idx-1]}")
    exit(1)

# Extract content
section_content = lines[start_idx:end_idx]

# Remove content
# We create a new list to avoid index shifting issues during removal
new_lines = lines[:start_idx] + lines[end_idx:]

# Find </main> in the new list
main_end_index = -1
for i, line in enumerate(new_lines):
    if '</main>' in line:
        main_end_index = i
        break

if main_end_index == -1:
    print("Error: </main> not found")
    exit(1)

# Insert content after </main>
# We insert a newline for spacing, then the section
insert_pos = main_end_index + 1
new_lines.insert(insert_pos, '\n')
insert_pos += 1

for line in section_content:
    new_lines.insert(insert_pos, line)
    insert_pos += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
