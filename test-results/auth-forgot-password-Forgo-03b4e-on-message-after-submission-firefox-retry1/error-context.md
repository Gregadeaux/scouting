# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Reset Your Password" [level=1] [ref=e5]
      - paragraph [ref=e6]: Enter your email address and we'll send you instructions to reset your password.
    - generic [ref=e7]: For security purposes, you can only request this after 43 seconds.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email Address
        - textbox "Email Address" [ref=e11]:
          - /placeholder: your.email@example.com
          - text: gregadeaux@gmail.com
      - button "Send Reset Instructions" [ref=e12] [cursor=pointer]
      - button "Back to Login" [ref=e13] [cursor=pointer]
  - generic [ref=e18] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e19]:
      - img [ref=e20]
    - generic [ref=e24]:
      - button "Open issues overlay" [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: "0"
          - generic [ref=e28]: "1"
        - generic [ref=e29]: Issue
      - button "Collapse issues badge" [ref=e30]:
        - img [ref=e31]
  - alert [ref=e33]
```