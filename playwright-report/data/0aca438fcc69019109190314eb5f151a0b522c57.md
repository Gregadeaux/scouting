# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "FRC Scouting System" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to access your scouting dashboard
    - generic [ref=e7]:
      - heading "Sign In to FRC Scouting" [level=2] [ref=e8]
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Email
          - textbox "Email" [ref=e12]:
            - /placeholder: your.email@example.com
        - generic [ref=e13]:
          - generic [ref=e14]: Password
          - textbox "Password" [ref=e15]:
            - /placeholder: Enter your password
        - generic [ref=e16]:
          - generic [ref=e17]:
            - checkbox "Remember me" [ref=e18]
            - generic [ref=e19]: Remember me
          - button "Forgot password?" [ref=e20] [cursor=pointer]
        - button "Sign In" [ref=e21] [cursor=pointer]
      - paragraph [ref=e23]:
        - text: Don't have an account?
        - button "Sign up" [ref=e24] [cursor=pointer]
    - paragraph [ref=e26]:
      - text: Having trouble?
      - link "Contact your team mentor" [ref=e27] [cursor=pointer]:
        - /url: mailto:support@example.com
  - button "Open Next.js Dev Tools" [ref=e33] [cursor=pointer]:
    - img [ref=e34]
  - alert [ref=e37]
```