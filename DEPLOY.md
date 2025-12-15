# Deployment Instructions for Typpi

Typpi is a static web application, meaning it runs entirely in the browser and requires no backend server logic (Node.js, PHP, Python, etc.).

## Hosting on a Generic Server (XYZ Server)

1.  **Prepare Files**:
    Ensure you have the following files ready:
    - `index.html`
    - `style.css`
    - `script.js`
    - (Optional) `favicon.ico` or images if you added any.

2.  **Upload**:
    - Connect to your server via FTP, SFTP, or your hosting control panel.
    - Navigate to the public web directory (often named `public_html`, `www`, or `htdocs`).
    - Upload the files listed above into this directory.

3.  **Verify**:
    - Open your browser and go to `http://your-xyz-domain.com`.
    - You should see Typpi running immediately.

## Troubleshooting
- **404 Error**: Ensure `index.html` is named exactly that (all lowercase).
- **Styles Missing**: Ensure `style.css` is in the same folder as `index.html`.
- **Not Saving**: Typpi uses `localStorage`. If you clear your browser cache, your notes will be lost. This is normal for a client-side app.
