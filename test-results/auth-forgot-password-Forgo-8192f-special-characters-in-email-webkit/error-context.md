# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Reset Your Password" [level=1] [ref=e5]
      - paragraph [ref=e6]: Enter your email address and we'll send you instructions to reset your password.
    - generic [ref=e7]: Please enter a valid email address
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email Address
        - textbox "Email Address" [ref=e11]:
          - /placeholder: your.email@example.com
      - button "Send Reset Instructions" [ref=e12] [cursor=pointer]
      - button "Back to Login" [ref=e13] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e19] [cursor=pointer]:
    - img [ref=e20]
  - alert [ref=e25]
```