// Shared Navigation and Footer Injection
(function () {
    'use strict';

    // Navigation HTML
    const navHTML = `
        <nav class="site-nav">
            <div class="nav-container">
                <a href="index.html" class="nav-logo">
                    <img src="typpi_logo_darkmode.png" alt="Typpi Logo">
                    <span>Typpi</span>
                </a>
                <button class="mobile-menu-toggle" aria-label="Toggle menu">☰</button>
                <div class="nav-links">
                    <a href="index.html" data-page="index">Practice</a>
                    <a href="race.html" data-page="race">Race Mode</a>
                    <a href="blog.html" data-page="blog">Blog</a>
                    <a href="about.html" data-page="about">About</a>
                    <a href="contact.html" data-page="contact">Contact</a>
                    <a href="faq.html" data-page="faq">FAQ</a>
                </div>
            </div>
        </nav>
    `;

    // Footer HTML
    const footerHTML = `
        <footer class="site-footer">
            <div class="footer-container">
                <div class="footer-content">
                    <div class="footer-section">
                        <h3>Typpi</h3>
                        <ul>
                            <li><a href="about.html">About Us</a></li>
                            <li><a href="contact.html">Contact</a></li>
                            <li><a href="faq.html">FAQ</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h3>Features</h3>
                        <ul>
                            <li><a href="index.html">Practice Mode</a></li>
                            <li><a href="race.html">Race Mode</a></li>
                            <li><a href="blog.html">Learning Resources</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h3>Legal</h3>
                        <ul>
                            <li><a href="privacy-policy.html">Privacy Policy</a></li>
                            <li><a href="terms-of-service.html">Terms of Service</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h3>Resources</h3>
                        <ul>
                            <li><a href="blog.html">Blog</a></li>
                            <li><a href="blog/typing-practice-benefits.html">Typing Benefits</a></li>
                            <li><a href="blog/improve-typing-speed.html">Improve Speed</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; ${new Date().getFullYear()} Typpi by Prithvee Arora. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `;

    // Function to inject navigation
    function injectNavigation() {
        // Insert nav at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navHTML);

        // Set active page
        const currentPage = document.body.getAttribute('data-page');
        if (currentPage) {
            const activeLink = document.querySelector(`.nav-links a[data-page="${currentPage}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        // Mobile menu toggle
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });

            // Close menu when clicking a link
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                });
            });
        }
    }

    // Function to inject footer
    function injectFooter() {
        // Insert footer at the end of body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectNavigation();
            injectFooter();
        });
    } else {
        injectNavigation();
        injectFooter();
    }
})();
