# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e4]
      - generic [ref=e11]: You are offline. Submissions will be queued and synced automatically when reconnected.
    - generic [ref=e14]:
      - heading "Match Scouting" [level=1] [ref=e15]
      - paragraph [ref=e16]: Record robot performance during matches for analysis and strategy
      - generic [ref=e17]:
        - img [ref=e18]
        - generic [ref=e20]: You are offline. Submissions will be saved and synced automatically when reconnected.
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]: Select Event
          - paragraph [ref=e25]: "Failed to load events: Load failed"
        - generic [ref=e26]:
          - generic [ref=e27]: Select Match
          - combobox [disabled] [ref=e28]:
            - option "Select an event first" [selected]
          - paragraph [ref=e29]: Choose an event above to see available matches
        - generic [ref=e30]:
          - generic [ref=e31]: Select Team to Scout
          - combobox [disabled] [ref=e32]:
            - option "Select a match first" [selected]
          - paragraph [ref=e33]: Choose a match above to see teams in that match
      - paragraph [ref=e35]: Select an event, match, and team to begin match scouting
  - button "Open Next.js Dev Tools" [ref=e41] [cursor=pointer]:
    - img [ref=e42]
  - alert [ref=e47]
```