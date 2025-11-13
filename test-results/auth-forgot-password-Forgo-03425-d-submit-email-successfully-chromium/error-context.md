# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Reset Your Password" [level=1] [ref=e5]
      - paragraph [ref=e6]: Enter your email address and we'll send you instructions to reset your password.
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email Address
        - textbox "Email Address" [ref=e10]:
          - /placeholder: your.email@example.com
          - text: gregadeaux@gmail.com
      - button "Sending..." [disabled] [ref=e11]
      - button "Back to Login" [ref=e12] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e18] [cursor=pointer]:
    - img [ref=e19]
  - alert [ref=e22]
```