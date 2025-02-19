import os
import pyperclip

def collect_files_content(directory):
    output = []
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules directory
        if 'node_modules' in root.split(os.sep):
            continue
        
        for file in files:
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                output.append(f"#### FILE: {file}\n\n{content}\n")
            except Exception as e:
                output.append(f"#### FILE: {file}\n\n[Could not read file: {e}]\n")
    
    return '\n'.join(output)

def main():
    directory = os.getcwd()
    files_content = collect_files_content(directory)
    pyperclip.copy(files_content)
    print("File names and contents copied to clipboard.")

if __name__ == "__main__":
    main()
