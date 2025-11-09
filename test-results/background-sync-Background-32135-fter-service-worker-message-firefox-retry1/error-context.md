# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e4]
      - generic [ref=e12]: You are offline. Submissions will be queued and synced automatically when reconnected.
    - generic [ref=e15]:
      - heading "Match Scouting" [level=1] [ref=e16]
      - paragraph [ref=e17]: Record robot performance during matches for analysis and strategy
      - generic [ref=e18]:
        - img [ref=e19]
        - generic [ref=e21]: You are offline. Submissions will be saved and synced automatically when reconnected.
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: Select Event
          - paragraph [ref=e26]: "Failed to load events: NetworkError when attempting to fetch resource."
        - generic [ref=e27]:
          - generic [ref=e28]: Select Match
          - combobox [disabled] [ref=e29]:
            - option "Select an event first" [selected]
          - paragraph [ref=e30]: Choose an event above to see available matches
        - generic [ref=e31]:
          - generic [ref=e32]: Select Team to Scout
          - combobox [disabled] [ref=e33]:
            - option "Select a match first" [selected]
          - paragraph [ref=e34]: Choose a match above to see teams in that match
      - paragraph [ref=e36]: Select an event, match, and team to begin match scouting
  - button "Open Next.js Dev Tools" [ref=e42] [cursor=pointer]:
    - img [ref=e43]
  - alert [ref=e47]
```