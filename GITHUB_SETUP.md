# How to Add Typpi to GitHub

Since **Git is not installed** on your current system, the easiest way to get your code onto GitHub is using their website.

## Option 1: Web Upload (Easiest)

1.  **Create a Repository**:
    - Go to [GitHub.com](https://github.com) and sign in.
    - Click the **+** icon in the top right and select **New repository**.
    - Name it `typpi` and click **Create repository**.

2.  **Upload Files**:
    - On the new repository page, look for the link that says **"uploading an existing file"**.
    - Click it.
    - Drag and drop all the files from your `c:/Users/prith/Downloads/Typi` folder into the browser window.
        - `index.html`
        - `style.css`
        - `script.js`
        - `DEPLOY.md`
        - `run.bat` / `run.sh`
    - Commit changes:
        - In the "Commit changes" box at the bottom, type "Initial commit".
        - Click **Commit changes**.

## Option 2: Install Git (Recommended for future)

If you want to use the command line in the future:

1.  **Download Git**: [git-scm.com/downloads](https://git-scm.com/downloads)
2.  **Install**: Run the installer and accept defaults.
3.  **Open Terminal**: Open "Git Bash" or your terminal.
4.  **Run Commands**:
    ```bash
    cd c:/Users/prith/Downloads/Typi
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/typpi.git
    git push -u origin main
    ```
