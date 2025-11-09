# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "FRC Scouting System" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to access your scouting dashboard
    - generic [ref=e7]:
      - heading "Sign In to FRC Scouting" [level=2] [ref=e8]
      - generic [ref=e9]: Request rate limit reached
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Email
          - textbox "Email" [ref=e13]:
            - /placeholder: your.email@example.com
            - text: gregadeaux@gmail.com
        - generic [ref=e14]:
          - generic [ref=e15]: Password
          - textbox "Password" [ref=e16]:
            - /placeholder: Enter your password
            - text: Gerg2010
        - generic [ref=e17]:
          - generic [ref=e18]:
            - checkbox "Remember me" [ref=e19]
            - generic [ref=e20]: Remember me
          - button "Forgot password?" [ref=e21] [cursor=pointer]
        - button "Sign In" [ref=e22] [cursor=pointer]
      - paragraph [ref=e24]:
        - text: Don't have an account?
        - button "Sign up" [ref=e25] [cursor=pointer]
    - paragraph [ref=e27]:
      - text: Having trouble?
      - link "Contact your team mentor" [ref=e28] [cursor=pointer]:
        - /url: mailto:support@example.com
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35]
  - alert [ref=e39]
```